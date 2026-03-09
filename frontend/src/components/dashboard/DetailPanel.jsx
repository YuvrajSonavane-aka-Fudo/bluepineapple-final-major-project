// src/components/dashboard/DetailPanel.jsx
// Matches mock designs for all 3 drill-down panels:
//   Image 8 — Employee cell (Jane Doe style: big avatar, leave details, impacted projects)
//   Image 7 — Project cell (stat cards, risk indicator banner, employee list)
//   Image 5/6 — Day details (daily overview stats, high-risk table, employees on leave cards)

import { useEffect, useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { fmt } from '../../utils/dateUtils';
import {
  fetchEmployeeCellDetails,
  fetchProjectCellDetails,
  fetchDayDetails,
} from '../../services/api';

// Safe date formatter — accepts Date objects or ISO strings
function safeDate(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10); // already "YYYY-MM-DD"
  try { return fmt(d); } catch { return null; }
}

const LEAVE_COLORS = {
  Paid: '#3b5bdb', Sick: '#e85d26', WFH: '#16a34a',
  'Half Day': '#0891b2', Conference: '#db2777', Unpaid: '#dc2626',
};
const STATUS_COLORS = { Approved: '#16a34a', Pending: '#d97706', Rejected: '#dc2626' };
const STATUS_BG     = { Approved: '#f0fdf4', Pending: '#fffbeb', Rejected: '#fef2f2' };
const STATUS_BORDER = { Approved: '#bbf7d0', Pending: '#fde68a', Rejected: '#fecaca' };
const RISK_COLOR    = { HIGH: '#dc2626', MEDIUM: '#d97706', LOW: '#16a34a' };
const RISK_BG       = { HIGH: '#fef2f2', MEDIUM: '#fffbeb', LOW: '#f0fdf4' };
const RISK_BORDER   = { HIGH: '#fecaca', MEDIUM: '#fde68a', LOW: '#bbf7d0' };
const AVAIL_COLORS  = {
  NOT_AVAILABLE: '#dc2626', PARTIALLY_AVAILABLE: '#d97706',
  ON_LEAVE: '#dc2626', AVAILABLE: '#16a34a',
};

const AVATAR_COLORS = ['#3b5bdb','#e85d26','#7c3aed','#0891b2','#16a34a','#dc2626','#db2777','#d97706'];

