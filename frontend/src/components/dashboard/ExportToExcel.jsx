// src/components/dashboard/ExportToExcel.jsx
//
// Usage:
//   import { exportDashboardToExcel } from './ExportToExcel';
//
//   exportDashboardToExcel({
//     empData,     // { date_strip: [...], employees: [...] }
//     projData,    // { date_strip: [...], projects: [...] }
//     dateStrip,   // filtered date strip (weekends removed if hideWeekends is on)
//     filters,     // { start_date, end_date, project_ids, leave_types, leave_statuses }
//   });
//
// Requires: npm install xlsx

import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';

// ─── Column definitions ───────────────────────────────────────────────────────

const EMP_COLUMNS = [
  { key: 'date',             header: 'Date'             },
  { key: 'day',              header: 'Day'              },
  { key: 'employee_id',      header: 'Employee ID'      },
  { key: 'employee_name',    header: 'Employee Name'    },
  { key: 'role',             header: 'Role'             },
  { key: 'availability',     header: 'Availability'     },
  { key: 'leave_type',       header: 'Leave Type'       },
  { key: 'is_half_day',      header: 'Half Day'         },
  { key: 'half_day_session', header: 'Half Day Session' },
  { key: 'project_name',     header: 'Project'          },
  { key: 'impact_pct',       header: 'Impact %'         },
  { key: 'risk_level',       header: 'Risk Level'       },
];

const PROJ_COLUMNS = [
  { key: 'project_name',        header: 'Project Name'       },
  { key: 'date',                header: 'Date'               },
  { key: 'day',                 header: 'Day'                },
  { key: 'required_workforce',  header: 'Required Workforce' },
  { key: 'assigned_employees',  header: 'Assigned'           },
  { key: 'employees_on_leave',  header: 'On Leave'           },
  { key: 'wfh_count',           header: 'WFH'                },
  { key: 'partial_count',       header: 'Partial'            },
  { key: 'available_workforce', header: 'Available'          },
  { key: 'impact_pct',          header: 'Impact %'           },
  { key: 'risk_level',          header: 'Risk Level'         },
];

const SUMMARY_COLUMNS = [
  { key: 'employee_id',   header: 'Employee ID'      },
  { key: 'employee_name', header: 'Employee Name'    },
  { key: 'role',          header: 'Role'             },
  { key: 'total_days',    header: 'Total Leave Days' },
  { key: 'on_leave_days', header: 'On Leave Days'    },
  { key: 'wfh_days',      header: 'WFH Days'         },
  { key: 'partial_days',  header: 'Partial Days'     },
];

const FILTER_COLUMNS = [
  { key: 'label', header: 'Filter'    },
  { key: 'value', header: 'Selection' },
];


