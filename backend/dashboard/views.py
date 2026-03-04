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

    NOTE: user_role in the response uses the `role` column from your users table
    since you don't have a separate user_role column.
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