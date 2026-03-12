"""
Leave Dashboard — Django Views
================================
All 7 API endpoints

  Tables:
    users               → User model
    projects            → Project model
    project_assignments → ProjectAssignment model
    leave_applications  → LeaveApplication model
    public_holidays     → PublicHolidays model

  Key schema notes applied here:
    - users has NO user_role column — role IS the role ("Senior Engineer", "Account Manager")
    - projects has risk_threshold_percent + warning_threshold_percent columns (used for risk calc)
    - leave_applications has a project_id column (leave is tied to a specific project)
    - project_assignments has assigned_from + assigned_till (null till = still active)

  Auth: Every endpoint except /connect requires:
    Authorization: Bearer <session_id>
"""

import uuid
from datetime import date, timedelta

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import LeaveApplication, Project, ProjectAssignment, PublicHolidays, Session, User
# use a relative import to access helpers within the same app package
from .utils import (
    get_user_from_request,
    get_accessible_project_ids,
    build_date_strip,
    parse_date,
    calculate_risk_level,
    build_cell_payload,
    apply_leave_filters,
)



# ENDPOINT 1 — POST /api/v1/connect
@api_view(["POST"])
def connect(request):
    """
    Authenticate a user and return a session token.

    Body:   { login_type, email }
    Returns: { session_id, user_id, user_role }

    """
    email = request.data.get("email", "").strip().lower()
    if not email:
        return Response({"error": "email is required."}, status=400)

    try:
        user = User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        return Response({"error": "Invalid credentials."}, status=401)

    session_id = str(uuid.uuid4())
    Session.objects.create(user=user, session_id=session_id)

    return Response({
        "session_id": session_id,
        "user_id":    user.id,
        "user_role":  user.role,       # "Senior Engineer", "Account Manager", etc.
    })


# ENDPOINT 2 — POST /api/v1/projects
@api_view(["GET"])
def projects(request):
    """
    Return projects the user can see (for the filter dropdown).

    Returns: { projects: [ { project_id, project_name }, ... ] }
    """
    user = get_user_from_request(request)
    if not user:
        return Response({"error": "Unauthorized."}, status=401)

    accessible_ids = get_accessible_project_ids(user)
    qs = Project.objects.filter(id__in=accessible_ids, is_active=True).order_by("project_name")

    return Response({
        "projects": [
            {"project_id": p.id, "project_name": p.project_name}
            for p in qs
        ]
    })

