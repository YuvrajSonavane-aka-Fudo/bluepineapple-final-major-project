// src/components/dashboard/ExportToExcel.jsx
//
// Single-sheet export that mirrors the dashboard layout:
//   Row 1  : Export metadata (title + exported timestamp)
//   Row 2  : Active filters summary (date range, leave types, projects, dept/team)
//   Row 3  : Section header — EMPLOYEE LEAVE VIEW
//   Row 4  : Column headers (frozen name col + date cols)
//   Row 5+ : One row per employee, one col per date (coloured by leave type)
//   Next   : Divider row
//   Next   : Section header — PROJECT RISK VIEW
//   Next   : Column headers
//   Next   : One row per project, one col per date (coloured by risk level)
//
// Requires: npm install xlsx

import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';

// ── Colour palette (ARGB hex, no #) ──────────────────────────────────────────
const C = {
  // Leave types
  PAID:        'FF2563EB',
  SICK:        'FFEF4444',
  WFH:         'FF59be68',
  HALF_DAY:    'FF8B5CF6',
  CONFERENCE:  'FFF59E0B',
  UNPAID:      'FF93C5FD',

  // Risk levels (background)
  RISK_LOW:    'FFC6EFCE',
  RISK_MED:    'FFFFEB9C',
  RISK_HIGH:   'FFFFC7CE',
  RISK_NONE:   'FFF8F9FB',

  // Structure
  SECTION_BG:  'FF1F3864',
  SECTION_FG:  'FFFFFFFF',
  HEADER_BG:   'FFE8EAED',
  HEADER_FG:   'FF1A1F2E',
  DIVIDER_BG:  'FFC8CDD6',
  META_BG:     'FFF0F2F5',
  FILTER_BG:   'FFFFFBEB',   // warm yellow tint
  FILTER_FG:   'FF92400E',   // amber-brown text
  FILTER_BORDER: 'FFFDE68A',
  WHITE:       'FFFFFFFF',
  FROZEN_BG:   'FFFFFFFF',
  FROZEN_FG:   'FF1A1F2E',
  LEAVE_FG:    'FFFFFFFF',
  AVAIL_FG:    'FF9AA0AD',
  AVAIL_BG:    'FFFFFFFF',
  WEEKEND_BG:  'FFF3F4F6',
  WEEKEND_FG:  'FF9AA0AD',
};

const LEAVE_COLOR = {
  'Paid':       C.PAID,
  'Sick':       C.SICK,
  'WFH':        C.WFH,
  'Half Day':   C.HALF_DAY,
  'Conference': C.CONFERENCE,
  'Unpaid':     C.UNPAID,
};

// All known leave types — used to detect "all selected" vs a subset
const ALL_LEAVE_TYPES = ['Paid', 'Sick', 'WFH', 'Half Day', 'Conference', 'Unpaid'];

function leaveColor(leaveType) {
  return LEAVE_COLOR[leaveType] || C.PAID;
}

function riskColor(riskLevel) {
  if (riskLevel === 'HIGH')   return C.RISK_HIGH;
  if (riskLevel === 'MEDIUM') return C.RISK_MED;
  if (riskLevel === 'LOW')    return C.RISK_LOW;
  return C.RISK_NONE;
}

// ── Style builders ────────────────────────────────────────────────────────────
function font(bold = false, color = 'FF000000', sz = 10, name = 'Arial') {
  return { name, sz, bold, color: { rgb: color } };
}

function fill(rgb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { rgb } };
}

function border(color = 'FFD1D5DB') {
  const s = { style: 'thin', color: { rgb: color } };
  return { top: s, bottom: s, left: s, right: s };
}

function alignment(h = 'center', v = 'center', wrap = false) {
  return { horizontal: h, vertical: v, wrapText: wrap };
}

function cell(v, fnt, fll, aln, brd) {
  const c = { v, t: typeof v === 'number' ? 'n' : 's' };
  if (fnt) c.s = { ...(c.s || {}), font: fnt };
  if (fll) c.s = { ...(c.s || {}), fill: fll };
  if (aln) c.s = { ...(c.s || {}), alignment: aln };
  if (brd) c.s = { ...(c.s || {}), border: brd };
  return c;
}

