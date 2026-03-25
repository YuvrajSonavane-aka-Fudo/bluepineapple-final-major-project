"""
Leave Dashboard — Django Views  (optimised)

Changes vs uploaded version:
  ─ Endpoints 3 & 4: project_ids / leave_types / leave_statuses removed —
    frontend now filters locally; only date range triggers a real API call.
  ─ Null-cell optimisation in endpoints 3 & 4: cells dict only contains
    dates that actually have activity (null cells skipped entirely).
  ─ N+1 fix in day_details: Project names fetched in one query outside the
    per-employee loop.
  ─ O(1) date lookup in endpoint 4: leaves pre-expanded into date-keyed dicts.
  ─ Everything else (endpoints 1, 2, 5, 6, 7) left exactly as uploaded.
"""

import uuid
from datetime import date, timedelta

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import LeaveApplication, Project, ProjectAssignment, PublicHolidays, Session, User
from .utils import (
    get_user_from_request,
    get_accessible_project_ids,
    build_date_strip,
    parse_date,
    calculate_risk_level,
    build_cell_payload,
    apply_leave_filters,
)


#  ENDPOINT 1 — POST /api/v1/connect 
@api_view(["POST"])
def connect(request):
    email = request.data.get("email", "").strip().lower()
    if not email:
        return Response({"error": "email is required."}, status=400)
    try:
        user = User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        return Response({"error": "Invalid credentials."}, status=401)
    session_id = str(uuid.uuid4())
    Session.objects.create(user=user, session_id=session_id)
    return Response({"session_id": session_id, "user_id": user.id, "user_role": user.role})


# ENDPOINT 2 — GET /api/v1/projects 
@api_view(["GET"])
def projects(request):
    user = get_user_from_request(request)
    if not user:
        return Response({"error": "Unauthorized."}, status=401)
    accessible_ids = get_accessible_project_ids(user)
    qs = Project.objects.filter(id__in=accessible_ids, is_active=True).order_by("project_name")
    return Response({"projects": [{"project_id": p.id, "project_name": p.project_name} for p in qs]})


# ENDPOINT 3 — POST /api/v1/dashboard/employees 
@api_view(["POST"])
def dashboard_employees(request):
    """
    Employee Leave View.

    CHANGED: project_ids / leave_types / leave_statuses filters removed.
    The frontend now holds raw data and filters locally — zero extra API calls
    when the user toggles a project/type/status filter.

    Null-cell optimisation: cells dict only contains dates with leave activity.
    The frontend treats a missing date as "no leave" (no null entries sent).
    """
    user = get_user_from_request(request)
    if not user:
        return Response({"error": "Unauthorized."}, status=401)

    try:
        start_date = parse_date(request, "start_date")
        end_date   = parse_date(request, "end_date")
    except ValueError as e:
        return Response({"error": str(e)}, status=400)

    if end_date < start_date:
        return Response({"error": "end_date must be on or after start_date."}, status=400)

    accessible_ids = get_accessible_project_ids(user)

    today = date.today()
    assigned_user_ids = ProjectAssignment.objects.filter(
        project_id__in=accessible_ids,
        is_active=True,
        assigned_from__lte=today,
        assigned_till__isnull=True,
    ).values_list("user_id", flat=True)

    employees = User.objects.filter(id__in=assigned_user_ids, is_active=True).order_by("full_name")

    leave_qs = LeaveApplication.objects.filter(
        user__in=employees,
        project_id__in=accessible_ids,
        start_date__lte=end_date,
        end_date__gte=start_date,
    )

    leaves_by_user = {}
    for leave in leave_qs:
        leaves_by_user.setdefault(leave.user_id, []).append(leave)

    employee_data = []
    for emp in employees:
        emp_leaves = leaves_by_user.get(emp.id, [])
        cells = {}
        current = start_date
        while current <= end_date:
            leave_today = next(
                (l for l in emp_leaves if l.start_date <= current <= l.end_date), None
            )
            cell = build_cell_payload(leave_today)
            if leave_today and cell:
                cell["project_id"] = leave_today.project_id
            # Null-cell optimisation — only emit dates with actual leave
            if cell is not None:
                cells[str(current)] = cell
            current += timedelta(days=1)

        employee_data.append({
            "user_id":   emp.id,
            "full_name": emp.full_name,
            "role":      emp.role,
            "cells":     cells,
        })

    return Response({
        "date_strip": build_date_strip(start_date, end_date),
        "employees":  employee_data,
    })