# ENDPOINT 3 — POST /api/v1/dashboard/employees
@api_view(["POST"])
def dashboard_employees(request):
    """
    Employee Leave View — full grid of employees × dates.

    Body:
      start_date     (required)
      end_date       (required)
      project_ids    (optional)
      leave_types    (optional)
      leave_statuses (optional)

    Returns: { date_strip, employees: [ { user_id, full_name, role, cells } ] }

    IMPORTANT: Because leave_applications has a project_id column, one user can have
    multiple leave records for the same date (one per project). We consolidate them
    into one row per employee — if a user has any leave on a date, we show the first
    matching record in their cell (the most impactful one).
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

    leave_types = request.data.get("leave_types",[])  
    leave_statuses = request.data.get("leave_statuses",[])  
    requested_pids = request.data.get("project_ids",[])

    accessible_ids = get_accessible_project_ids(user)
    scoped_pids = [p for p in requested_pids if p in accessible_ids] if requested_pids else accessible_ids

    today = date.today()
    assigned_user_ids = ProjectAssignment.objects.filter(
        project_id__in = scoped_pids,
        is_active = True,
        assigned_from__lte = today ,
        assigned_till__isnull = True,
    ).values_list("user_id",flat = True)

    employees = User.objects.filter(
        id__in = assigned_user_ids , is_active = True
    ).order_by("full_name")

    leave_qs = LeaveApplication.objects.filter(
        user__in = employees,
        project_id__in = scoped_pids,
        
        start_date__lte = end_date,
        end_date__gte = start_date,
    )

    leave_qs = apply_leave_filters(leave_qs , leave_types , leave_statuses)

    leaves_by_user = {}
    for leave in leave_qs:
        leaves_by_user.setdefault(leave.user_id , []).append(leave)

    employee_data = []
    for emp in employees:
        emp_leaves = leaves_by_user.get(emp.id , [])
        cells = {}
        current = start_date
        while current <= end_date:
            leave_today = next(
                (l for l in emp_leaves if l.start_date <= current <= l.end_date),
                None,
            )
            cells[str(current)] = build_cell_payload(leave_today)
            current += timedelta(days = 1)

        employee_data.append(
            {
                "user_id" : emp.id,
                "full_name":emp.full_name,
                "role":emp.role,
                "cells":cells,
            }
        )

    return Response(
        {
            "date_strip" : build_date_strip(start_date , end_date),
            "employees" : employee_data,
        }
    )

#ENDPOINT 4 — POST /api/v1/dashboard/projects
@api_view(["POST"])
def dashboard_projects(request):
    """
    Projects Dashboard : workforce and risk per project day wise

    body :
    start_date (required)
    end_date (required)
    project_ids (optional)
    leave_statuses (optional)

    returns:
    {
        date_strip,
        projects:[
            {
                project_id , project_name , required_workforce ,
                cells:{
                    date: {
                        assigned_employees , employees_on_leave, 
                        available_workforce , risk_level
                    }
                }
            }
        ]
    }

    Risk is calculated using the project's own threshold value .
    risk_threshold_percent & warning_threshold_percent
    """
    user = get_user_from_request(request)

    if not user:
        return Response({"error" : "Unauthorized"}, status = 401)
    
    try:
        start_date = parse_date(request , "start_date")
        end_date = parse_date(request , "end_date")
    except ValueError as e:
        return Response({"error":str(e)}, status = 400)

    if end_date < start_date:
        return Response({"error": "end date cannot be before start date"}, status = 400)

    leave_statuses = request.data.get("leave_statuses",[])
    requested_pids = request.data.get("project_ids",[])

    accessible_ids = get_accessible_project_ids(user)
    scoped_pids = [p for p in requested_pids if p in accessible_ids] if requested_pids else accessible_ids

    projects_qs = Project.objects.filter(
        id__in = scoped_pids , is_active = True
    ).order_by("project_name")

    today = date.today()
    assignments = ProjectAssignment.objects.filter(
        project_id__in = scoped_pids,
        is_active = True,
        assigned_from__lte = today ,
        assigned_till__isnull = True,
    )

    project_members = {}
    all_member_ids = set()

    for a in assignments:
        project_members.setdefault(a.project_id , set()).add(a.user_id)
        all_member_ids.add(a.user_id)

    leave_qs = LeaveApplication.objects.filter(
        user_id__in = all_member_ids,
        project_id__in = scoped_pids,
        start_date__lte = end_date,
        end_date__gte = start_date,
    )

    if leave_statuses:
        leave_qs = leave_qs.filter(leave_status__in = leave_statuses)

    leaves_by_user_project = {}
    for leave in leave_qs:
        key = (leave.user_id , leave.project_id)
        leaves_by_user_project.setdefault(key , []).append(leave)

    project_data = []
    for project in projects_qs:
        member_ids = project_members.get(project.id , set())
        assigned_count = len(member_ids)
        cells = {}

        current = start_date
        while current<=end_date:
            on_leave_count = sum(
                1 for uid in member_ids
                if any(
                    l.start_date<= current <= l.end_date
                    for l in leaves_by_user_project.get((uid , project.id), []) 
                )
            )
            available = assigned_count - on_leave_count
            cells[str(current)] = {
                "assigned_employees" : assigned_count,
                "employees_on_leave" : on_leave_count,
                "available_workforce" : available,
                "risk_level" : calculate_risk_level(project ,assigned_count,available),

            }
            current += timedelta(days = 1)
        
        project_data.append(
            {
                "project_id" : project.id ,
                "project_name" : project.project_name,
                "required_workforce" : project.required_workforce,
                "cells":cells,
            })

    return Response(
            {
                "date_strip" : build_date_strip(start_date , end_date),
                "projects" : project_data,
            }
        )
        

#ENDPOINT 5 - POST /api/v1/dashboard/employee-cell-details

@api_view(["POST"])
def employee_cell_details(request):
    """
        Drill-down : which project this employee is on leave from on this date?
        Triggered when a user clicks an employee leave cell (UC - 07)

        Body :
            user_id (required)
            date (required)
            start_date (required)
            end_date (required)
            project_ids (optional)
            leave_status (optional)

        Response:
            {
                employee : {user_id , full_name},
                date : "YYYY-MM-DD",
                projects : [
                    {
                        project_id , project_name,
                        availability,
                        leave_type?,
                        is_half_day?,
                        half_day_session?
                    }
                ]
            }
    """
    user = get_user_from_request(request)
    if not user:
        return Response({"error" : "Unauthorized"},status = 401)
    
    try:
        target_date = parse_date(request , "date")
    except ValueError as e:
        return Response({"error" : str(e)},status = 400)

    target_user_id = request.data.get("user_id")
    if not target_user_id:
        return Response({"error" : "user ID is required"},status = 400)

    leave_statuses = request.data.get("leave_statuses",[])
    requested_pids = request.data.get("project_ids",[])

    try:
        employee = User.objects.get(id = target_user_id , is_active = True)
    except User.DoesNotExist:
        return Response ({"error" : "Employee not found"},status = 400)

    accessible_ids = get_accessible_project_ids(user)
    scoped_pids = [p for p in requested_pids if p in accessible_ids] if requested_pids else accessible_ids

    today = date.today()

    emp_project_ids = ProjectAssignment.objects.filter(
        user = employee,
        project_id__in = scoped_pids,
        is_active = True,
        assigned_from__lte = today ,
        assigned_till__isnull = True,
    ).values_list("project_id",flat = True)

    emp_projects = Project.objects.filter(
        id__in = emp_project_ids , is_active = True
    ).order_by("project_name")


    leave_qs = LeaveApplication.objects.filter(
        user = employee , 
        project_id__in = emp_project_ids,
        start_date__lte = target_date,
        end_date__gte = target_date,
    )

    if leave_statuses:
        leave_qs = leave_qs.filter(leave_status__in = leave_statuses)

    leave_by_project = {l.project_id : l for l in leave_qs}

    projects_payload = []
    for project in emp_projects:
        leave = leave_by_project.get(project.id)
        if leave is None or leave.leave_type == "WFH":
            entry = {
                "project_id" : project.id,
                "project_name": project.project_name,
                "availability" : "AVAILABLE",
            }

        elif leave.is_half_day:
            entry = {
                "project_id":project.id,
                "project_name":project.project_name,
                "availability" : "PARTIALLY_AVAILABLE",
                "leave_type" : leave.leave_type,
                "is_half_day" : True,
                "half_day_session" : leave.half_day_session,
            }
        else:
            entry = {
                "project_id":project.id,
                "project_name":project.project_name,
                "availability" : "NOT_AVAILABLE",
                "leave_type" : leave.leave_type,
                "is_half_day" : False,
            }
        projects_payload.append(entry)
    
    return Response({
        "employee":{
            "user_id" : employee.id,
            "full_name" : employee.full_name,
        },
        "date": str(target_date),
        "projects" : projects_payload,
    })

#ENDPOINT 6 - POST /api/v1/dashboard/project-cell-details

@api_view(["POST"])
def project_cell_details(request):
    """
        Drill-down : who is on leave in this project on this date?
        Triggered when a user clicks a projject date cell (UC-08)

        body :
            project_id (required)
            date (required)
            start_date (required)
            end_date (required)
            leave_statuses (optional)

            returns :
            {
                project : {project_id , project_name},
                date : "YYYY-MM-DD",
                employees : [
                    {
                        user_id , full_name , role,
                        availability , 
                        leave_type?
                        is_half_day?
                        half_day_session?
                    }
                ]
            }
    """
    user = get_user_from_request(request)
    if not user:
        return Response({"error" : "Unauthorized"}, status = 401)

    try:
        target_date = parse_date(request , "date")
    except ValueError as e:
        return Response({"error": str(e)}, status = 400)

    target_pid = request.data.get("project_id")
    if not target_pid:
        return Response({"error":"project_id is required"} , status = 400)
    
    leave_statuses = request.data.get("leave_statuses",[])

    #access control
    accessible_ids = get_accessible_project_ids(user)
    if target_pid not in accessible_ids:
        return Response({"error":"Forbidden"}, status = 403)

    try :
        project = Project.objects.get(id = target_pid , is_active = True)
    except Project.DoesNotExist:
        return Response({'error' : 'Project Not found'}, status = 404)

    #active memebers of this project

    today = date.today()
    member_ids = ProjectAssignment.objects.filter(
        project = project,
        is_active = True,
        assigned_from__lte = today,
        assigned_till__isnull = True,
    ).values_list("user_id" , flat = True)

    members = User.objects.filter(id__in = member_ids , is_active = True)

    #leaves on target date for this project

    leave_qs = LeaveApplication.objects.filter(
        user__in = members,
        project = project,
        start_date__lte = target_date,
        end_date__gte = target_date,
    )

    if leave_statuses:
        leave_qs = leave_qs.filter(leave_status__in = leave_statuses)

    leave_by_user = {l.user_id : l for l in leave_qs}

    employees_payload = []
    for emp in members:
        leave = leave_by_user.get(emp.id)
        if leave is None:
            entry = {
                "user_id":emp.id,
                "full_name" : emp.full_name,
                "role" : emp.role,
                "availability" : "AVAILABLE",
            }
        elif leave.is_half_day:
            entry = {
                "user_id" : emp.id,
                "full_name":emp.full_name,
                "role" : emp.role,
                "availability" : "PARTIALLY AVAILABLE",
                "is_half_day" : True,
                "half_day_session" : leave.half_day_session,
            }
        else:
            entry = {
                 "user_id" : emp.id,
                "full_name":emp.full_name,
                "role" : emp.role,
                "availability" : "ON_lEAVE",
                "leave_type" : leave.leave_type,
                "is_half_day" : False,
            }
        employees_payload.append(entry)

    return Response({
            "project" : {
                "project_id": project.id,
                "project_name" : project.project_name,
            },
            "date":str(target_date),
            "employees": employees_payload,
        })

#ENDPOINT 7 - POST /api/v1/dashboard/day-details

@api_view(["POST"])
def day_details(request):
    """
    Global impact panel: full picture for one date across all visible projects.
    Triggered when a user clicks a date in the date strip (UC-09).

    Body:
      date           (required)
      start_date     (required)
      end_date       (required)
      project_ids    (optional)
      leave_types    (optional)
      leave_statuses (optional)

    Returns:
      {
        date: { date, day, is_weekend, is_public_holiday },
        summary: { total_projects_affected, total_employees_on_leave },
        projects: [ { project_id, project_name, required_workforce,
                      assigned_employees, employees_on_leave,
                      available_workforce, risk_level } ],
        employees_on_leave: [
          { user_id, full_name, role, leave_type, is_half_day,
            half_day_session?, projects: [ { project_id, project_name } ] }
        ]
      }
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

    # Assignments for scoped projects
    today = date.today()
    assignments = ProjectAssignment.objects.filter(
        project_id__in=scoped_pids,
        is_active=True,
        assigned_from__lte=today,
        assigned_till__isnull=True,
    )
    project_members = {}   # { project_id: set(user_id) }
    user_projects   = {}   # { user_id: set(project_id) }
    all_member_ids  = set()

    for a in assignments:
        project_members.setdefault(a.project_id, set()).add(a.user_id)
        user_projects.setdefault(a.user_id, set()).add(a.project_id)
        all_member_ids.add(a.user_id)

    # Leaves on target date across all scoped projects
    leave_qs = LeaveApplication.objects.filter(
        user_id__in=all_member_ids,
        project_id__in=scoped_pids,
        start_date__lte=target_date,
        end_date__gte=target_date,
    )
    leave_qs = apply_leave_filters(leave_qs, leave_types, leave_statuses)

    # { (user_id, project_id): leave }
    leave_by_user_project = {}
    # Also track unique users on leave: { user_id: leave } (any one leave record)
    any_leave_by_user = {}
    for leave in leave_qs.select_related("user"):
        leave_by_user_project[(leave.user_id, leave.project_id)] = leave
        any_leave_by_user[leave.user_id] = leave

    # Build project summaries
    projects_payload   = []
    affected_pids      = set()

    for project in projects_qs:
        member_ids     = project_members.get(project.id, set())
        assigned_count = len(member_ids)
        on_leave_count = sum(
            1 for uid in member_ids
            if (uid, project.id) in leave_by_user_project
        )
        available = assigned_count - on_leave_count
        if on_leave_count > 0:
            affected_pids.add(project.id)

        projects_payload.append({
            "project_id":project.id,
            "project_name":project.project_name,
            "required_workforce": project.required_workforce,
            "assigned_employees": assigned_count,
            "employees_on_leave": on_leave_count,
            "available_workforce": available,
            "risk_level":calculate_risk_level(project, available , assigned_count),
        })

    # Build employees-on-leave list
    on_leave_users = User.objects.filter(
        id__in=any_leave_by_user.keys()
    ).order_by("full_name")

    employees_on_leave_payload = []
    for emp in on_leave_users:
        leave = any_leave_by_user[emp.id]

        # All scoped projects this employee is assigned to
        emp_pids_in_scope = user_projects.get(emp.id, set()) & set(scoped_pids)
        emp_projects_qs   = Project.objects.filter(id__in=emp_pids_in_scope).values("id", "project_name")

        entry = {
            "user_id":emp.id,
            "full_name": emp.full_name,
            "role":emp.role,
            "leave_type": leave.leave_type,
            "is_half_day":leave.is_half_day,
            "projects": [
                {"project_id": p["id"], "project_name": p["project_name"]}
                for p in emp_projects_qs
            ],
        }
        if leave.is_half_day and leave.half_day_session:
            entry["half_day_session"] = leave.half_day_session

        employees_on_leave_payload.append(entry)

    # Date metadata — check holidays table for this specific date
    holiday = PublicHolidays.objects.filter(holiday_date=target_date).first()
    date_meta = {
        "date":str(target_date),
        "day":target_date.strftime("%a"),
        "is_weekend":target_date.weekday() >= 5,
        "is_public_holiday": holiday is not None,
        "holiday_name": holiday.holiday_name if holiday else None,
    }

    return Response({
        "date": date_meta,
        "summary": {
            "total_projects_affected":   len(affected_pids),
            "total_employees_on_leave":  len(any_leave_by_user),
        },
        "projects":           projects_payload,
        "employees_on_leave": employees_on_leave_payload,
    })