export default function DetailPanel({ context, onClose, filters }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Stabilise filter values as primitives so useEffect doesn't fire on every render
  const projectIdsKey   = JSON.stringify(filters?.project_ids   || []);
  const leaveStatusesKey = JSON.stringify(filters?.leave_statuses || []);
  const leaveTypesKey   = JSON.stringify(filters?.leave_types   || []);

  useEffect(() => {
    if (!context) return;
    setData(null); setError(''); setLoading(true);

    const { type, emp, project, date, startDate, endDate } = context;

    const projectIds    = JSON.parse(projectIdsKey);
    const leaveStatuses = JSON.parse(leaveStatusesKey);
    const leaveTypes    = JSON.parse(leaveTypesKey);

    const dateStr      = safeDate(date);
    const startDateStr = safeDate(startDate);
    const endDateStr   = safeDate(endDate);

    if (!dateStr || !startDateStr || !endDateStr) {
      setError('Invalid date in context. Please try again.');
      setLoading(false);
      return;
    }

    const base = {
      start_date:     startDateStr,
      end_date:       endDateStr,
      project_ids:    projectIds,
      leave_statuses: leaveStatuses,
    };

    let call;
    try {
      if (type === 'employee') {
        if (!emp?.user_id) {
          throw new Error('Employee data is missing. Please try clicking the cell again.');
        }
        call = fetchEmployeeCellDetails({ ...base, user_id: emp.user_id, date: dateStr });
      } else if (type === 'project') {
        if (!project?.project_id) {
          throw new Error('Project data is missing. Please try clicking the cell again.');
        }
        call = fetchProjectCellDetails({ ...base, project_id: project.project_id, date: dateStr });
      } else if (type === 'day') {
        call = fetchDayDetails({ ...base, date: dateStr, leave_types: leaveTypes });
      } else {
        throw new Error(`Unrecognised context type: ${type}`);
      }

      call
        .then(setData)
        .catch(e => setError(e?.response?.data?.error || e?.message || 'Failed to load details.'))
        .finally(() => setLoading(false));
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  }, [context, projectIdsKey, leaveStatusesKey, leaveTypesKey]);

  if (!context) return null;

  const { type, date } = context;
  const parsedDate = date instanceof Date ? date : (date ? new Date(date + 'T12:00:00') : null);
  const dateLabel = parsedDate ? format(parsedDate, 'EEEE, MMM d, yyyy') : '';
  const dayName   = parsedDate ? format(parsedDate, 'EEEE') : '';

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(30,45,90,0.35)',
        zIndex: 200, animation: 'fadeIn 150ms ease',
      }} />

      {/* Modal - matches mock: white, rounded, centered-ish, scrollable */}
      <div style={s.modal} className="slide-up">
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.calIcon}>
              <CalIcon />
            </div>
            <div>
              <h2 style={s.modalTitle}>{
                type === 'employee' && data?.employee ? `${format(parsedDate, 'MMM d, yyyy')}`
                : type === 'project' && data?.project ? `${data.project.project_name} — ${parsedDate ? format(parsedDate, 'MMM d, yyyy') : ''}`
                : dateLabel
              }</h2>
              {type === 'day' && (
                <div style={s.headerMeta}>
                  <span style={s.metaText}>{dayName}</span>
                  <span style={s.metaTag}>{
                    data?.date?.is_public_holiday ? (data.date.holiday_name || 'Public Holiday') :
                    data?.date?.is_weekend ? 'Weekend' :
                    'Regular Day'
                  }</span>
                </div>
              )}
              {type === 'project' && (
                <p style={s.modalSub}>Project Leave Impact Analysis</p>
              )}
              {type === 'employee' && (
                <div style={s.headerMeta}>
                  <span style={s.metaText}>{dayName}</span>
                  <span style={s.metaTag}>Employee Leave Details</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={s.body}>
          {loading && <div style={s.centered}><Spinner /></div>}
          {error && <div style={s.errorBox}>{error}</div>}
          {!loading && !error && data && (
            <>
              {type === 'employee' && <EmployeeDetail data={data} emp={context.emp} date={date} />}
              {type === 'project'  && <ProjectDetail  data={data} />}
              {type === 'day'      && <DayDetail      data={data} />}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button onClick={onClose} style={s.closeFooterBtn}>Close</button>
        </div>
      </div>
    </>
  );
}

// ── Employee detail (Image 8) ─────────────────────────────────────────────────
function EmployeeDetail({ data, emp, date }) {
  const employee = data?.employee;
  const leave = data?.projects?.find(p => p?.leave_type) || data?.projects?.[0];
  const avatarBg = AVATAR_COLORS[(employee?.user_id || 0) % AVATAR_COLORS.length];
  const initials = employee?.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || '?';
  const parsedDate = date instanceof Date ? date : (date ? new Date(date + 'T12:00:00') : null);

  if (!employee) {
    return <div style={{ padding: '20px', color: '#9aa0ad', fontSize: 13 }}>No employee data available.</div>;
  }

  return (
    <div>
      {/* Big avatar header like Image 8 */}
      <div style={s8.avatarSection}>
        <div style={{ ...s8.bigAvatar, background: avatarBg }}>
          {initials}
          <div style={s8.onlineDot} />
        </div>
        <div>
          <h3 style={s8.empName}>{employee.full_name}</h3>
          <div style={s8.empMeta}>
            <span>{emp?.role || 'Employee'}</span>
            <span style={s8.dot}>•</span>
            <span style={s8.empId}>#{String(employee.user_id).padStart(4,'0')}</span>
          </div>
          <div style={{ ...s8.dateBadge }}>
            <CalIconSm /> {parsedDate ? format(parsedDate, 'MMM d, yyyy') : ''}
          </div>
        </div>
      </div>

      {/* Leave details section */}
      {leave?.leave_type && (
        <>
          <SectionLabel>LEAVE DETAILS</SectionLabel>
          <div style={s8.detailTable}>
            <DetailRow label="Leave Type"    value={<b>{leave.leave_type}</b>} />
            <DetailRow label="Approval Status" value={
              <StatusBadge status="Approved" />
            } />
            <DetailRow label="Availability Status" value={
              <span style={{ fontWeight: 700, color: AVAIL_COLORS[leave.availability] || '#d97706' }}>
                {leave.availability?.replace(/_/g,' ')}
              </span>
            } />
            {leave.is_half_day && (
              <DetailRow label="Half-day Schedule" value={
                <div style={s8.halfDayPreview}>
                  {leave.half_day_session === 'First Half' ? (
                    <>
                      <div style={{ ...s8.halfCell, background: '#A7C7E7', clipPath: 'polygon(0 0,100% 0,0 100%)' }} />
                      <div style={s8.halfCell} />
                    </>
                  ) : (
                    <>
                      <div style={s8.halfCell} />
                      <div style={{ ...s8.halfCell, background: '#A7C7E7', clipPath: 'polygon(100% 0,100% 100%,0 100%)' }} />
                    </>
                  )}
                </div>
              } />
            )}
          </div>
        </>
      )}

      {/* Impacted projects */}
      <SectionLabel>IMPACTED PROJECTS</SectionLabel>
      {!data?.projects || data.projects.length === 0 ? (
        <p style={{ color: '#9aa0ad', fontSize: 13 }}>No project impact on this date.</p>
      ) : (
        <div style={s8.projectsList}>
          {data.projects.filter(p => p).map(p => (
            <div key={p?.project_id} style={s8.projectRow}>
              <div>
                <p style={s8.projectName}>{p?.project_name || 'Unknown'}</p>
                <div style={s8.projectMeta}>
                  {p?.leave_type && <><CalIconSm /> {p.leave_type}</>}
                  {p?.is_half_day && p?.half_day_session && <> • {p.half_day_session === 'First Half' ? 'First Half (AM)' : 'Second Half (PM)'}</>}
                  {!p?.leave_type && <><CalIconSm /> No leave</>}
                </div>
              </div>
              <span style={{ fontWeight: 700, fontSize: 12, color: AVAIL_COLORS[p?.availability] }}>
                {p?.availability?.replace(/_/g,' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Project detail (Image 7) ──────────────────────────────────────────────────
function ProjectDetail({ data }) {
  const onLeave = data?.employees?.filter(e => e?.availability !== 'AVAILABLE') || [];
  const totalAvail = data?.employees?.filter(e => e?.availability === 'AVAILABLE').length || 0;
  const totalAssigned = data?.employees?.length || 0;
  const totalOnLeave  = onLeave.length;
  const riskLevel = totalOnLeave / (totalAssigned || 1) > 0.5 ? 'HIGH' : totalOnLeave / (totalAssigned || 1) > 0.25 ? 'MEDIUM' : 'LOW';

  return (
    <div>
      {/* 3 stat cards like Image 7 */}
      <div style={s7.statsRow}>
        <StatCard label="ASSIGNED EMPLOYEES" value={totalAssigned} />
        <StatCard label="EMPLOYEES ON LEAVE"  value={totalOnLeave} valueColor="#dc2626" />
        <StatCard label="AVAILABLE WORKFORCE" value={totalAvail}   valueColor="#3b5bdb" />
      </div>

      {/* Risk indicator banner like Image 7 */}
      <div style={s7.riskSection}>
        <p style={s7.riskLabel}>RISK INDICATOR</p>
        <div style={{
          ...s7.riskBanner,
          background: RISK_BG[riskLevel], border: `1px solid ${RISK_BORDER[riskLevel]}`,
        }}>
          <div style={{ ...s7.riskIcon, color: RISK_COLOR[riskLevel] }}>
            <WarningIcon />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 14, color: RISK_COLOR[riskLevel] }}>{riskLevel} RISK</p>
            <p style={{ fontSize: 12, color: '#5a6272', marginTop: 2 }}>
              {Math.round((totalOnLeave / totalAssigned) * 100)}% of the core team is unavailable.
              {riskLevel === 'HIGH' ? ' Timeline may be affected.' : ' Monitor closely.'}
            </p>
          </div>
        </div>
      </div>

      {/* Employees on leave list like Image 7 */}
      <div style={s7.empSection}>
        <div style={s7.empHeader}>
          <h4 style={s7.empTitle}>Employees on Leave</h4>
          {onLeave.length > 0 && <span style={s7.membersBadge}>{onLeave.length} Members</span>}
        </div>
        {onLeave.length === 0 ? (
          <p style={{ color: '#9aa0ad', fontSize: 13 }}>All employees available.</p>
        ) : (
          <div style={s7.empList}>
            {onLeave.filter(e => e).map((emp, i) => {
              const initials = emp?.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || '?';
              const bg = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <div key={emp?.user_id} style={s7.empRow}>
                  <div style={{ ...s7.empAvatar, background: bg }}>{initials}</div>
                  <div style={s7.empInfo}>
                    <p style={s7.empName}>{emp?.full_name}</p>
                    <p style={s7.empRole}>{emp?.role}</p>
                  </div>
                  <div style={s7.empRight}>
                    <span style={{ fontSize: 12, color: '#5a6272' }}>
                      {emp?.availability === 'ON_LEAVE' ? 'On Leave' : 'Partially Available'}
                    </span>
                    {/* Leave type color block */}
                    {emp?.leave_type && (
                      <div style={{
                        width: 20, height: 20, borderRadius: 4,
                        background: emp?.is_half_day
                          ? 'transparent'
                          : (LEAVE_COLORS[emp?.leave_type] || '#A7C7E7'),
                        border: '1px solid #e8eaed',
                        overflow: 'hidden', position: 'relative',
                        ...(emp?.is_half_day ? {} : {}),
                      }}>
                        {emp?.is_half_day && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: LEAVE_COLORS[emp?.leave_type] || '#A7C7E7',
                            clipPath: emp?.half_day_session === 'Second Half'
                              ? 'polygon(100% 0,100% 100%,0 100%)'
                              : 'polygon(0 0,100% 0,0 100%)',
                          }} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Day detail (Images 5 & 6) ─────────────────────────────────────────────────
function DayDetail({ data }) {
  const totalAssigned = (data?.projects || []).reduce((s, p) => s + (p?.assigned_employees || 0), 0);
  const totalAvail    = (data?.projects || []).reduce((s, p) => s + (p?.available_workforce || 0), 0);
  const avgAvail      = totalAssigned > 0 ? Math.round((totalAvail / totalAssigned) * 100) : 100;

  const LEAVE_TYPE_GROUPS = {};
  (data?.employees_on_leave || []).forEach(emp => {
    if (!emp) return;
    const lt = emp?.leave_type || 'Other';
    if (!LEAVE_TYPE_GROUPS[lt]) LEAVE_TYPE_GROUPS[lt] = [];
    LEAVE_TYPE_GROUPS[lt].push(emp);
  });

  return (
    <div>
      {/* Daily Overview — 3 stat cards (Image 6) */}
      <div style={s5.overviewHeader}>
        <TrendIcon /> <h4 style={s5.overviewTitle}>Daily Overview</h4>
      </div>
      <div style={s5.statsRow}>
        <StatCard label="EMPLOYEES ON LEAVE"       value={data?.summary?.total_employees_on_leave || 0} />
        <StatCard label="PROJECTS AFFECTED"        value={String(data?.summary?.total_projects_affected || 0).padStart(2,'0')} />
        <StatCard label="AVG. WORKFORCE AVAILABILITY" value={`${avgAvail}%`} />
      </div>

      {/* High-Risk Projects table (Image 6) */}
      <div style={s5.tableSection}>
        <div style={s5.tableHeader}>
          <WarningIcon color="#dc2626" /> <h4 style={s5.tableTitle}>High-Risk Projects</h4>
        </div>
        <div style={s5.table}>
          {/* Table header */}
          <div style={{ ...s5.tableRow, background: '#f8f9fb' }}>
            {['PROJECT NAME','REQUIRED','ASSIGNED','ON LEAVE','AVAILABLE','RISK LEVEL'].map(h => (
              <span key={h} style={s5.th}>{h}</span>
            ))}
          </div>
          {data?.projects?.filter(p => p?.employees_on_leave > 0).length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9aa0ad', fontSize: 13 }}>
              No projects affected today.
            </div>
          ) : (
            data?.projects?.filter(p => p?.employees_on_leave > 0).map(proj => {
              const pct = Math.round(((proj?.available_workforce || 0) / (proj?.assigned_employees || 1)) * 100);
              return (
                <div key={proj?.project_id} style={s5.tableRow}>
                  <span style={s5.td}>{proj?.project_name || 'Unknown'}</span>
                  <span style={s5.td}>{proj?.required_workforce}</span>
                  <span style={s5.td}>{proj?.assigned_employees}</span>
                  <span style={{ ...s5.td, color: '#dc2626', fontWeight: 700 }}>{proj?.employees_on_leave}</span>
                  <span style={s5.td}>{pct}%</span>
                  <span style={s5.td}>
                    <RiskBadge level={proj?.risk_level} />
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* All Employees on Leave — grouped by type (Image 5) */}
      {(data?.employees_on_leave?.length || 0) > 0 && (
        <div style={s5.leaveSection}>
          <div style={s5.leaveSectionHeader}>
            <PeopleIcon /> <h4 style={s5.tableTitle}>All Employees on Leave</h4>
          </div>
          {Object.entries(LEAVE_TYPE_GROUPS).map(([leaveType, emps]) => (
            <div key={leaveType}>
              <div style={s5.leaveTypeHeader}>
                <WarningIcon color={LEAVE_COLORS[leaveType] || '#e85d26'} />
                <span style={{ ...s5.leaveTypeLabel, color: LEAVE_COLORS[leaveType] || '#e85d26' }}>
                  {leaveType.toUpperCase()} ({emps.length})
                </span>
              </div>
              <div style={s5.empCardGrid}>
                {emps.filter(e => e).map((emp, i) => {
                  const initials = emp?.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || '?';
                  const bg = AVATAR_COLORS[i % AVATAR_COLORS.length];
                  return (
                    <div key={emp?.user_id} style={s5.empCard}>
                      <div style={{ ...s5.empCardAvatar, background: bg }}>{initials}</div>
                      <div style={s5.empCardInfo}>
                        <p style={s5.empCardName}>{emp?.full_name}</p>
                        <p style={s5.empCardRole}>{emp?.role} • {leaveType}</p>
                        {emp?.projects?.length > 0 && (
                          <p style={s5.empCardProj}>
                            PROJECTS: {emp.projects.filter(p => p).map(p => p?.project_name || 'Unknown').join(', ')}
                          </p>
                        )}
                      </div>
                      <div style={s5.empCardRisk}>
                        {emp?.is_half_day
                          ? <div style={{ width: 20, height: 20, borderRadius: 3, overflow: 'hidden', position: 'relative', border: '1px solid #e8eaed' }}>
                              <div style={{ position: 'absolute', inset: 0, background: LEAVE_COLORS[leaveType], clipPath: 'polygon(100% 0,100% 100%,0 100%)' }} />
                            </div>
                          : <div style={{ width: 20, height: 20, borderRadius: 3, background: LEAVE_COLORS[leaveType] || '#e85d26' }} />
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared atoms ──────────────────────────────────────────────────────────────
function StatCard({ label, value, valueColor = '#1a1f2e' }) {
  return (
    <div style={{
      flex: 1, background: '#f8f9fb',
      border: '1px solid #e8eaed', borderRadius: 10,
      padding: '16px',
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#9aa0ad', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 800, color: valueColor, fontFamily: "'DM Mono', monospace", letterSpacing: '-1px' }}>
        {value}
      </p>
    </div>
  );
}

function SectionLabel({ children }) {
  return <p style={{ fontSize: 10, fontWeight: 700, color: '#9aa0ad', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '20px 0 10px' }}>{children}</p>;
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f2f5' }}>
      <span style={{ fontSize: 13, color: '#5a6272' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1a1f2e' }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, color: STATUS_COLORS[status], background: STATUS_BG[status], border: `1px solid ${STATUS_BORDER[status]}` }}>{status}</span>;
}

function RiskBadge({ level }) {
  const cfg = { HIGH: { bg: '#fef2f2', text: '#dc2626' }, MEDIUM: { bg: '#fffbeb', text: '#d97706' }, LOW: { bg: '#f0fdf4', text: '#16a34a' } };
  const c = cfg[level] || cfg.LOW;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: c.text, background: c.bg }}>
      {level !== 'LOW' && <WarningIcon color={c.text} size={10} />} {level}
    </span>
  );
}

function Spinner() {
  return <div style={{ width: 28, height: 28, border: '3px solid #e8eaed', borderTopColor: '#3b5bdb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

function CalIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b5bdb" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
}
function CalIconSm() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: 3 }}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
}
function WarningIcon({ color = '#dc2626', size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}
function TrendIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b5bdb" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
}
function PeopleIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b5bdb" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}

// Styles per panel type
const s = {
  modal: {
    position: 'fixed',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#ffffff',
    borderRadius: 20,
    width: '90%', maxWidth: 680,
    maxHeight: '88vh',
    boxShadow: '0 20px 60px rgba(30,45,90,0.2), 0 8px 24px rgba(0,0,0,0.08)',
    zIndex: 201,
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '24px 24px 20px',
    borderBottom: '1px solid #f0f2f5',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'flex-start', gap: 14 },
  calIcon: {
    width: 44, height: 44, background: '#eef2ff', borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  modalTitle: { fontSize: 20, fontWeight: 800, color: '#1a1f2e', letterSpacing: '-0.4px' },
  modalSub: { fontSize: 12, color: '#9aa0ad', marginTop: 2 },
  headerMeta: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 },
  metaText: { fontSize: 12, color: '#9aa0ad' },
  metaTag: {
    padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500,
    background: '#f0f2f5', color: '#5a6272', border: '1px solid #e8eaed',
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8,
    background: '#f0f2f5', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: 14, color: '#5a6272', flexShrink: 0,
  },
  body: { flex: 1, overflowY: 'auto', padding: '20px 24px' },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #f0f2f5',
    display: 'flex', justifyContent: 'flex-end',
    flexShrink: 0,
  },
  closeFooterBtn: {
    padding: '10px 24px', borderRadius: 8,
    background: '#1a1f2e', color: '#ffffff',
    border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 700,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  centered: { display: 'flex', justifyContent: 'center', padding: '40px 0' },
  errorBox: { padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 },
};

// Image 8 styles
const s8 = {
  avatarSection: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '4px 0 20px', borderBottom: '1px solid #f0f2f5',
  },
  bigAvatar: {
    width: 56, height: 56, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 800, color: '#fff', position: 'relative', flexShrink: 0,
  },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: '50%',
    background: '#16a34a', border: '2px solid #fff',
  },
  empName: { fontSize: 18, fontWeight: 800, color: '#1a1f2e', letterSpacing: '-0.3px' },
  empMeta: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 },
  dot: { color: '#d1d5db' },
  empId: { padding: '1px 7px', background: '#eef2ff', borderRadius: 99, fontSize: 11, fontWeight: 600, color: '#3b5bdb', border: '1px solid #c7d2fe' },
  dateBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    marginTop: 6, padding: '4px 10px',
    background: '#f0f2f5', borderRadius: 99,
    fontSize: 12, color: '#5a6272',
  },
  detailTable: { borderRadius: 10, border: '1px solid #e8eaed', overflow: 'hidden', marginBottom: 4, padding: '0 16px' },
  halfDayPreview: { display: 'flex', gap: 4 },
  halfCell: { width: 32, height: 24, borderRadius: 4, border: '1px solid #e8eaed', overflow: 'hidden', position: 'relative' },
  projectsList: { display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #e8eaed', borderRadius: 10, overflow: 'hidden' },
  projectRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', borderBottom: '1px solid #f0f2f5',
  },
  projectName: { fontSize: 14, fontWeight: 700, color: '#1a1f2e', marginBottom: 3 },
  projectMeta: { fontSize: 12, color: '#9aa0ad', display: 'flex', alignItems: 'center', gap: 2 },
};

// Image 7 styles
const s7 = {
  statsRow: { display: 'flex', gap: 10, marginBottom: 20 },
  riskSection: { marginBottom: 20 },
  riskLabel: { fontSize: 10, fontWeight: 700, color: '#9aa0ad', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 },
  riskBanner: {
    borderRadius: 10, padding: '14px 16px',
    display: 'flex', alignItems: 'flex-start', gap: 12,
  },
  riskIcon: { flexShrink: 0, marginTop: 1 },
  empSection: {},
  empHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  empTitle: { fontSize: 15, fontWeight: 700, color: '#1a1f2e' },
  membersBadge: { padding: '3px 10px', background: '#f0f2f5', borderRadius: 99, fontSize: 11, color: '#5a6272', fontWeight: 600 },
  empList: { display: 'flex', flexDirection: 'column', gap: 2 },
  empRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px', background: '#f8f9fb',
    borderRadius: 10, border: '1px solid #e8eaed',
  },
  empAvatar: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 },
  empInfo: { flex: 1 },
  empName: { fontSize: 13, fontWeight: 600, color: '#1a1f2e' },
  empRole: { fontSize: 11, color: '#9aa0ad', marginTop: 1 },
  empRight: { display: 'flex', alignItems: 'center', gap: 8 },
};

// Images 5/6 styles
const s5 = {
  overviewHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  overviewTitle: { fontSize: 15, fontWeight: 700, color: '#1a1f2e' },
  statsRow: { display: 'flex', gap: 10, marginBottom: 20 },
  tableSection: { marginBottom: 20 },
  tableHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  tableTitle: { fontSize: 15, fontWeight: 700, color: '#1a1f2e' },
  table: { border: '1px solid #e8eaed', borderRadius: 10, overflow: 'hidden' },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1.2fr',
    borderBottom: '1px solid #f0f2f5',
  },
  th: { padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#9aa0ad', letterSpacing: '0.5px', textTransform: 'uppercase' },
  td: { padding: '14px 12px', fontSize: 13, color: '#1a1f2e' },
  leaveSection: {},
  leaveSectionHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  leaveTypeHeader: { display: 'flex', alignItems: 'center', gap: 6, margin: '12px 0 8px' },
  leaveTypeLabel: { fontSize: 12, fontWeight: 700, letterSpacing: '0.3px' },
  empCardGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  empCard: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '12px', background: '#f8f9fb',
    border: '1px solid #e8eaed', borderRadius: 10,
  },
  empCardAvatar: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 },
  empCardInfo: { flex: 1, minWidth: 0 },
  empCardName: { fontSize: 13, fontWeight: 600, color: '#1a1f2e' },
  empCardRole: { fontSize: 11, color: '#9aa0ad', marginTop: 1 },
  empCardProj: { fontSize: 10, color: '#5a6272', marginTop: 4, fontWeight: 500 },
  empCardRisk: { flexShrink: 0 },
};