# ENDPOINT 4 — POST /api/v1/dashboard/projects 
@api_view(["POST"])
def dashboard_projects(request):
    """
    Projects Dashboard.

    CHANGED: project_ids / leave_statuses filters removed (frontend filters locally).
    O(1) date lookup: leaves pre-expanded into (user_id, date) dicts once.
    Null-cell optimisation: cells dict only contains dates with activity.
    """
    user = get_user_from_request(request)
    if not user:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        start_date = parse_date(request, "start_date")
        end_date   = parse_date(request, "end_date")
    except ValueError as e:
        return Response({"error": str(e)}, status=400)

    if end_date < start_date:
        return Response({"error": "end date cannot be before start date"}, status=400)

    accessible_ids = get_accessible_project_ids(user)

    projects_qs = Project.objects.filter(
        id__in=accessible_ids, is_active=True
    ).order_by("project_name")

    today = date.today()
    assignments = ProjectAssignment.objects.filter(
        project_id__in=accessible_ids,
        is_active=True,
        assigned_from__lte=today,
        assigned_till__isnull=True,
    )

    project_members = {}
    all_member_ids  = set()
    for a in assignments:
        project_members.setdefault(a.project_id, set()).add(a.user_id)
        all_member_ids.add(a.user_id)

    scoped_leave_qs = LeaveApplication.objects.filter(
        user_id__in=all_member_ids,
        project_id__in=accessible_ids,
        start_date__lte=end_date,
        end_date__gte=start_date,
    )

    spillover_leave_qs = LeaveApplication.objects.filter(
        user_id__in=all_member_ids,
        start_date__lte=end_date,
        end_date__gte=start_date,
    ).exclude(project_id__in=accessible_ids)

    # ── O(1) pre-expansion: (uid, project_id, date) → leave
    direct_on_date = {}
    for leave in scoped_leave_qs:
        d = leave.start_date
        while d <= leave.end_date:
            key = (leave.user_id, leave.project_id, d)
            if key not in direct_on_date:
                direct_on_date[key] = leave
            d += timedelta(days=1)

    # (uid, date) → leave  — spillover from outside accessible projects
    spillover_on_date = {}
    for leave in spillover_leave_qs:
        d = leave.start_date
        while d <= leave.end_date:
            key = (leave.user_id, d)
            if key not in spillover_on_date:
                spillover_on_date[key] = leave
            d += timedelta(days=1)

    # (uid, date) → leave  — any scoped direct leave (any project)
    any_direct_on_date = {}
    for (uid, pid, d), leave in direct_on_date.items():
        if (uid, d) not in any_direct_on_date:
            any_direct_on_date[(uid, d)] = leave

    def get_effective_leave(uid, project_id, current_date):
        direct = direct_on_date.get((uid, project_id, current_date))
        if direct:
            return direct
        any_direct = any_direct_on_date.get((uid, current_date))
        if any_direct and any_direct.project_id != project_id:
            return any_direct
        return spillover_on_date.get((uid, current_date))

    project_data = []
    for project in projects_qs:
        member_ids     = project_members.get(project.id, set())
        assigned_count = len(member_ids)
        cells          = {}

        current = start_date
        while current <= end_date:
            on_leave_count = 0
            wfh_count      = 0
            partial_count  = 0

            for uid in member_ids:
                leave = get_effective_leave(uid, project.id, current)
                if leave is None:
                    continue
                if leave.leave_type == "WFH" and leave.is_half_day:
                    partial_count += 1
                elif leave.leave_type == "WFH":
                    wfh_count += 1
                elif leave.is_half_day:
                    partial_count += 1
                else:
                    on_leave_count += 1

            # Null-cell optimisation — only emit dates with activity
            if on_leave_count > 0 or wfh_count > 0 or partial_count > 0:
                available = assigned_count - on_leave_count - partial_count
                cells[str(current)] = {
                    "assigned_employees":  assigned_count,
                    "employees_on_leave":  on_leave_count,
                    "wfh_count":           wfh_count,
                    "partial_count":       partial_count,
                    "available_workforce": available,
                    "risk_level":          calculate_risk_level(project, assigned_count, available),
                }
            current += timedelta(days=1)

        project_data.append({
            "project_id":         project.id,
            "project_name":       project.project_name,
            "required_workforce": project.required_workforce,
            "assigned_employees": assigned_count,
            "cells":              cells,
        })

    return Response({
        "date_strip": build_date_strip(start_date, end_date),
        "projects":   project_data,
    })


