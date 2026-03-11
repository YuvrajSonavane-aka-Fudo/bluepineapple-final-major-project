"""Helper functions for the dashboard app.

These helpers are imported by views and occasionally other modules.
"""

from datetime import date, timedelta

# import models used within helper logic
from .models import Project, ProjectAssignment, PublicHolidays, Session

def get_accessible_project_ids(user):
    """
    Return a list of project IDs this user can see.

    Since your users table has no separate user_role column, we use the
    role field to determine visibility:

      "Admin" or "HR"  → all active projects
      Everyone else    → only projects they're assigned to

    Adjust the role strings below to match whatever values you store in DB.
    """
    admin_roles = {"Admin", "HR"}   
    if user.role in admin_roles:
        return list(
            Project.objects.filter(is_active=True).values_list("id", flat=True)
        )

    today = date.today()
    return list(
        ProjectAssignment.objects.filter(
            user=user,
            is_active=True,
            assigned_from__lte=today,
        )
        .filter(
            # assigned_till is null (still active) OR in the future
            assigned_till__isnull=True
        )
        .values_list("project_id", flat=True)
    )

def build_date_strip(start_date, end_date):
    """
    Build the date_strip array for the given range.
    Fetches public holidays from the public_holidays table using holiday_date column.
    """
    # Single DB call — fetch all holiday dates in the range upfront
    holiday_dates = set(
        PublicHolidays.objects.filter(
            holiday_date__range=[start_date, end_date]
        ).values_list("holiday_date", flat=True)
    )

    strip = []
    current = start_date
    while current <= end_date:
        strip.append({
            "date":str(current),
            "day":current.strftime("%a"),
            "is_weekend":current.weekday() >= 5,
            "is_public_holiday": current in holiday_dates,
        })
        current += timedelta(days=1)
    return strip

def parse_date(request, field):
    """Parse a date field from request body. Raises ValueError if missing/invalid."""
    raw = request.data.get(field)
    if not raw:
        raise ValueError(f"'{field}' is required.")
    return date.fromisoformat(str(raw))

def calculate_risk_level(project, assigned_count, available_workforce):
    """
    Use the project's own threshold columns to determine risk level.
      available < risk_threshold_percent % → HIGH
      available < warning_threshold_percent % → MEDIUM
      otherwise → LOW
    """
    if assigned_count == 0:
        return "LOW"
        
    required = project.required_workforce
    if required == 0:
        return "LOW"
    ratio_percent = (available_workforce / required) * 100
    if ratio_percent < project.risk_threshold_percent:
        return "HIGH"
    if ratio_percent < project.warning_threshold_percent:
        return "MEDIUM"
    return "LOW"

def build_cell_payload(leave):
    """Convert a LeaveApplication to the leave cell dict. Returns None if no leave."""
    if leave is None:
        return None
    payload = {
        "leave_type":leave.leave_type,
        "leave_status":leave.leave_status,
        "is_half_day":leave.is_half_day,
    }
    if leave.is_half_day and leave.half_day_session:
        payload["half_day_session"] = leave.half_day_session
    return payload


def apply_leave_filters(qs, leave_types, leave_statuses):
    """Apply optional leave_type and leave_status filters."""
    if leave_types:
        qs = qs.filter(leave_type__in=leave_types)
    if leave_statuses:
        qs = qs.filter(leave_status__in=leave_statuses)
    return qs

def get_user_from_request(request):
    """
    Validate the Bearer token and return the User, or None.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    session_id = auth_header.split(" ", 1)[1].strip()
    try:
        session = Session.objects.select_related("user").get(session_id=session_id)
        return session.user
    except Session.DoesNotExist:
        return None