// ── Build human-readable filter summary ───────────────────────────────────────
// Handles both camelCase (leaveTypes) and snake_case (leave_types) filter keys.
function buildFilterSummary(filters) {
  const parts = [];

  // Date range
  if (filters.start_date || filters.end_date) {
    parts.push(`  ${filters.start_date || '—'}  →  ${filters.end_date || '—'}`);
  }

  // Leave types — support both key conventions
  const leaveTypes = filters.leave_types ?? filters.leaveTypes ?? [];
  if (leaveTypes.length === 0 || leaveTypes.length >= ALL_LEAVE_TYPES.length) {
    parts.push('🏷  Leave Types: All');
  } else {
    parts.push(`🏷  Leave Types: ${leaveTypes.join(', ')}`);
  }

  // Projects
  if (filters.project_ids?.length) {
    parts.push(`📁  Projects: ${filters.project_ids.length} selected`);
  } else {
    parts.push('📁  Projects: All');
  }

  // Optional: department / team
  if (filters.department) parts.push(`🏢  Dept: ${filters.department}`);
  if (filters.team)       parts.push(`👥  Team: ${filters.team}`);

  return parts.join('     ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export function
// ─────────────────────────────────────────────────────────────────────────────
export function exportDashboardToExcel({ empData, projData, dateStrip, filters = {} }) {
  const dates     = dateStrip || [];
  const employees = empData?.employees || [];
  const projects  = projData?.projects  || [];

  // ── Filter: only keep employees with at least one leave cell ──────────────
  const activeEmployees = employees.filter(emp =>
    Object.values(emp.cells || {}).some(c => c !== null)
  );

  // ── Filter: only keep projects with at least one MEDIUM/HIGH risk cell ────
  const activeProjects = projects.filter(proj =>
    Object.values(proj.cells || {}).some(
      c => c && c.risk_level && c.risk_level !== 'LOW'
    )
  );

  // ── Filter: only keep dates that have leave or an impacted project ─────────
  const activeDates = dates.filter(d => {
    const hasLeave  = activeEmployees.some(emp => emp.cells?.[d.date] != null);
    const hasImpact = activeProjects.some(
      proj => proj.cells?.[d.date] && proj.cells[d.date].risk_level !== 'LOW'
    );
    return hasLeave || hasImpact;
  });

  const DATE_START_COL = 3;
  const TOTAL_COLS     = DATE_START_COL + activeDates.length;

  const rows = [];

  // ── Row 0: Metadata banner ─────────────────────────────────────────────────
  const metaText = `Leave Impact Dashboard     |     Exported: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
  const metaRow  = Array(TOTAL_COLS).fill(null).map(() =>
    cell('', font(false, C.HEADER_FG, 9), fill(C.META_BG), alignment('left'), null)
  );
  metaRow[0] = cell(metaText, font(true, C.HEADER_FG, 10), fill(C.META_BG), alignment('left'), null);
  rows.push(metaRow);

  // ── Row 1: Active filters summary ─────────────────────────────────────────
  const filterSummary = buildFilterSummary(filters);
  const filterRow = Array(TOTAL_COLS).fill(null).map(() =>
    cell('', font(false, C.FILTER_FG, 9), fill(C.FILTER_BG), alignment('left'), border(C.FILTER_BORDER))
  );
  filterRow[0] = cell(
    filterSummary,
    font(false, C.FILTER_FG, 9),
    fill(C.FILTER_BG),
    alignment('left', 'center', false),
    border(C.FILTER_BORDER)
  );
  rows.push(filterRow);

  // ── Helper: push a section header row ─────────────────────────────────────
  function pushSectionHeader(label) {
    const r = Array(TOTAL_COLS).fill(null).map(() =>
      cell('', font(true, C.SECTION_FG, 10), fill(C.SECTION_BG), alignment('left'), null)
    );
    r[0] = cell(label, font(true, C.SECTION_FG, 10), fill(C.SECTION_BG), alignment('left'), null);
    rows.push(r);
  }

  // ── Helper: push the date header row ──────────────────────────────────────
  function pushDateHeader(col1Label, col2Label) {
    const r = [];
    r.push(cell('Name',    font(true, C.HEADER_FG, 10), fill(C.HEADER_BG), alignment('left'),   border()));
    r.push(cell(col1Label, font(true, C.HEADER_FG, 10), fill(C.HEADER_BG), alignment('center'), border()));
    r.push(cell(col2Label, font(true, C.HEADER_FG, 10), fill(C.HEADER_BG), alignment('center'), border()));
    for (const d of activeDates) {
      const parsed    = parseISO(d.date);
      const dayLbl    = format(parsed, 'EEE').toUpperCase();
      const dateLbl   = format(parsed, 'dd/MM');
      const isWeekend = d.is_weekend;
      const isHoliday = d.is_public_holiday;
      const bgColor   = isWeekend ? C.WEEKEND_BG : isHoliday ? 'FFFEFCE8' : C.HEADER_BG;
      const fgColor   = isWeekend ? C.WEEKEND_FG : C.HEADER_FG;
      r.push(cell(
        `${dayLbl}\n${dateLbl}`,
        font(true, fgColor, 9),
        fill(bgColor),
        alignment('center', 'center', true),
        border()
      ));
    }
    rows.push(r);
  }

  // ── Helper: push a divider row ─────────────────────────────────────────────
  function pushDivider() {
    rows.push(
      Array(TOTAL_COLS).fill(null).map(() =>
        cell('', font(), fill(C.DIVIDER_BG), alignment(), null)
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1 — EMPLOYEE LEAVE VIEW
  // ─────────────────────────────────────────────────────────────────────────
  pushSectionHeader('▸  EMPLOYEE LEAVE VIEW');
  pushDateHeader('Role', 'Leave Count');

  for (const emp of activeEmployees) {
    const leaveCount = Object.values(emp.cells || {}).filter(c => c !== null).length;
    const r = [];

    r.push(cell(
      `${emp.full_name}  #${String(emp.user_id).padStart(4, '0')}`,
      font(true, C.FROZEN_FG, 10), fill(C.FROZEN_BG), alignment('left', 'center'), border()
    ));
    r.push(cell(
      emp.role || '',
      font(false, C.FROZEN_FG, 9), fill(C.FROZEN_BG), alignment('center', 'center'), border()
    ));
    r.push(cell(
      leaveCount,
      font(true, 'FF4338CA', 9), fill('FFEEF2FF'), alignment('center', 'center'), border('FFC7D2FE')
    ));

    for (const d of activeDates) {
      const c = emp.cells?.[d.date];
      if (!c) {
        r.push(cell(
          '',
          font(false, C.AVAIL_FG, 9),
          fill(d.is_weekend ? C.WEEKEND_BG : C.AVAIL_BG),
          alignment('center'),
          null
        ));
      } else {
        const lColor = leaveColor(c.leave_type);
        let label = c.leave_type || '';
        if (c.is_half_day) label += c.half_day_session === 'First Half' ? ' ½AM' : ' ½PM';
        if (c.leave_status === 'Pending')  label += ' P';
        if (c.leave_status === 'Rejected') label += ' R';
        r.push(cell(
          label,
          font(true, C.LEAVE_FG, 8), fill(lColor), alignment('center', 'center', true), border(lColor)
        ));
      }
    }
    rows.push(r);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2 — PROJECT RISK VIEW
  // ─────────────────────────────────────────────────────────────────────────
  pushDivider();
  pushSectionHeader('▸  PROJECT RISK VIEW');
  pushDateHeader('Req. Workforce', 'Assigned');

  for (const proj of activeProjects) {
    const r = [];

    r.push(cell(
      proj.project_name,
      font(true, C.FROZEN_FG, 10), fill(C.FROZEN_BG), alignment('left', 'center'), border()
    ));
    r.push(cell(
      proj.required_workforce ?? '',
      font(false, C.FROZEN_FG, 9), fill(C.FROZEN_BG), alignment('center', 'center'), border()
    ));
    const firstCell = Object.values(proj.cells || {}).find(Boolean);
    r.push(cell(
      firstCell?.assigned_employees ?? '',
      font(false, C.FROZEN_FG, 9), fill(C.FROZEN_BG), alignment('center', 'center'), border()
    ));

    for (const d of activeDates) {
      const c = proj.cells?.[d.date];

      if (!c || !c.risk_level || c.risk_level === 'LOW') {
        r.push(cell('', font(), fill(C.AVAIL_BG), alignment('center'), null));
        continue;
      }

      const bgColor  = riskColor(c.risk_level);
      const avail    = c.available_workforce ?? 0;
      const assigned = c.assigned_employees  ?? 0;
      let label = `${avail}/${assigned}`;
      if (c.risk_level === 'HIGH')   label += '\n HIGH';
      if (c.risk_level === 'MEDIUM') label += '\n MED';

      const fgColor = c.risk_level === 'HIGH'   ? 'FF9C0006'
                    : c.risk_level === 'MEDIUM'  ? 'FF9C6500'
                    : 'FF276221';

      r.push(cell(
        label,
        font(true, fgColor, 9), fill(bgColor), alignment('center', 'center', true), border(bgColor)
      ));
    }
    rows.push(r);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Build worksheet
  // ─────────────────────────────────────────────────────────────────────────
  const ws      = {};
  const numRows = rows.length;
  const numCols = TOTAL_COLS;

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      ws[cellRef]   = rows[r]?.[c] || { v: '', t: 's' };
    }
  }

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: numRows - 1, c: numCols - 1 } });

  // Merge both header rows across all columns
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },   // meta row
    { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },   // filter row
  ];

  ws['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 10 },
    ...activeDates.map(() => ({ wch: 9 })),
  ];

  ws['!rows'] = rows.map((_, i) => {
    if (i === 0) return { hpt: 20 };   // meta
    if (i === 1) return { hpt: 22 };   // filters
    return { hpt: 30 };
  });

  // Freeze panes — ySplit bumped to 3 to keep meta + filter rows always visible
  ws['!freeze'] = { xSplit: DATE_START_COL, ySplit: 3, topLeftCell: 'D4', activeCell: 'D4', sqref: 'D4' };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leave Dashboard');

  const filename = buildFilename(filters);
  const wbout    = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
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

function buildFilename(filters) {
  const today = format(new Date(), 'yyyyMMdd');
  const start = filters.start_date ? `_${filters.start_date}` : '';
  const end   = filters.end_date   ? `_to_${filters.end_date}` : '';
  return `Leave_Dashboard${start}${end}_${today}.xlsx`;
}