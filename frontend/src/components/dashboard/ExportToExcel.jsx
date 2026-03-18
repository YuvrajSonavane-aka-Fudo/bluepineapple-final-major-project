// src/components/dashboard/Export_to_excel.js
//
// Usage:
//   import { exportDashboardToExcel } from './ExportToExcel';
//
//   exportDashboardToExcel({
//     empData,        // { date_strip: [...], employees: [...] }
//     projData,       // { date_strip: [...], projects: [...] }
//     dateStrip,      // filtered date strip (weekends already removed if hideWeekends is on)
//     filters,        // { start_date, end_date, project_ids, leave_types, leave_statuses }
//   });
//
// Requires: npm install xlsx
// (SheetJS community edition — https://sheetjs.com)

import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';


const COLUMNS = [
  { key: 'date',             header: 'Date'              },
  { key: 'day',              header: 'Day'               },
  { key: 'employee_id',      header: 'Employee ID'       },
  { key: 'employee_name',    header: 'Employee Name'     },
  { key: 'projects_affected',header: 'Projects Affected' },
  { key: 'impact_pct',       header: 'Impact %'          },
  { key: 'leave_type',       header: 'Leave Type'        },
  { key: 'is_half_day',      header: 'Is Half Day'       },
  { key: 'half_day_session', header: 'Half Day Session'  },
];

// ---------------------------------------------------------------------------
// Core export function
// ---------------------------------------------------------------------------
/**
 * Builds an Excel workbook from the current dashboard state and triggers a
 * browser download.
 *
 * @param {object} params
 * @param {{ date_strip: object[], employees: object[] }} params.empData
 * @param {{ date_strip: object[], projects: object[]  }} params.projData
 * @param {object[]} params.dateStrip  – already-filtered strip (respects hideWeekends)
 * @param {object}   params.filters    – active filter state (used only for filename)
 */
export function exportDashboardToExcel({ empData, projData, dateStrip, filters = {} }) {
  const rows = buildRows(empData, projData, dateStrip);

  if (rows.length === 0) {
    console.warn('[Export_to_excel] Nothing to export – no leave records found.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // ── Sheet 1 : Leave Detail ───────────────────────────────────────────────
  const wsData = [
    COLUMNS.map(c => c.header),      // header row
    ...rows.map(r => COLUMNS.map(c => r[c.key] ?? '')),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  applySheetStyling(ws, wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Leave Detail');

  // ── Sheet 2 : Summary by Employee ───────────────────────────────────────
  const wsSummary = buildSummarySheet(rows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary by Employee');

  // ── Download ─────────────────────────────────────────────────────────────
  const filename = buildFilename(filters);
  XLSX.writeFile(wb, filename);
}

// ---------------------------------------------------------------------------
// Row builder
// ---------------------------------------------------------------------------
/**
 * Returns one row per (employee × date) leave record, with project impact
 * data joined in from projData.
 */
function buildRows(empData, projData, dateStrip) {
  const rows = [];

  // Pre-index project cells by date so lookup is O(1)
  // Shape: { [date]: [{ project_name, employees_on_leave, impact_pct, risk_level }] }
  const projByDate = buildProjectIndex(projData);

  for (const emp of (empData.employees || [])) {
    for (const d of dateStrip) {
      const cell = emp.cells?.[d.date];
      if (!cell) continue;           // no leave on this date → skip

      // Projects active on this date (from projData)
      const projsOnDate = projByDate[d.date] || [];

      // Each employee leave record may affect multiple projects.
      // We emit one row per (employee × project) pair so Impact % and project
      // name are never crammed into one cell. If no projects are affected we
      // still emit a single row with blanks for the project columns.
      if (projsOnDate.length === 0) {
        rows.push(buildRow(emp, d, cell, null));
      } else {
        for (const proj of projsOnDate) {
          rows.push(buildRow(emp, d, cell, proj));
        }
      }
    }
  }

  return rows;
}

function buildRow(emp, dateInfo, cell, proj) {
  const parsed = parseISO(dateInfo.date);

  return {
    date:              format(parsed, 'dd/MM/yyyy'),
    day:               format(parsed, 'EEEE'),           
    employee_id:       emp.user_id,
    employee_name:     emp.full_name,
    projects_affected: proj?.project_name       ?? '',
    impact_pct:        proj?.impact_pct != null
                         ? `${proj.impact_pct}%`
                         : '',
    leave_type:        cell.leave_type           ?? '',
    is_half_day:       cell.is_half_day ? 'Yes' : 'No',
    half_day_session:  cell.is_half_day
                         ? (cell.half_day_session ?? '')
                         : '',
  };
}

// ---------------------------------------------------------------------------
// Project index helper
// ---------------------------------------------------------------------------
function buildProjectIndex(projData) {
  const index = {};

  for (const proj of (projData.projects || [])) {
    for (const [date, cell] of Object.entries(proj.cells || {})) {
      if (!cell || cell.employees_on_leave === 0) continue;

      if (!index[date]) index[date] = [];
      index[date].push({
        project_name:       proj.project_name,
        employees_on_leave: cell.employees_on_leave,
        impact_pct:         cell.impact_pct ?? cell.impact_percentage ?? null,
        risk_level:         cell.risk_level,
      });
    }
  }

  return index;
}

// ---------------------------------------------------------------------------
// Summary sheet
// ---------------------------------------------------------------------------
function buildSummarySheet(rows) {
  // Group total leave days per employee
  const totals = {};

  for (const row of rows) {
    const key = row.employee_id;
    if (!totals[key]) {
      totals[key] = {
        employee_id:   row.employee_id,
        employee_name: row.employee_name,
        total_days:    0,
        half_days:     0,
      };
    }
    // Count unique dates to avoid double-counting when an employee has
    // multiple project rows on the same date. Use a Set per employee.
    totals[key]._dates = totals[key]._dates || new Set();
    const dateKey = row.date;
    if (!totals[key]._dates.has(dateKey)) {
      totals[key]._dates.add(dateKey);
      totals[key].total_days += row.is_half_day === 'Yes' ? 0.5 : 1;
      if (row.is_half_day === 'Yes') totals[key].half_days += 1;
    }
  }

  const summaryHeaders = ['Employee ID', 'Employee Name', 'Total Leave Days', 'Half Day Count'];
  const summaryRows    = Object.values(totals).map(t => [
    t.employee_id,
    t.employee_name,
    t.total_days,
    t.half_days,
  ]);

  const wsData = [summaryHeaders, ...summaryRows];
  const ws     = XLSX.utils.aoa_to_sheet(wsData);
  applySheetStyling(ws, wsData);
  return ws;
}


function applySheetStyling(ws, wsData) {
  if (!wsData.length) return;

  // Column widths – measure by longest value in each column
  const colWidths = wsData[0].map((_, ci) =>
    Math.min(
      50,
      Math.max(12, ...wsData.map(row => String(row[ci] ?? '').length + 2))
    )
  );

  ws['!cols'] = colWidths.map(w => ({ wch: w }));

  // Freeze the header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A2', sqref: 'A2' };
}


function buildFilename(filters) {
  const today  = format(new Date(), 'yyyyMMdd');
  const start  = filters.start_date ? `_${filters.start_date}` : '';
  const end    = filters.end_date   ? `_to_${filters.end_date}` : '';
  return `Leave_Dashboard${start}${end}_exported_${today}.xlsx`;
}