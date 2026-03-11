"""
dashboard/tests.py
──────────────────

Run with:
    DJANGO_TESTING=1 python manage.py test dashboard
"""

from datetime import date
from rest_framework.test import APITestCase
from dashboard.models import User, Project, ProjectAssignment, LeaveApplication, Session


class ConnectTests(APITestCase):

    def test_connect_no_email(self):
        r = self.client.post("/api/v1/connect/", {"email": ""}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["error"], "email is required.")

    def test_connect_bad_email(self):
        r = self.client.post("/api/v1/connect/", {"email": "nope@example.com"}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_connect_success(self):
        u = User.objects.create(
            employee_code="U100",
            full_name="Test User",
            email="testuser@example.com",
            role="Senior Engineer",
            is_active=True,
        )
        r = self.client.post("/api/v1/connect/", {"email": "testuser@example.com"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertIn("session_id", r.json())
        Session.objects.get(session_id=r.json()["session_id"], user=u)


class ProjectsAndDashboardEmployeesTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create(
            employee_code="U101",
            full_name="Project User",
            email="projuser@example.com",
            role="Admin",
            is_active=True,
        )
        self.session = Session.objects.create(user=self.user, session_id="token123")
        self.project = Project.objects.create(
            projectid="PRJ1",
            project_name="Project One",
            required_workforce=5,
            risk_threshold_percent=50,
            warning_threshold_percent=75,
            is_active=True,
        )
        ProjectAssignment.objects.create(
            user=self.user,
            project=self.project,
            assigned_from=date(2020, 1, 1),
            assigned_till=None,
            is_active=True,
        )

    def auth_header(self):
        return {"HTTP_AUTHORIZATION": f"Bearer {self.session.session_id}"}

    def test_projects_authorized(self):
        r = self.client.get("/api/v1/projects/", **self.auth_header())
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["projects"][0]["project_name"], "Project One")

    def test_dashboard_employees_date_validation(self):
        r = self.client.post(
            "/api/v1/dashboard/employees/",
            {"start_date": "2026-03-10", "end_date": "2026-03-01"},
            format="json",
            **self.auth_header(),
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn("end_date must be on or after start_date", str(r.json()["error"]))