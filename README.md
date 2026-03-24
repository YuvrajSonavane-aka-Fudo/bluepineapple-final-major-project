# Leave Impact Dashboard

A real-time resource availability and leave impact monitoring tool for enterprise teams. Built with a React frontend and Django REST API backend, it gives managers a clear, visual overview of who is on leave, which projects are affected, and what the risk exposure is — day by day.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Backend Setup (Django)](#backend-setup-django)
  - [Frontend Setup (React)](#frontend-setup-react)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Features](#features)
- [UI Components](#ui-components)
- [Data Model Assumptions](#data-model-assumptions)
- [Known Limitations](#known-limitations)

---

## Overview

The dashboard displays two synchronized grids:

- **Employee Grid** — each row is an employee; each column is a date. Cells show leave type (Paid, Sick, WFH, Half Day, Conference), status (Approved, Pending, Rejected), and half-day schedules.
- **Project Grid** — each row is a project; each column is a date. Cells show workforce availability as a percentage with color-coded risk levels (High / Medium / Low).

Clicking any cell opens a detail panel showing deeper impact analysis for that employee, project, or date.

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 18, Axios, date-fns         |
| Backend   | Django, Django REST Framework     |
| Database  | PostgreSQL (via Supabase)         |
| Fonts     | Plus Jakarta Sans, DM Mono        |
| Auth      | Session-based (email → session_id)|

---

## Project Structure

```
leave-impact-dashboard/
├── frontend/                        # React application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── LoginPage.jsx        # Split-panel login screen
│   │   │   ├── dashboard/
│   │   │   │   ├── Dashboard.jsx        # Main orchestrator + FilterBar
│   │   │   │   ├── Toolbar.jsx          # Navy top bar with nav + filters
│   │   │   │   ├── EmployeePanel.jsx    # Employee leave grid
│   │   │   │   ├── ProjectPanel.jsx     # Project risk grid
│   │   │   │   ├── DateStrip.jsx        # Scrollable date header
│   │   │   │   ├── DraggableDivider.jsx # Resize handle between panels
│   │   │   │   ├── DetailPanel.jsx      # Drill-down modal (3 modes)
│   │   │   │   └── Legend.jsx           # Right sidebar legend
│   │   │   └── shared/
│   │   │       ├── LeaveCell.jsx        # Individual employee leave cell
│   │   │       └── RiskCell.jsx         # Individual project risk cell
│   │   ├── hooks/
│   │   │   └── useAuth.js               # Auth context + session management
│   │   ├── services/
│   │   │   └── api.js                   # Axios instance + all API calls
│   │   ├── utils/
│   │   │   └── dateUtils.js             # date-fns wrappers
│   │   ├── styles/
│   │   │   └── globals.css              # CSS variables + global styles
│   │   ├── App.jsx
│   │   └── index.js
│   ├── .env.example
│   └── package.json
│
└── backend/                         # Django application
    ├── dashboard/
    │   ├── models.py                    # User, Project, Leave, Session, PublicHoliday
    │   ├── views.py                     # All 7 API endpoint views
    │   └── urls.py
    └── manage.py
```

---

## Getting Started

### Backend Setup (Django)

```bash
# 1. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install django djangorestframework psycopg2-binary python-dotenv

# 3. Configure your .env (see Environment Variables section)

# 4. Run migrations
python manage.py migrate

# 5. Start the dev server
python manage.py runserver      # Runs on http://localhost:8000
```

### Frontend Setup (React)

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Copy and configure environment file
cp .env.example .env
# Edit .env and set REACT_APP_API_BASE_URL

# 4. Start the dev server
npm start                       # Runs on http://localhost:3000
```

---

## Environment Variables

### Frontend — `frontend/.env`

```env
REACT_APP_API_BASE_URL=http://localhost:8000/api/v1
```

### Backend — `.env`

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

---

## Authentication

Authentication uses a simple **email → session token** flow. There is no password; access is controlled by whether the email exists in the `users` table.

```
POST /api/v1/connect
Body: { "login_type": "PASSWORD", "email": "user@company.com" }

Response: { "session_id": "uuid", "user_id": 123, "user_role": "Manager" }
```

The returned `session_id` is stored in `sessionStorage` and sent as a `Bearer` token on every subsequent request:

```
Authorization: Bearer <session_id>
```

Sessions do not currently expire — this should be hardened before production use.

---

## API Endpoints

All endpoints require a valid `Authorization: Bearer <session_id>` header.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/connect` | Login — returns session_id |
| `GET`  | `/api/v1/projects` | List all projects the user can access |
| `POST` | `/api/v1/dashboard/employees` | Employee leave grid data for a date range |
| `POST` | `/api/v1/dashboard/projects` | Project risk grid data for a date range |
| `POST` | `/api/v1/dashboard/employee-cell-details` | Detail data for a single employee on a date |
| `POST` | `/api/v1/dashboard/project-cell-details` | Detail data for a single project on a date |
| `POST` | `/api/v1/dashboard/day-details` | Global summary for a given date |

### Common Request Body (dashboard endpoints)

```json
{
  "start_date": "2024-10-01",
  "end_date": "2024-10-31",
  "project_ids": [],
  "leave_types": [],
  "leave_statuses": []
}
```

---

## Features

### Dual-Panel Grid
Two independently scrollable but horizontally synchronized grids — employees on top, projects on the bottom. A draggable divider lets you resize the split.

### Date Navigation
- **TODAY / WEEK / MONTH** quick filters
- Arrow buttons to shift the range forward or backward
- Manual date pickers for custom ranges

### Leave Visualization
- **Full day** — solid colored block
- **WFH** — green badge
- **Half Day AM** — upper-left triangle
- **Half Day PM** — lower-right triangle
- **Pending** — dashed border
- **Rejected** — red X icon
- **Weekends** — diagonal hatched pattern
- **Public Holidays** — yellow background

### Risk Levels
Project cells show availability as a percentage. Color coding:
- 🟢 **Low Risk** — above 75% available
- 🟡 **Medium Risk** — 40–75% available
- 🔴 **High Risk** — below 40% available

Risk thresholds are configured per-project in the database.

### Drill-Down Detail Panel
Click any cell to open a modal with:
- **Employee cell** → leave type, approval status, half-day schedule, impacted projects
- **Project cell** → assigned/on-leave/available counts, risk banner, employee list
- **Date header** → daily overview stats, high-risk project table, all employees on leave grouped by type

### Filters
- Filter by project, leave status, and leave type
- Search employees and projects by name
- All filters apply to both grids and all drill-down panels simultaneously

### Scroll Synchronization
The date strip header and all data rows within each panel are kept in sync using a shared ref array pattern — scrolling any element moves all others to the same position without event loops.

---

## UI Components

### `Dashboard.jsx`
Top-level orchestrator. Owns all state: date range, filter selections, grid data, detail panel context, and panel split height. Fetches employee and project data simultaneously on every filter change.

### `Toolbar.jsx`
Navy top bar. Contains the logo, date inputs, TODAY/WEEK/MONTH tabs, project/status/type filter dropdowns, a refresh button, a clear button, and an All Employees toggle.

### `EmployeePanel.jsx` / `ProjectPanel.jsx`
Grid panels with a frozen left column (name/ID) and a horizontally scrollable cell area. Scroll sync is achieved by storing a ref per row in `rowRefs.current[idx]` and pushing the same `scrollLeft` to all refs on every scroll event.

### `DetailPanel.jsx`
A centered modal with three rendering modes driven by `context.type`:
- `"employee"` — Image 8 style: large avatar, leave details table, impacted projects list
- `"project"` — Image 7 style: stat cards, risk banner, employee list
- `"day"` — Image 5/6 style: daily overview stats, high-risk table, employees grouped by leave type

### `LeaveCell.jsx`
Renders a single 44×44px cell. Uses `clipPath` for half-day triangles, dashed borders for pending, and a hatched CSS gradient for weekends.

### `RiskCell.jsx`
Renders a single risk cell showing availability percentage with color-coded background based on risk level.

### `Legend.jsx`
Fixed right sidebar (200px) explaining all visual indicators: leave types, statuses, timeline markers, and risk levels.

---

## Data Model Assumptions

The frontend expects the following shape from the backend:

**Employee dashboard response:**
```json
{
  "date_strip": [
    { "date": "2024-10-01", "day": "Tuesday", "is_weekend": false, "is_public_holiday": false }
  ],
  "employees": [
    {
      "user_id": 1024,
      "full_name": "Sarah Jenkins",
      "cells": {
        "2024-10-01": {
          "leave_type": "Paid",
          "leave_status": "Approved",
          "is_half_day": false,
          "half_day_session": null
        },
        "2024-10-02": null
      }
    }
  ]
}
```

**Project dashboard response:**
```json
{
  "date_strip": [ ... ],
  "projects": [
    {
      "project_id": 1,
      "project_name": "Phoenix Engine Redesign",
      "cells": {
        "2024-10-01": {
          "assigned_employees": 6,
          "available_workforce": 5,
          "employees_on_leave": 1,
          "risk_level": "LOW"
        }
      }
    }
  ]
}
```

---

## Known Limitations

- **Sessions never expire.** The `sessions` table has no TTL. Add expiry logic before going to production.
- **No logout endpoint.** Clearing `sessionStorage` removes the token client-side, but the server-side session row persists.
- **No error boundaries.** If a component throws during render, the whole dashboard crashes. Consider wrapping panels in React error boundaries.
- **Scroll sync is JS-driven.** For very large employee lists (100+ rows), setting `scrollLeft` on every row on every scroll tick may cause jank. Virtual scrolling would solve this.
- **Rate limiting absent.** The `/connect` endpoint has no rate limit. Add throttling before exposing to the internet.