# ENDPOINT 5 — POST /api/v1/dashboard/employee-cell-details 
@api_view(["POST"])
def employee_cell_details(request):
    user = get_user_from_request(request)
    if not user:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        target_date = parse_date(request, "date")
    except ValueError as e:
        return Response({"error": str(e)}, status=400)

    target_user_id = request.data.get("user_id")
    if not target_user_id:
        return Response({"error": "user ID is required"}, status=400)

    leave_statuses = request.data.get("leave_statuses", [])
    requested_pids = request.data.get("project_ids", [])

    try:
        employee = User.objects.get(id=target_user_id, is_active=True)
    except User.DoesNotExist:
        return Response({"error": "Employee not found"}, status=400)

    accessible_ids = get_accessible_project_ids(user)
    scoped_pids = [p for p in requested_pids if p in accessible_ids] if requested_pids else accessible_ids

    today = date.today()
    emp_project_ids = ProjectAssignment.objects.filter(
        user=employee, project_id__in=scoped_pids, is_active=True,
        assigned_from__lte=today, assigned_till__isnull=True,
    ).values_list("project_id", flat=True)

    emp_projects = Project.objects.filter(id__in=emp_project_ids, is_active=True).order_by("project_name")

    direct_leave_qs = LeaveApplication.objects.filter(
        user=employee, project_id__in=emp_project_ids,
        start_date__lte=target_date, end_date__gte=target_date,
    )
    if leave_statuses:
        direct_leave_qs = direct_leave_qs.filter(leave_status__in=leave_statuses)

    spillover_leave_qs = LeaveApplication.objects.filter(
        user=employee, start_date__lte=target_date, end_date__gte=target_date,
    ).exclude(project_id__in=emp_project_ids)
    if leave_statuses:
        spillover_leave_qs = spillover_leave_qs.filter(leave_status__in=leave_statuses)

    leave_by_project  = {l.project_id: l for l in direct_leave_qs}
    all_leaves_on_date = list(direct_leave_qs) + list(spillover_leave_qs)
    spillover_leave    = next(iter(all_leaves_on_date), None)

    projects_payload = []
    for project in emp_projects:
        direct    = leave_by_project.get(project.id)
        leave     = direct or spillover_leave
        spillover = leave is not None and direct is None

        if leave is None:
            entry = {"project_id": project.id, "project_name": project.project_name, "availability": "AVAILABLE", "spillover": False}
        elif leave.leave_type == "WFH" and leave.is_half_day:
            entry = {"project_id": project.id, "project_name": project.project_name, "availability": "PARTIALLY_AVAILABLE", "leave_type": "WFH", "is_half_day": True, "half_day_session": leave.half_day_session, "spillover": spillover}
        elif leave.leave_type == "WFH":
            entry = {"project_id": project.id, "project_name": project.project_name, "availability": "WFH", "leave_type": "WFH", "is_half_day": False, "spillover": spillover}
        elif leave.is_half_day:
            entry = {"project_id": project.id, "project_name": project.project_name, "availability": "PARTIALLY_AVAILABLE", "leave_type": leave.leave_type, "is_half_day": True, "half_day_session": leave.half_day_session, "spillover": spillover}
        else:
            entry = {"project_id": project.id, "project_name": project.project_name, "availability": "NOT_AVAILABLE", "leave_type": leave.leave_type, "is_half_day": False, "spillover": spillover}
        projects_payload.append(entry)

    return Response({"employee": {"user_id": employee.id, "full_name": employee.full_name}, "date": str(target_date), "projects": projects_payload})


