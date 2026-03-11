"""
dashboard/tests.py
──────────────────
Run with:
    python manage.py test dashboard
"""

from datetime import date, timedelta
from rest_framework.test import APITestCase
from dashboard.models import (
    User, Project, ProjectAssignment, LeaveApplication, Session, PublicHolidays
)


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def make_user(employee_code="U001", email="user@example.com", role="Engineer", is_active=True):
    return User.objects.create(
        employee_code=employee_code,
        full_name="Test User",
        email=email,
        role=role,
        is_active=is_active,
    )


def make_project(projectid="PRJ1", name="Project One", workforce=5,
                 risk=50, warning=75, is_active=True):
    return Project.objects.create(
        projectid=projectid,
        project_name=name,
        required_workforce=workforce,
        risk_threshold_percent=risk,
        warning_threshold_percent=warning,
        is_active=is_active,
    )


def make_assignment(user, project, assigned_from=None, assigned_till=None, is_active=True):
    return ProjectAssignment.objects.create(
        user=user,
        project=project,
        assigned_from=assigned_from or date(2020, 1, 1),
        assigned_till=assigned_till,
        is_active=is_active,
    )


def make_leave(user, project, start, end, leave_type="Paid",
               status="Approved", is_half_day=False, half_day_session=None):
    return LeaveApplication.objects.create(
        user=user,
        project=project,
        leave_type=leave_type,
        leave_status=status,
        start_date=start,
        end_date=end,
        is_half_day=is_half_day,
        half_day_session=half_day_session,
    )


# ─────────────────────────────────────────────
# ENDPOINT 1 — connect
# ─────────────────────────────────────────────

