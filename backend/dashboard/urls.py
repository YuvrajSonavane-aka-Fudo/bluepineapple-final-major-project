"""
dashboard/urls.py
─────────────────
Wire all 7 API endpoints to their view functions.

In core/urls.py, add:
    from django.urls import path, include

    urlpatterns = [
        path("api/v1/", include("dashboard.urls")),
    ]
"""

from django.urls import path
from . import views

urlpatterns = [
    path("connect",views.connect),
    # path("projects",views.projects),
    # path("dashboard/employees",views.dashboard_employees),
    # path("dashboard/projects",views.dashboard_projects),
    # path("dashboard/employee-cell-details",views.employee_cell_details),
    # path("dashboard/project-cell-details",views.project_cell_details),
    # path("dashboard/day-details",views.day_details),
]