// ─────────────────────────────────────────────────────────────────────────────
// Core export function
// ─────────────────────────────────────────────────────────────────────────────
export function exportDashboardToExcel({ empData, projData, dateStrip, filters = {} }) {
  const wb = XLSX.utils.book_new();

  // Build lookup: { user_id: Set(project_name) } — which projects each employee belongs to
  // This is derived from projData: if an employee appears in a project's cells at all,
  // they are assigned to that project.
  const empProjectMap = buildEmpProjectMap(empData, projData);

  appendSheet(wb, buildEmpRows(empData, projData, dateStrip, empProjectMap),  EMP_COLUMNS,     'Employee Leave Detail');
  appendSheet(wb, buildProjRows(projData, dateStrip),                          PROJ_COLUMNS,    'Project Risk Summary');
  appendSheet(wb, buildSummaryRows(empData, dateStrip),                        SUMMARY_COLUMNS, 'Summary by Employee');
  appendSheet(wb, buildFilterRows(filters),                                    FILTER_COLUMNS,  'Filters Applied');

  const filename = buildFilename(filters);
  const wbout    = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob     = new Blob([wbout], { type: 'application/octet-stream' });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


// ─────────────────────────────────────────────────────────────────────────────
// Build emp → project map from projData
// { user_id: [{ project_name, cells }] }
// We can't get user_id from projData directly, so we cross-reference:
// empData tells us which user_ids exist, projData tells us project cell data.
// The correct approach: for each employee in empData, find which projects
// in projData have that employee affected (via spillover logic in backend).
// Since we don't have direct assignment data in the frontend, we use a simpler
// rule: an employee's leave row should only show projects where
// projData cells show employees_on_leave > 0 OR wfh_count > 0 OR partial_count > 0
// AND the employee has leave on that same date.
// The TRUE fix: projData project cells now have per-date counts but NOT which
// employees. So we build the map from the employee's own assignment data.
// Best available signal: use the project_name already in the employee cell if
// the backend sends it, otherwise match by date overlap only for projects
// where assigned_employees includes this employee.
//
// Since backend doesn't send per-employee project assignments in empData,
// we derive it: employee is "on" a project if projData shows that project
// having assigned_employees > 0 on dates the employee has leave.
// This still over-assigns. The CORRECT fix is to track it properly:
// we build a { user_id -> Set<project_name> } by checking if the employee's
// leave date coincides with a project that shows impact — but filtered to
// only projects where assigned > 0 AND the employee count difference matches.
//
// REAL fix: since we have no direct employee-project mapping in frontend data,
// we use the employee's role/name and check against all projects. Instead,
// we rely on the fact that the backend empData cells contain a `project_id`
// or `project_name` field if available. If not, we show only 1 row per
// employee per date with no project column (safer than wrong data).
// ─────────────────────────────────────────────────────────────────────────────
function buildEmpProjectMap(empData, projData) {
  // Build: { project_name -> Set(date) } where project was affected
  // We cannot know which employees are on which project from frontend data alone
  // unless the employee cell has a project reference.
  // Return empty map — we'll handle in buildEmpRows by checking cell.project_name
  return {};
}


// ─────────────────────────────────────────────────────────────────────────────
// Sheet 1 — Employee Leave Detail
// ONE row per employee per date — no project fan-out
// Project column shows cell.project_name if backend provides it, else blank
// ─────────────────────────────────────────────────────────────────────────────
function buildEmpRows(empData, projData, dateStrip) {
  const rows = [];

  // Build lookup: { project_id -> { project_name, cells: { date -> cell } } }
  const projById = {};
  for (const proj of (projData.projects || [])) {
    projById[proj.project_id] = proj;
  }

  for (const emp of (empData.employees || [])) {
    for (const d of dateStrip) {
      const cell = emp.cells?.[d.date];
      if (!cell) continue;

      const parsed        = parseISO(d.date);
      const dateFormatted = format(parsed, 'dd/MM/yyyy');
      const dayFormatted  = format(parsed, 'EEEE');
      const availability  = deriveAvailability(cell);

      // Look up the project this leave was filed under
      const proj     = cell.project_id ? projById[cell.project_id] : null;
      const projCell = proj?.cells?.[d.date];

      const assigned     = projCell?.assigned_employees ?? 0;
      const nonAvailable = (projCell?.employees_on_leave ?? 0) + (projCell?.partial_count ?? 0) * 0.5;
      const impactPct    = assigned > 0 ? `${Math.round((nonAvailable / assigned) * 100)}%` : '';

      rows.push({
        date:             dateFormatted,
        day:              dayFormatted,
        employee_id:      emp.user_id,
        employee_name:    emp.full_name,
        role:             emp.role ?? '',
        availability,
        leave_type:       cell.leave_type        ?? '',
        is_half_day:      cell.is_half_day ? 'Yes' : 'No',
        half_day_session: cell.is_half_day ? (cell.half_day_session ?? '') : '',
        project_name:     proj?.project_name     ?? '',
        impact_pct:       impactPct,
        risk_level:       projCell?.risk_level   ?? '',
      });
    }
  }

  return rows;
}

function deriveAvailability(cell) {
  if (!cell) return 'AVAILABLE';
  if (cell.leave_type === 'WFH' && cell.is_half_day) return 'PARTIALLY AVAILABLE (WFH)';
  if (cell.leave_type === 'WFH') return 'WFH';
  if (cell.is_half_day) return 'PARTIALLY AVAILABLE';
  if (cell.leave_type) return 'ON LEAVE';
  return 'AVAILABLE';
}


// ─────────────────────────────────────────────────────────────────────────────
// Sheet 2 — Project Risk Summary
// One row per project × date where anyone is affected
// ─────────────────────────────────────────────────────────────────────────────
function buildProjRows(projData, dateStrip) {
  const rows = [];

  for (const proj of (projData.projects || [])) {
    for (const d of dateStrip) {
      const cell = proj.cells?.[d.date];
      if (!cell) continue;

      const assigned  = cell.assigned_employees  ?? 0;
      const onLeave   = cell.employees_on_leave  ?? 0;
      const wfh       = cell.wfh_count           ?? 0;
      const partial   = cell.partial_count       ?? 0;
      const available = cell.available_workforce ?? (assigned - onLeave - partial);

      if (onLeave === 0 && wfh === 0 && partial === 0) continue;

      // Impact % = (on_leave + partial) / assigned × 100
      // WFH excluded — WFH employees are still working
      const nonAvailable = onLeave + partial * 0.5;
      const impactPct    = assigned > 0 ? Math.round((nonAvailable / assigned) * 100) : 0;

      const parsed = parseISO(d.date);
      rows.push({
        project_name:        proj.project_name,
        date:                format(parsed, 'dd/MM/yyyy'),
        day:                 format(parsed, 'EEEE'),
        required_workforce:  proj.required_workforce ?? '',
        assigned_employees:  assigned,
        employees_on_leave:  onLeave,
        wfh_count:           wfh,
        partial_count:       partial,
        available_workforce: available,
        impact_pct:          `${impactPct}%`,
        risk_level:          cell.risk_level ?? '',
      });
    }
  }

  return rows;
}


// ─────────────────────────────────────────────────────────────────────────────
// Sheet 3 — Summary by Employee
// ─────────────────────────────────────────────────────────────────────────────
function buildSummaryRows(empData, dateStrip) {
  const totals = {};

  for (const emp of (empData.employees || [])) {
    const key = emp.user_id;
    if (!totals[key]) {
      totals[key] = {
        employee_id:   emp.user_id,
        employee_name: emp.full_name,
        role:          emp.role ?? '',
        total_days:    0,
        on_leave_days: 0,
        wfh_days:      0,
        partial_days:  0,
        _dates:        new Set(),
      };
    }

    for (const d of dateStrip) {
      const cell = emp.cells?.[d.date];
      if (!cell) continue;
      if (totals[key]._dates.has(d.date)) continue;
      totals[key]._dates.add(d.date);

      const isWfh     = cell.leave_type === 'WFH' && !cell.is_half_day;
      const isPartial = cell.is_half_day === true;
      const isLeave   = cell.leave_type && cell.leave_type !== 'WFH' && !cell.is_half_day;
      const dayCount  = isPartial ? 0.5 : 1;

      totals[key].total_days    += dayCount;
      if (isLeave)   totals[key].on_leave_days += 1;
      if (isWfh)     totals[key].wfh_days      += 1;
      if (isPartial) totals[key].partial_days  += 0.5;
    }
  }

  return Object.values(totals).map(t => ({
    employee_id:   t.employee_id,
    employee_name: t.employee_name,
    role:          t.role,
    total_days:    t.total_days,
    on_leave_days: t.on_leave_days,
    wfh_days:      t.wfh_days,
    partial_days:  t.partial_days,
  }));
}


// ─────────────────────────────────────────────────────────────────────────────
// Sheet 4 — Filters Applied
// ─────────────────────────────────────────────────────────────────────────────
function buildFilterRows(filters) {
  return [
    { label: 'Start Date',     value: filters.start_date                                              || '—' },
    { label: 'End Date',       value: filters.end_date                                                || '—' },
    { label: 'Projects',       value: filters.project_ids?.length    ? filters.project_ids.join(', ')    : 'All' },
    { label: 'Leave Types',    value: filters.leave_types?.length    ? filters.leave_types.join(', ')    : 'All' },
    { label: 'Leave Statuses', value: filters.leave_statuses?.length ? filters.leave_statuses.join(', ') : 'All' },
    { label: 'Exported At',    value: format(new Date(), 'dd/MM/yyyy HH:mm')                               },
  ];
}


// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function appendSheet(wb, rows, columns, sheetName) {
  const wsData = [
    columns.map(c => c.header),
    ...rows.map(r => columns.map(c => r[c.key] ?? '')),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  applySheetStyling(ws, wsData);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

function applySheetStyling(ws, wsData) {
  if (!wsData.length) return;
  const colWidths = wsData[0].map((_, ci) =>
    Math.min(50, Math.max(12, ...wsData.map(row => String(row[ci] ?? '').length + 2)))
  );
  ws['!cols']   = colWidths.map(w => ({ wch: w }));
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A2', sqref: 'A2' };
}

function buildFilename(filters) {
  const today = format(new Date(), 'yyyyMMdd');
  const start = filters.start_date ? `_${filters.start_date}` : '';
  const end   = filters.end_date   ? `_to_${filters.end_date}` : '';
  return `Leave_Dashboard${start}${end}_exported_${today}.xlsx`;
}