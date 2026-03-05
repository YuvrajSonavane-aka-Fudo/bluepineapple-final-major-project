"""
dashboard/models.py
────────────────────

All models have managed = False so Django never touches the Supabase tables.

The Session model IS managed by Django — it's the only table Django will create.
Run:  python manage.py makemigrations && python manage.py migrate
That will only create the sessions table.
"""

from django.db import models


class User(models.Model):
    employee_code = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=100)   # "Senior Engineer", "Account Manager", etc.
    is_active = models.BooleanField(default=True)

    class Meta:
        managed  = False
        db_table = "users"

    def __str__(self):
        return f"{self.full_name} ({self.employee_code})"


class Project(models.Model):
    projectid = models.CharField(max_length=50, unique=True)  # "PRJ-KERNEL"
    project_name = models.CharField(max_length=200)
    required_workforce = models.IntegerField(default=0)
    risk_threshold_percent = models.IntegerField(default=50)   # HIGH when available < 50%
    warning_threshold_percent = models.IntegerField(default=75)   # MEDIUM when available < 75%
    is_active = models.BooleanField(default=True)

    class Meta:
        managed  = False
        db_table = "projects"

    def __str__(self):
        return self.project_name


class ProjectAssignment(models.Model):
    user = models.ForeignKey(User,    on_delete=models.DO_NOTHING, db_column="user_id")
    project = models.ForeignKey(Project, on_delete=models.DO_NOTHING, db_column="project_id")
    assigned_from = models.DateField(null=True, blank=True)
    assigned_till = models.DateField(null=True, blank=True)  # null = still assigned
    is_active = models.BooleanField(default=True)

    class Meta:
        managed  = False
        db_table = "project_assignments"


class PublicHolidays(models.Model):
    holiday_name = models.CharField(max_length = 255)
    holiday_date = models.DateField()
    day = models.CharField(max_length = 50)

    class Meta:
        managed  = False
        db_table = "public_holidays"


class LeaveApplication(models.Model):
    LEAVE_TYPES = [
        ("Paid","Paid"),
        ("Sick","Sick"),
        ("WFH","WFH"),
        ("Half Day","Half Day"),
        ("Conference","Conference"),
    ]
    STATUSES = [
        ("Approved", "Approved"),
        ("Pending",  "Pending"),
        ("Rejected", "Rejected"),
    ]
    SESSIONS = [
        ("First Half",  "First Half"),
        ("Second Half", "Second Half"),
    ]

    user = models.ForeignKey(User,    on_delete=models.DO_NOTHING, db_column="user_id")
    project = models.ForeignKey(Project, on_delete=models.DO_NOTHING, db_column="project_id")
    leave_type = models.CharField(max_length=20, choices=LEAVE_TYPES)
    leave_status = models.CharField(max_length=20, choices=STATUSES)
    start_date = models.DateField()
    end_date = models.DateField()
    is_half_day = models.BooleanField(default=False)
    half_day_session = models.CharField(max_length=20, choices=SESSIONS, null=True, blank=True)

    class Meta:
        managed  = False
        db_table = "leave_applications"

    def __str__(self):
        return f"{self.user} | {self.leave_type} | {self.start_date}→{self.end_date}"


class Session(models.Model):
    """
    Django-managed table for login session tokens.
    This is the ONLY table Django will CREATE in your Supabase DB.
    """
    user = models.ForeignKey(User, on_delete=models.DO_NOTHING, db_column="user_id")
    session_id = models.CharField(max_length=200, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed  = True
        db_table = "sessions"