# ENDPOINT 6 — POST /api/v1/dashboard/project-cell-details 
@api_view(["POST"])
def project_cell_details(request):
    user = get_user_from_request(request)
    if not user:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        target_date = parse_date(request, "date")
    except ValueError as e:
        return Response({"error": str(e)}, status=400)

    target_pid = request.data.get("project_id")
    if not target_pid:
        return Response({"error": "project_id is required"}, status=400)

    leave_statuses = request.data.get("leave_statuses", [])

    accessible_ids = get_accessible_project_ids(user)
    if target_pid not in accessible_ids:
        return Response({"error": "Forbidden"}, status=403)

    try:
        project = Project.objects.get(id=target_pid, is_active=True)
    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)

    today = date.today()
    member_ids = ProjectAssignment.objects.filter(
        project=project, is_active=True, assigned_from__lte=today, assigned_till__isnull=True,
    ).values_list("user_id", flat=True)

    members = User.objects.filter(id__in=member_ids, is_active=True)

    direct_leave_qs = LeaveApplication.objects.filter(
        user__in=members, project=project,
        start_date__lte=target_date, end_date__gte=target_date,
    )
    if leave_statuses:
        direct_leave_qs = direct_leave_qs.filter(leave_status__in=leave_statuses)

    spillover_leave_qs = LeaveApplication.objects.filter(
        user__in=members, start_date__lte=target_date, end_date__gte=target_date,
    ).exclude(project=project)
    if leave_statuses:
        spillover_leave_qs = spillover_leave_qs.filter(leave_status__in=leave_statuses)

    leave_by_user     = {l.user_id: l for l in direct_leave_qs}
    spillover_by_user = {}
    for l in spillover_leave_qs:
        if l.user_id not in leave_by_user and l.user_id not in spillover_by_user:
            spillover_by_user[l.user_id] = l

    employees_payload = []
    for emp in members:
        direct    = leave_by_user.get(emp.id)
        leave     = direct or spillover_by_user.get(emp.id)
        spillover = leave is not None and direct is None

        if leave is None:
            entry = {"user_id": emp.id, "full_name": emp.full_name, "role": emp.role, "availability": "AVAILABLE", "spillover": False}
        elif leave.leave_type == "WFH" and leave.is_half_day:
            entry = {"user_id": emp.id, "full_name": emp.full_name, "role": emp.role, "availability": "PARTIALLY_AVAILABLE", "leave_type": "WFH", "is_half_day": True, "half_day_session": leave.half_day_session, "spillover": spillover}
        elif leave.leave_type == "WFH":
            entry = {"user_id": emp.id, "full_name": emp.full_name, "role": emp.role, "availability": "WFH", "leave_type": "WFH", "is_half_day": False, "spillover": spillover}
        elif leave.is_half_day:
            entry = {"user_id": emp.id, "full_name": emp.full_name, "role": emp.role, "availability": "PARTIALLY_AVAILABLE", "leave_type": leave.leave_type, "is_half_day": True, "half_day_session": leave.half_day_session, "spillover": spillover}
        else:
            entry = {"user_id": emp.id, "full_name": emp.full_name, "role": emp.role, "availability": "ON_LEAVE", "leave_type": leave.leave_type, "is_half_day": False, "spillover": spillover}
        employees_payload.append(entry)

    assigned_count  = len(member_ids)
    on_leave_count  = sum(1 for e in employees_payload if e["availability"] not in ("AVAILABLE", "WFH"))
    available_count = assigned_count - on_leave_count

    return Response({
        "project": {"project_id": project.id, "project_name": project.project_name, "required_workforce": project.required_workforce, "assigned_employees": assigned_count, "on_leave_count": on_leave_count, "available_workforce": available_count, "risk_level": calculate_risk_level(project, assigned_count, available_count)},
        "date":      str(target_date),
        "employees": employees_payload,
    })