class ConnectTests(APITestCase):

    def test_connect_no_email(self):
        r = self.client.post("/api/v1/connect/", {"email": ""}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["error"], "email is required.")

    def test_connect_bad_email(self):
        r = self.client.post("/api/v1/connect/", {"email": "nope@example.com"}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_connect_inactive_user(self):
        make_user(employee_code="U099", email="inactive@example.com", is_active=False)
        r = self.client.post("/api/v1/connect/", {"email": "inactive@example.com"}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_connect_success_returns_fields(self):
        u = make_user(employee_code="U100", email="testuser@example.com", role="Senior Engineer")
        r = self.client.post("/api/v1/connect/", {"email": "testuser@example.com"}, format="json")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn("session_id", body)
        self.assertIn("user_id", body)
        self.assertIn("user_role", body)
        self.assertEqual(body["user_role"], "Senior Engineer")
        self.assertEqual(body["user_id"], u.id)

    def test_connect_creates_session(self):
        u = make_user(employee_code="U101", email="session@example.com")
        r = self.client.post("/api/v1/connect/", {"email": "session@example.com"}, format="json")
        self.assertEqual(r.status_code, 200)
        Session.objects.get(session_id=r.json()["session_id"], user=u)

    def test_connect_email_case_insensitive(self):
        make_user(employee_code="U102", email="upper@example.com")
        r = self.client.post("/api/v1/connect/", {"email": "UPPER@EXAMPLE.COM"}, format="json")
        self.assertEqual(r.status_code, 200)


# ─────────────────────────────────────────────
# Base class with common setUp for auth tests
# ─────────────────────────────────────────────

class AuthBase(APITestCase):
    def setUp(self):
        self.user = make_user(employee_code="U200", email="auth@example.com", role="Admin")
        self.session = Session.objects.create(user=self.user, session_id="testtoken")
        self.project = make_project(projectid="PRJ-A", name="Alpha Project", workforce=4)
        make_assignment(self.user, self.project)

    def auth(self):
        return {"HTTP_AUTHORIZATION": "Bearer testtoken"}

    def no_auth(self):
        return {}


# ─────────────────────────────────────────────
# ENDPOINT 2 — projects
# ─────────────────────────────────────────────

class ProjectsTests(AuthBase):

    def test_projects_unauthorized(self):
        r = self.client.get("/api/v1/projects/", **self.no_auth())
        self.assertEqual(r.status_code, 401)

    def test_projects_invalid_token(self):
        r = self.client.get("/api/v1/projects/",
                            HTTP_AUTHORIZATION="Bearer invalidtoken")
        self.assertEqual(r.status_code, 401)

    def test_projects_returns_list(self):
        r = self.client.get("/api/v1/projects/", **self.auth())
        self.assertEqual(r.status_code, 200)
        self.assertIn("projects", r.json())
        self.assertEqual(len(r.json()["projects"]), 1)
        self.assertEqual(r.json()["projects"][0]["project_name"], "Alpha Project")

    def test_projects_excludes_inactive(self):
        make_project(projectid="PRJ-DEAD", name="Dead Project", is_active=False)
        r = self.client.get("/api/v1/projects/", **self.auth())
        names = [p["project_name"] for p in r.json()["projects"]]
        self.assertNotIn("Dead Project", names)

    def test_projects_only_accessible(self):
        # Project with no assignment for this user — should not appear
        make_project(projectid="PRJ-OTHER", name="Other Project")
        r = self.client.get("/api/v1/projects/", **self.auth())
        names = [p["project_name"] for p in r.json()["projects"]]
        self.assertNotIn("Other Project", names)
        self.assertIn("Alpha Project", names)

    def test_projects_response_shape(self):
        r = self.client.get("/api/v1/projects/", **self.auth())
        project = r.json()["projects"][0]
        self.assertIn("project_id", project)
        self.assertIn("project_name", project)


# ─────────────────────────────────────────────
# ENDPOINT 3 — dashboard/employees
# ─────────────────────────────────────────────

class DashboardEmployeesTests(AuthBase):

    URL = "/api/v1/dashboard/employees/"

    def post(self, data):
        return self.client.post(self.URL, data, format="json", **self.auth())

    def test_unauthorized(self):
        r = self.client.post(self.URL, {}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_missing_start_date(self):
        r = self.post({"end_date": "2026-03-10"})
        self.assertEqual(r.status_code, 400)

    def test_missing_end_date(self):
        r = self.post({"start_date": "2026-03-01"})
        self.assertEqual(r.status_code, 400)

    def test_end_before_start(self):
        r = self.post({"start_date": "2026-03-10", "end_date": "2026-03-01"})
        self.assertEqual(r.status_code, 400)
        self.assertIn("end_date must be on or after start_date", r.json()["error"])

    def test_invalid_date_format(self):
        r = self.post({"start_date": "not-a-date", "end_date": "2026-03-10"})
        self.assertEqual(r.status_code, 400)

    def test_same_start_and_end(self):
        r = self.post({"start_date": "2026-03-01", "end_date": "2026-03-01"})
        self.assertEqual(r.status_code, 200)

    def test_response_shape(self):
        r = self.post({"start_date": "2026-03-01", "end_date": "2026-03-03"})
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn("date_strip", body)
        self.assertIn("employees", body)

    def test_employee_appears_in_response(self):
        r = self.post({"start_date": "2026-03-01", "end_date": "2026-03-03"})
        ids = [e["user_id"] for e in r.json()["employees"]]
        self.assertIn(self.user.id, ids)

    def test_cells_contain_all_dates(self):
        r = self.post({"start_date": "2026-03-01", "end_date": "2026-03-03"})
        emp = r.json()["employees"][0]
        self.assertIn("2026-03-01", emp["cells"])
        self.assertIn("2026-03-02", emp["cells"])
        self.assertIn("2026-03-03", emp["cells"])

    def test_leave_shows_in_cell(self):
        make_leave(self.user, self.project,
                   start=date(2026, 3, 2), end=date(2026, 3, 2))
        r = self.post({"start_date": "2026-03-01", "end_date": "2026-03-03"})
        emp = next(e for e in r.json()["employees"] if e["user_id"] == self.user.id)
        cell = emp["cells"]["2026-03-02"]
        # Cell should not be empty/available
        self.assertNotEqual(cell, {})

    def test_filter_by_leave_type(self):
        make_leave(self.user, self.project,
                   start=date(2026, 3, 2), end=date(2026, 3, 2), leave_type="Sick")
        # Filter for Paid — sick leave should not affect the cell
        r = self.post({
            "start_date": "2026-03-01", "end_date": "2026-03-03",
            "leave_types": ["Paid"],
        })
        self.assertEqual(r.status_code, 200)

    def test_unassigned_employee_excluded(self):
        other = make_user(employee_code="U999", email="other@example.com")
        # No assignment for `other` on this project
        r = self.post({"start_date": "2026-03-01", "end_date": "2026-03-03"})
        ids = [e["user_id"] for e in r.json()["employees"]]
        self.assertNotIn(other.id, ids)


# ─────────────────────────────────────────────
# ENDPOINT 4 — dashboard/projects
# ─────────────────────────────────────────────

class DashboardProjectsTests(AuthBase):

    URL = "/api/v1/dashboard/projects/"

    def post(self, data):
        return self.client.post(self.URL, data, format="json", **self.auth())

    def test_unauthorized(self):
        r = self.client.post(self.URL, {}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_end_before_start(self):
        r = self.post({"start_date": "2026-03-10", "end_date": "2026-03-01"})
        self.assertEqual(r.status_code, 400)

    def test_missing_dates(self):
        r = self.post({"start_date": "2026-03-01"})
        self.assertEqual(r.status_code, 400)

    def test_response_shape(self):
        r = self.post({"start_date": "2026-03-01", "end_date": "2026-03-03"})
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn("date_strip", body)
        self.assertIn("projects", body)

    def test_project_appears_in_response(self):
        r = self.post({"start_date": "2026-03-01", "end_date": "2026-03-03"})
        ids = [p["project_id"] for p in r.json()["projects"]]
        self.assertIn(self.project.id, ids)

    def test_cell_fields_present(self):
        r = self.post({"start_date": "2026-03-01", "end_date": "2026-03-01"})
        proj = r.json()["projects"][0]
        cell = proj["cells"]["2026-03-01"]
        self.assertIn("assigned_employees", cell)
        self.assertIn("employees_on_leave", cell)
        self.assertIn("available_workforce", cell)
        self.assertIn("risk_level", cell)

    def test_assigned_count_correct(self):
        # Add a second member
        other = make_user(employee_code="U201", email="other2@example.com")
        make_assignment(other, self.project)
        r = self.post({"start_date": "2026-03-01", "end_date": "2026-03-01"})
        proj = r.json()["projects"][0]
        cell = proj["cells"]["2026-03-01"]
        self.assertEqual(cell["assigned_employees"], 2)

    def test_on_leave_reduces_available(self):
        make_leave(self.user, self.project,
                   start=date(2026, 3, 1), end=date(2026, 3, 1))
        r = self.post({"start_date": "2026-03-01", "end_date": "2026-03-01"})
        proj = r.json()["projects"][0]
        cell = proj["cells"]["2026-03-01"]
        self.assertEqual(cell["employees_on_leave"], 1)
        self.assertEqual(cell["available_workforce"], 0)  # 1 assigned - 1 on leave

    def test_no_leave_full_availability(self):
        r = self.post({"start_date": "2026-03-01", "end_date": "2026-03-01"})
        proj = r.json()["projects"][0]
        cell = proj["cells"]["2026-03-01"]
        self.assertEqual(cell["employees_on_leave"], 0)
        self.assertEqual(cell["available_workforce"], cell["assigned_employees"])

    def test_inaccessible_project_excluded(self):
        other_proj = make_project(projectid="PRJ-SECRET", name="Secret Project")
        # No assignment for self.user on other_proj
        r = self.post({"start_date": "2026-03-01", "end_date": "2026-03-01"})
        ids = [p["project_id"] for p in r.json()["projects"]]
        self.assertNotIn(other_proj.id, ids)

    def test_required_workforce_in_response(self):
        r = self.post({"start_date": "2026-03-01", "end_date": "2026-03-01"})
        proj = r.json()["projects"][0]
        self.assertEqual(proj["required_workforce"], 4)


# ─────────────────────────────────────────────
# ENDPOINT 5 — employee-cell-details
# ─────────────────────────────────────────────

class EmployeeCellDetailsTests(AuthBase):

    URL = "/api/v1/dashboard/employee-cell-details/"

    def post(self, data):
        return self.client.post(self.URL, data, format="json", **self.auth())

    def base_payload(self, **kwargs):
        p = {
            "user_id": self.user.id,
            "date": "2026-03-05",
            "start_date": "2026-03-01",
            "end_date": "2026-03-07",
        }
        p.update(kwargs)
        return p

    def test_unauthorized(self):
        r = self.client.post(self.URL, self.base_payload(), format="json")
        self.assertEqual(r.status_code, 401)

    def test_missing_user_id(self):
        r = self.post({"date": "2026-03-05", "start_date": "2026-03-01", "end_date": "2026-03-07"})
        self.assertEqual(r.status_code, 400)
        self.assertIn("user ID is required", r.json()["error"])

    def test_missing_date(self):
        r = self.post({"user_id": self.user.id, "start_date": "2026-03-01", "end_date": "2026-03-07"})
        self.assertEqual(r.status_code, 400)

    def test_invalid_user_id(self):
        r = self.post(self.base_payload(user_id=99999))
        self.assertEqual(r.status_code, 400)
        self.assertIn("Employee not found", r.json()["error"])

    def test_response_shape(self):
        r = self.post(self.base_payload())
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn("employee", body)
        self.assertIn("date", body)
        self.assertIn("projects", body)
        self.assertIn("user_id", body["employee"])
        self.assertIn("full_name", body["employee"])

    def test_project_listed_for_employee(self):
        r = self.post(self.base_payload())
        ids = [p["project_id"] for p in r.json()["projects"]]
        self.assertIn(self.project.id, ids)

    def test_available_when_no_leave(self):
        r = self.post(self.base_payload())
        proj = next(p for p in r.json()["projects"] if p["project_id"] == self.project.id)
        self.assertEqual(proj["availability"], "AVAILABLE")

    def test_on_leave_availability(self):
        make_leave(self.user, self.project,
                   start=date(2026, 3, 5), end=date(2026, 3, 5))
        r = self.post(self.base_payload())
        proj = next(p for p in r.json()["projects"] if p["project_id"] == self.project.id)
        self.assertNotEqual(proj["availability"], "AVAILABLE")

    def test_half_day_availability(self):
        make_leave(self.user, self.project,
                   start=date(2026, 3, 5), end=date(2026, 3, 5),
                   is_half_day=True, half_day_session="First Half")
        r = self.post(self.base_payload())
        proj = next(p for p in r.json()["projects"] if p["project_id"] == self.project.id)
        self.assertEqual(proj["availability"], "PARTIALLY_AVAILABLE")
        self.assertTrue(proj["is_half_day"])
        self.assertEqual(proj["half_day_session"], "First Half")

    def test_leave_outside_date_not_shown(self):
        # Leave on a completely different date
        make_leave(self.user, self.project,
                   start=date(2026, 4, 1), end=date(2026, 4, 1))
        r = self.post(self.base_payload())
        proj = next(p for p in r.json()["projects"] if p["project_id"] == self.project.id)
        self.assertEqual(proj["availability"], "AVAILABLE")

    def test_filter_by_leave_status(self):
        make_leave(self.user, self.project,
                   start=date(2026, 3, 5), end=date(2026, 3, 5), status="Pending")
        # Filter for Approved only — Pending leave should be ignored
        r = self.post(self.base_payload(leave_statuses=["Approved"]))
        proj = next(p for p in r.json()["projects"] if p["project_id"] == self.project.id)
        self.assertEqual(proj["availability"], "AVAILABLE")


# ─────────────────────────────────────────────
# ENDPOINT 6 — project-cell-details
# ─────────────────────────────────────────────

class ProjectCellDetailsTests(AuthBase):

    URL = "/api/v1/dashboard/project-cell-details/"

    def post(self, data):
        return self.client.post(self.URL, data, format="json", **self.auth())

    def base_payload(self, **kwargs):
        p = {
            "project_id": self.project.id,
            "date": "2026-03-05",
            "start_date": "2026-03-01",
            "end_date": "2026-03-07",
        }
        p.update(kwargs)
        return p

    def test_unauthorized(self):
        r = self.client.post(self.URL, self.base_payload(), format="json")
        self.assertEqual(r.status_code, 401)

    def test_missing_project_id(self):
        r = self.post({"date": "2026-03-05", "start_date": "2026-03-01", "end_date": "2026-03-07"})
        self.assertEqual(r.status_code, 400)
        self.assertIn("project_id is required", r.json()["error"])

    def test_missing_date(self):
        r = self.post({"project_id": self.project.id, "start_date": "2026-03-01", "end_date": "2026-03-07"})
        self.assertEqual(r.status_code, 400)

    def test_inaccessible_project_forbidden(self):
        other = make_project(projectid="PRJ-NOACCESS", name="No Access Project")
        r = self.post(self.base_payload(project_id=other.id))
        self.assertEqual(r.status_code, 403)

    def test_nonexistent_project_404(self):
        # Make the project inaccessible AND nonexistent — we need to assign
        # user to a project that doesn't exist, which isn't possible, so instead
        # we test with a valid accessible id that maps to inactive project
        inactive = make_project(projectid="PRJ-INACTIVE", name="Inactive", is_active=False)
        make_assignment(self.user, inactive)
        r = self.post(self.base_payload(project_id=inactive.id))
        self.assertEqual(r.status_code, 404)

    def test_response_shape(self):
        r = self.post(self.base_payload())
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn("project", body)
        self.assertIn("date", body)
        self.assertIn("employees", body)
        self.assertIn("project_id", body["project"])
        self.assertIn("project_name", body["project"])

    def test_employee_listed(self):
        r = self.post(self.base_payload())
        ids = [e["user_id"] for e in r.json()["employees"]]
        self.assertIn(self.user.id, ids)

    def test_available_when_no_leave(self):
        r = self.post(self.base_payload())
        emp = next(e for e in r.json()["employees"] if e["user_id"] == self.user.id)
        self.assertEqual(emp["availability"], "AVAILABLE")

    def test_on_leave_shown(self):
        make_leave(self.user, self.project,
                   start=date(2026, 3, 5), end=date(2026, 3, 5), leave_type="Sick")
        r = self.post(self.base_payload())
        emp = next(e for e in r.json()["employees"] if e["user_id"] == self.user.id)
        self.assertNotEqual(emp["availability"], "AVAILABLE")
        self.assertEqual(emp["leave_type"], "Sick")

    def test_half_day_shown(self):
        make_leave(self.user, self.project,
                   start=date(2026, 3, 5), end=date(2026, 3, 5),
                   is_half_day=True, half_day_session="Second Half")
        r = self.post(self.base_payload())
        emp = next(e for e in r.json()["employees"] if e["user_id"] == self.user.id)
        self.assertTrue(emp["is_half_day"])
        self.assertEqual(emp["half_day_session"], "Second Half")

    def test_filter_by_leave_status(self):
        make_leave(self.user, self.project,
                   start=date(2026, 3, 5), end=date(2026, 3, 5), status="Pending")
        r = self.post(self.base_payload(leave_statuses=["Approved"]))
        emp = next(e for e in r.json()["employees"] if e["user_id"] == self.user.id)
        self.assertEqual(emp["availability"], "AVAILABLE")

    def test_multiple_employees(self):
        other = make_user(employee_code="U202", email="emp2@example.com")
        make_assignment(other, self.project)
        r = self.post(self.base_payload())
        ids = [e["user_id"] for e in r.json()["employees"]]
        self.assertIn(self.user.id, ids)
        self.assertIn(other.id, ids)

    def test_unassigned_employee_not_listed(self):
        other = make_user(employee_code="U203", email="emp3@example.com")
        # No assignment for `other` on this project
        r = self.post(self.base_payload())
        ids = [e["user_id"] for e in r.json()["employees"]]
        self.assertNotIn(other.id, ids)

    def test_date_in_response(self):
        r = self.post(self.base_payload())
        self.assertEqual(r.json()["date"], "2026-03-05")