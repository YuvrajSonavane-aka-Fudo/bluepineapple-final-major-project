// src/components/dashboard/DetailPanel.jsx
import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { fmt } from '../../utils/dateUtils';
import { fetchEmployeeCellDetails, fetchProjectCellDetails, fetchDayDetails } from '../../services/api';

function safeDate(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  try { return fmt(d); } catch { return null; }
}

const LEAVE_COLORS = {
  Paid: '#2563eb', Unpaid: '#93c5fd', WFH: '#06b6d4',
  'Half Day': '#0891b2', Sick: '#e85d26', Conference: '#db2777',
};

// Correct risk: based on actual on_leave / assigned ratio
function calcRisk(onLeave, assigned) {
  if (!assigned) return 'LOW';
  const pct = onLeave / assigned;
  return pct >= 0.6 ? 'HIGH' : pct >= 0.4 ? 'MEDIUM' : 'LOW';
}

const RISK_COLOR = { HIGH: '#dc2626', MEDIUM: '#d97706', LOW: '#16a34a' };
const RISK_BG    = { HIGH: '#fef2f2', MEDIUM: '#fffbeb', LOW: '#f0fdf4' };
const PANEL_W    = 320;
const DAY_W      = 560;

export default function DetailPanel({ context, onClose, filters }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const projectIdsKey    = JSON.stringify(filters?.project_ids   || []);
  const leaveStatusesKey = JSON.stringify(filters?.leave_statuses || []);
  const leaveTypesKey    = JSON.stringify(filters?.leave_types   || []);

  useEffect(() => {
    if (!context) return;
    setData(null); setError(''); setLoading(true);
    const { type, emp, project, date, startDate, endDate } = context;
    const dateStr = safeDate(date), startStr = safeDate(startDate), endStr = safeDate(endDate);
    if (!dateStr || !startStr || !endStr) { setError('Invalid date.'); setLoading(false); return; }

    const base = { start_date: startStr, end_date: endStr, project_ids: JSON.parse(projectIdsKey), leave_statuses: JSON.parse(leaveStatusesKey) };
    let call;
    if (type === 'employee')     call = fetchEmployeeCellDetails({ ...base, user_id: emp.user_id, date: dateStr });
    else if (type === 'project') call = fetchProjectCellDetails({ ...base, project_id: project.project_id, date: dateStr });
    else                         call = fetchDayDetails({ ...base, date: dateStr, leave_types: JSON.parse(leaveTypesKey) });

    call.then(setData).catch(e => setError(e?.message || 'Failed to load.')).finally(() => setLoading(false));
  }, [context, projectIdsKey, leaveStatusesKey, leaveTypesKey]);

  if (!context) return null;

  const { type, date, anchorX, anchorY, anchorYTop, preferAbove  } = context;
  const parsedDate = date instanceof Date ? date : (date ? new Date(date + 'T12:00:00') : null);
  const dateLabel  = parsedDate ? format(parsedDate, 'MMM d, yyyy') : '';
  const isDay      = type === 'day';
  const W          = isDay ? DAY_W : PANEL_W;
  const H_EST      = isDay ? 400 : 320;
  const vw = window.innerWidth, vh = window.innerHeight, GAP = 10;

  // Show below by default, flip above only if no room below
  let left = Math.max(GAP, Math.min(vw - W - GAP, (anchorX ?? vw / 2) - W / 2));
  let top = preferAbove
    ? (anchorYTop ?? 0) - H_EST - GAP   // above the cell
    : (anchorY ?? 0) + GAP;             // below the cell
  top = Math.max(60, Math.min(vh - H_EST - GAP, top));
  
  const titles = {
    employee: `${context.emp?.full_name || 'Employee'} · ${dateLabel}`,
    project:  `${context.project?.project_name || 'Project'} · ${dateLabel}`,
    day:      `Day Overview · ${dateLabel}`,
  };

  return (
    <>
      {/* Transparent click-away — no blur, no dim */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />

      <div onClick={e => e.stopPropagation()} style={{ ...s.panel, width: W, left, top }}>
        <div style={s.header}>
          <span style={s.title}>{titles[type]}</span>
          <button onClick={onClose} style={s.close}>✕</button>
        </div>
        <div style={{ ...s.body, maxHeight: H_EST - 44 }}>
          {loading && <div style={s.center}><Spinner /></div>}
          {error   && <div style={s.err}>{error}</div>}
          {!loading && !error && data && (
            <>
              {type === 'employee' && <EmployeeView data={data} />}
              {type === 'project'  && <ProjectView  data={data} />}
              {type === 'day'      && <DayView      data={data} />}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Employee view ─────────────────────────────────────────────────────────────
function EmployeeView({ data }) {
  const projects = data?.projects || [];
  return (
    <>
      <Label>IMPACTED PROJECTS ({projects.length})</Label>
      {projects.length === 0 ? <Empty>No project impact.</Empty> : projects.map(p => (
        <Row key={p.project_id}>
          <div style={s.rowMain}>
            <div style={s.rowName}>{p.project_name}</div>
            {p.leave_type && (
              <div style={s.rowSub}>
                <Dot color={LEAVE_COLORS[p.leave_type] || '#9aa0ad'} />
                {p.leave_type}{p.is_half_day && p.half_day_session ? ` · ${p.half_day_session}` : ''}
              </div>
            )}
          </div>
          <Avail s={p.availability} />
        </Row>
      ))}
    </>
  );
}

// ── Project view ──────────────────────────────────────────────────────────────
function ProjectView({ data }) {
  const emps    = data?.employees || [];
  const onLeave = emps.filter(e => e?.availability !== 'AVAILABLE');
  const risk    = calcRisk(onLeave.length, emps.length);
  return (
    <>
      <div style={s.statsRow}>
        <Mini label="Total"     val={emps.length} />
        <Mini label="On Leave"  val={onLeave.length} c="#dc2626" />
        <Mini label="Available" val={emps.length - onLeave.length} c="#16a34a" />
        <RiskTag risk={risk} />
      </div>
      <Label>ON LEAVE ({onLeave.length})</Label>
      {onLeave.length === 0 ? <Empty>All available.</Empty> : onLeave.map(emp => (
        <Row key={emp.user_id}>
          <div style={s.rowMain}>
            <div style={s.rowName}>{emp.full_name}</div>
            <div style={s.rowSub}>
              <span style={{ color: '#b0b6c3' }}>{emp.role}</span>
              {emp.leave_type && <><Dot color={LEAVE_COLORS[emp.leave_type] || '#9aa0ad'} />{emp.leave_type}</>}
              {emp.is_half_day && emp.half_day_session ? ` · ${emp.half_day_session}` : ''}
            </div>
          </div>
          <Avail s={emp.availability} />
        </Row>
      ))}
    </>
  );
}

// ── Day view — side by side ───────────────────────────────────────────────────
function DayView({ data }) {
  const emps     = data?.employees_on_leave || [];
  const projects = (data?.projects || []).filter(p => p.employees_on_leave > 0);

  return (
    <div style={s.dayGrid}>
      {/* Left: employees */}
      <div style={s.dayCol}>
        <Label>ON LEAVE ({emps.length})</Label>
        {emps.length === 0 ? <Empty>None.</Empty> : emps.map(emp => (
          <Row key={emp.user_id}>
            <div style={s.rowMain}>
              <div style={s.rowName}>{emp.full_name}</div>
              <div style={s.rowSub}>
                {emp.leave_type && <><Dot color={LEAVE_COLORS[emp.leave_type] || '#9aa0ad'} />{emp.leave_type}</>}
                {emp.is_half_day && emp.half_day_session ? ` · ${emp.half_day_session}` : ''}
              </div>
            </div>
          </Row>
        ))}
      </div>

      <div style={s.vDivider} />

      {/* Right: projects */}
      <div style={s.dayCol}>
        <Label>AFFECTED ({projects.length})</Label>
        {projects.length === 0 ? <Empty>None.</Empty> : projects.map(p => {
          // Recalculate risk correctly from raw numbers
          const risk = calcRisk(p.employees_on_leave, p.assigned_employees);
          return (
            <Row key={p.project_id}>
              <div style={s.rowMain}>
                <div style={s.rowName}>{p.project_name}</div>
                <div style={s.rowSub}>{p.employees_on_leave}/{p.assigned_employees} on leave</div>
              </div>
              <RiskTag risk={risk} />
            </Row>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared atoms ──────────────────────────────────────────────────────────────
const AVAIL_LABEL = { NOT_AVAILABLE: 'Unavailable', PARTIALLY_AVAILABLE: 'Partial', ON_LEAVE: 'On Leave', AVAILABLE: 'Available' };
const AVAIL_COLOR = { NOT_AVAILABLE: '#dc2626', PARTIALLY_AVAILABLE: '#d97706', ON_LEAVE: '#dc2626', AVAILABLE: '#16a34a' };

function Avail({ s: status }) {
  return <span style={{ fontSize: 10, fontWeight: 600, color: AVAIL_COLOR[status] || '#9aa0ad', whiteSpace: 'nowrap', flexShrink: 0 }}>{AVAIL_LABEL[status] || status}</span>;
}
function Dot({ color }) {
  return <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: color, margin: '0 3px 0 2px', verticalAlign: 'middle', flexShrink: 0 }} />;
}
function Label({ children }) {
  return <p style={{ fontSize: 9, fontWeight: 700, color: '#b0b6c3', letterSpacing: '0.7px', textTransform: 'uppercase', margin: '8px 0 4px' }}>{children}</p>;
}
function Row({ children }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 6, background: '#f8f9fb', border: '1px solid #eef0f3', marginBottom: 3, gap: 6 }}>{children}</div>;
}
function Mini({ label, val, c = '#1a1f2e' }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: c, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 9, color: '#b0b6c3', fontWeight: 600, textTransform: 'uppercase', marginTop: 1 }}>{label}</div>
    </div>
  );
}
function RiskTag({ risk }) {
  return <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: RISK_BG[risk], color: RISK_COLOR[risk], flexShrink: 0, letterSpacing: '0.3px' }}>{risk}</span>;
}
function Empty({ children }) {
  return <p style={{ fontSize: 11, color: '#b0b6c3', padding: '4px 0' }}>{children}</p>;
}
function Spinner() {
  return <div style={{ width: 18, height: 18, border: '2px solid #e8eaed', borderTopColor: '#3b5bdb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  panel: {
    position: 'fixed', zIndex: 201,
    background: '#fff', borderRadius: 10,
    boxShadow: '0 8px 30px rgba(15,23,42,0.14), 0 2px 6px rgba(0,0,0,0.07)',
    border: '1px solid #e2e5ea',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    padding: '9px 12px 8px', borderBottom: '1px solid #f0f2f5',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexShrink: 0, background: '#fafbfc',
  },
  title: { fontSize: 12, fontWeight: 700, color: '#1a1f2e', flex: 1, paddingRight: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  close: { background: '#f0f2f5', border: 'none', borderRadius: 4, width: 20, height: 20, cursor: 'pointer', fontSize: 10, color: '#5a6272', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body: { overflowY: 'auto', padding: '2px 10px 10px' },
  center: { display: 'flex', justifyContent: 'center', padding: 16 },
  err: { padding: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', fontSize: 11, margin: '6px 0' },
  statsRow: { display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0 4px' },
  rowMain: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 12, fontWeight: 600, color: '#1a1f2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  rowSub: { fontSize: 10, color: '#9aa0ad', marginTop: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' },
  dayGrid: { display: 'flex', gap: 0 },
  dayCol: { flex: 1, minWidth: 0, overflowY: 'auto' },
  vDivider: { width: 1, background: '#f0f2f5', margin: '4px 8px', flexShrink: 0 },
};