# ENDPOINT 7 — POST /api/v1/dashboard/day-details 
@api_view(["POST"])
def day_details(request):
    """
    Global impact panel for one date.
    CHANGED: N+1 fix — project names fetched once outside the per-employee loop.
    """
    user = get_user_from_request(request)
    if not user:
        return Response({"error": "Unauthorized."}, status=401)

    try:
        target_date = parse_date(request, "date")
    except ValueError as e:
        return Response({"error": str(e)}, status=400)

    leave_types    = request.data.get("leave_types", [])
    leave_statuses = request.data.get("leave_statuses", [])
    requested_pids = request.data.get("project_ids", [])

    accessible_ids = get_accessible_project_ids(user)
    scoped_pids    = [p for p in requested_pids if p in accessible_ids] if requested_pids else accessible_ids

    projects_qs = Project.objects.filter(id__in=scoped_pids, is_active=True).order_by("project_name")

    today = date.today()
    assignments = ProjectAssignment.objects.filter(
        project_id__in=scoped_pids, is_active=True,
        assigned_from__lte=today, assigned_till__isnull=True,
    )

    project_members = {}
    user_projects   = {}
    all_member_ids  = set()
    for a in assignments:
        project_members.setdefault(a.project_id, set()).add(a.user_id)
        user_projects.setdefault(a.user_id, set()).add(a.project_id)
        all_member_ids.add(a.user_id)

    direct_leave_qs = LeaveApplication.objects.filter(
        user_id__in=all_member_ids, project_id__in=scoped_pids,
        start_date__lte=target_date, end_date__gte=target_date,
    )
    direct_leave_qs = apply_leave_filters(direct_leave_qs, leave_types, leave_statuses)

    spillover_leave_qs = LeaveApplication.objects.filter(
        user_id__in=all_member_ids,
        start_date__lte=target_date, end_date__gte=target_date,
    ).exclude(project_id__in=scoped_pids)
    spillover_leave_qs = apply_leave_filters(spillover_leave_qs, leave_types, leave_statuses)

    leave_by_user_project    = {}
    any_direct_leave_by_user = {}
    for leave in direct_leave_qs.select_related("user"):
        leave_by_user_project[(leave.user_id, leave.project_id)] = leave
        any_direct_leave_by_user[leave.user_id] = leave

    spillover_by_user = {}
    for leave in spillover_leave_qs.select_related("user"):
        if leave.user_id not in any_direct_leave_by_user:
            spillover_by_user[leave.user_id] = leave

    any_leave_by_user = {**spillover_by_user, **any_direct_leave_by_user}

    def get_effective_leave_for_user(uid, project_id):
        direct = leave_by_user_project.get((uid, project_id))
        if direct:
            return direct
        direct_other = any_direct_leave_by_user.get(uid)
        if direct_other and direct_other.project_id != project_id:
            return direct_other
        return spillover_by_user.get(uid)

    projects_payload = []
    affected_pids    = set()
    for project in projects_qs:
        member_ids     = project_members.get(project.id, set())
        assigned_count = len(member_ids)
        on_leave_count = 0
        for uid in member_ids:
            leave = get_effective_leave_for_user(uid, project.id)
            if leave is not None and leave.leave_type != "WFH":
                on_leave_count += 1
        available = assigned_count - on_leave_count
        if on_leave_count > 0:
            affected_pids.add(project.id)
        projects_payload.append({
            "project_id": project.id, "project_name": project.project_name,
            "required_workforce": project.required_workforce, "assigned_employees": assigned_count,
            "employees_on_leave": on_leave_count, "available_workforce": available,
            "risk_level": calculate_risk_level(project, assigned_count, available),
        })

    # N+1 fix: fetch all project names in one query, outside the loop
    all_project_names = {
        p["id"]: p["project_name"]
        for p in Project.objects.filter(id__in=set(scoped_pids)).values("id", "project_name")
    }

    on_leave_users = User.objects.filter(id__in=any_leave_by_user.keys()).order_by("full_name")
    employees_on_leave_payload = []
    for emp in on_leave_users:
        leave     = any_leave_by_user[emp.id]
        spillover = emp.id in spillover_by_user and emp.id not in any_direct_leave_by_user

        if leave.leave_type == "WFH" and leave.is_half_day:
            availability = "PARTIALLY_AVAILABLE"
        elif leave.leave_type == "WFH":
            availability = "WFH"
        elif leave.is_half_day:
            availability = "PARTIALLY_AVAILABLE"
        else:
            availability = "ON_LEAVE"

        emp_pids_in_scope = user_projects.get(emp.id, set()) & set(scoped_pids)
        entry = {
            "user_id":      emp.id, "full_name": emp.full_name, "role": emp.role,
            "leave_type":   leave.leave_type, "is_half_day": leave.is_half_day,
            "availability": availability, "spillover": spillover,
            "projects": [
                {"project_id": pid, "project_name": all_project_names[pid]}
                for pid in emp_pids_in_scope if pid in all_project_names
            ],
        }
        if leave.is_half_day and leave.half_day_session:
            entry["half_day_session"] = leave.half_day_session
        employees_on_leave_payload.append(entry)

    holiday = PublicHolidays.objects.filter(holiday_date=target_date).first()
    date_meta = {
        "date": str(target_date), "day": target_date.strftime("%a"),
        "is_weekend": target_date.weekday() >= 5,
        "is_public_holiday": holiday is not None,
        "holiday_name": holiday.holiday_name if holiday else None,
    }
    actual_on_leave_count = sum(1 for e in employees_on_leave_payload if e["availability"] != "WFH")

    return Response({
        "date": date_meta,
        "summary": {"total_projects_affected": len(affected_pids), "total_employees_on_leave": actual_on_leave_count},
        "projects":           projects_payload,
        "employees_on_leave": employees_on_leave_payload,
    })