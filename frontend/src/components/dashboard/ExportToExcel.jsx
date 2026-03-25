import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';

// Column definitions 
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

// Main Export Function
export function exportDashboardToExcel({ empData, projData, dateStrip, filters = {} }) {
  const wb = XLSX.utils.book_new();

  const allRows = buildSingleSheet({
    empData,
    projData,
    dateStrip,
    filters
  });

  const ws = XLSX.utils.aoa_to_sheet(allRows);
  applySheetStyling(ws, allRows);

  XLSX.utils.book_append_sheet(wb, ws, 'Dashboard Report');

  const filename = buildFilename(filters);
  const wbout    = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob     = new Blob([wbout], { type: 'application/octet-stream' });

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Build Single Sheet (All in One)
function buildSingleSheet({ empData, projData, dateStrip, filters }) {
  const data = [];

  //  Filters Section 
  data.push(['FILTERS']);
  data.push(['Start Date', filters.start_date || '—']);
  data.push(['End Date', filters.end_date || '—']);
  data.push(['Projects', filters.project_ids?.join(', ') || 'All']);
  data.push(['Leave Types', filters.leave_types?.join(', ') || 'All']);
  data.push(['Leave Statuses', filters.leave_statuses?.join(', ') || 'All']);
  data.push(['Exported At', format(new Date(), 'dd/MM/yyyy HH:mm')]);
  data.push([]);

  //  Employee Table 
  data.push(['EMPLOYEE LEAVE DETAILS']);
  data.push(EMP_COLUMNS.map(c => c.header));

  const empRows = buildEmpRows(empData, projData, dateStrip);
  empRows.forEach(r => {
    data.push(EMP_COLUMNS.map(c => r[c.key] ?? ''));
  });

  data.push([]);

  // Project Table 
  data.push(['PROJECT RISK SUMMARY']);
  data.push(PROJ_COLUMNS.map(c => c.header));

  const projRows = buildProjRows(projData, dateStrip);
  projRows.forEach(r => {
    data.push(PROJ_COLUMNS.map(c => r[c.key] ?? ''));
  });

  return data;
}

// Employee Rows
function buildEmpRows(empData, projData, dateStrip) {
  const rows = [];

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

// Project Rows
function buildProjRows(projData, dateStrip) {
  const rows = [];

  for (const proj of (projData.projects || [])) {
    for (const d of dateStrip) {
      const cell = proj.cells?.[d.date];
      if (!cell) continue;

      const assigned  = cell.assigned_employees ?? 0;
      const onLeave   = cell.employees_on_leave ?? 0;
      const wfh       = cell.wfh_count ?? 0;
      const partial   = cell.partial_count ?? 0;
      const available = cell.available_workforce ?? (assigned - onLeave - partial);

      if (onLeave === 0 && wfh === 0 && partial === 0) continue;

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

// Helpers
function applySheetStyling(ws, wsData) {
  if (!wsData.length) return;

  const colWidths = wsData[0].map((_, ci) =>
    Math.min(50, Math.max(12, ...wsData.map(row => String(row[ci] ?? '').length + 2)))
  );

  ws['!cols'] = colWidths.map(w => ({ wch: w }));
}

function buildFilename(filters) {
  const today = format(new Date(), 'yyyyMMdd');
  const start = filters.start_date ? `_${filters.start_date}` : '';
  const end   = filters.end_date   ? `_to_${filters.end_date}` : '';
  return `Leave_Dashboard${start}${end}_exported_${today}.xlsx`;
}