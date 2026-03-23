// src/components/dashboard/DetailPanel.jsx
import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { format } from 'date-fns';
import { fmt } from '../../utils/dateUtils';
import { Box, Paper, Typography, IconButton, Chip, CircularProgress, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { fetchEmployeeCellDetails, fetchProjectCellDetails, fetchDayDetails } from '../../services/api';

function safeDate(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  try { return fmt(d); } catch { return null; }
}

const LEAVE_COLORS = { Paid: '#2563eb', Unpaid: '#93c5fd', WFH: '#59be68', 'Half Day': '#0891b2' };

function StatusIcon({ status }) {
  if (!status) return null;
  const size = { width: 14, height: 11, borderRadius: '2px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ml: '5px', flexShrink: 0 };
  const tooltips = { Approved: 'Approved', Pending: 'Pending approval', Rejected: 'Rejected' };
  let icon = null;
  if (status === 'Approved') icon = <Box component="span" sx={{ ...size, background: '#ECFDF5', border: '1px solid #86EFAC' }}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></Box>;
  if (status === 'Pending')  icon = <Box component="span" sx={{ ...size, background: 'transparent', border: '2px dashed #F59E0B' }} />;
  if (status === 'Rejected') icon = <Box component="span" sx={{ ...size, background: '#FEF2F2', border: '1px solid #FCA5A5' }}><svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg></Box>;
  if (!icon) return null;
  return (
    <Tooltip title={tooltips[status] || status} placement="top" arrow>
      <Box component="span" sx={{ display: 'inline-flex', cursor: 'default' }}>{icon}</Box>
    </Tooltip>
  );
}

const RISK_COLOR = { HIGH: '#dc2626', MEDIUM: '#d97706', LOW: '#16a34a' };
const RISK_BG    = { HIGH: '#fef2f2', MEDIUM: '#fffbeb', LOW: '#f0fdf4' };
const PANEL_W = 320;
const DAY_W   = 560;
const GAP     = 10;

export default function DetailPanel({ context, onClose, filters }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const projectIdsKey    = JSON.stringify(filters?.project_ids || []);
  const leaveStatusesKey = JSON.stringify(filters?.leave_statuses || []);
  const leaveTypesKey    = JSON.stringify(filters?.leave_types || []);

  useEffect(() => {
    if (!context) return;
    setData(null); setError(''); setLoading(true);
    const { type, emp, project, date, startDate, endDate } = context;
    const dateStr  = safeDate(date);
    const startStr = safeDate(startDate);
    const endStr   = safeDate(endDate);
    if (!dateStr || !startStr || !endStr) { setError('Invalid date.'); setLoading(false); return; }
    const base = { start_date: startStr, end_date: endStr, project_ids: JSON.parse(projectIdsKey), leave_statuses: JSON.parse(leaveStatusesKey) };
    let call;
    if (type === 'employee') call = fetchEmployeeCellDetails({ ...base, user_id: emp.user_id, date: dateStr });
    else if (type === 'project') call = fetchProjectCellDetails({ ...base, project_id: project.project_id, date: dateStr });
    else call = fetchDayDetails({ ...base, date: dateStr, leave_types: JSON.parse(leaveTypesKey) });
    call.then(setData).catch(e => setError(e?.message || 'Failed to load.')).finally(() => setLoading(false));
  }, [context, projectIdsKey, leaveStatusesKey, leaveTypesKey]);

  const [isMobileView, setIsMobileView] = useState(
    typeof window !== 'undefined' && window.innerWidth < 900
  );
  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 900);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useLayoutEffect(() => {
    if (!context || !panelRef.current) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const rect = panelRef.current.getBoundingClientRect();
    const modalH = rect.height, modalW = rect.width;

    if (vw < 900) {
      const left = Math.max(GAP, (vw - modalW) / 2);
      const top  = Math.max(GAP, (vh - modalH) / 2);
      setPos({ top, left });
      return;
    }

    const { anchorX, anchorY, preferAbove } = context;
    const left = Math.max(GAP, Math.min(vw - modalW - GAP, anchorX - modalW / 2));
    let top;
    if (preferAbove) {
      top = anchorY - modalH - GAP;
      if (top < GAP) top = anchorY + GAP;
    } else {
      top = anchorY + GAP;
      if (top + modalH > vh - GAP) top = anchorY - modalH - GAP;
    }
    top = Math.max(GAP, Math.min(vh - modalH - GAP, top));
    setPos({ top, left });
  }, [context, data]);

  if (!context) return null;
  const { type, date } = context;
  const parsedDate = date instanceof Date ? date : (date ? new Date(date + 'T12:00:00') : null);
  const dateLabel  = parsedDate ? format(parsedDate, 'MMM d, yyyy') : '';
  const baseW = type === 'day' ? DAY_W : PANEL_W;
  const W = isMobileView ? Math.min(baseW, window.innerWidth - GAP * 2) : baseW;
  const titles = {
    employee: `${context.emp?.full_name || 'Employee'} · ${dateLabel}`,
    project:  `${context.project?.project_name || 'Project'} · ${dateLabel}`,
    day:      `Day Overview · ${dateLabel}`,
  };

  const content = (
    <>
      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={18} sx={{ color: '#3b5bdb' }} /></Box>}
      {error && <Box sx={{ p: 1, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: 11 }}>{error}</Box>}
      {!loading && !error && data && (
        <>
          {type === 'employee' && <EmployeeView data={data} leaveStatus={context.leaveStatus} />}
          {type === 'project'  && <ProjectView  data={data} />}
          {type === 'day'      && <DayView      data={data} />}
        </>
      )}
    </>
  );

  // ── Mobile: bottom sheet ──
  if (isMobileView) {
    return (
      <>
        <Box onClick={onClose} sx={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.45)' }} />
        <Box
          onClick={e => e.stopPropagation()}
          sx={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            zIndex: 501,
            background: '#fff',
            borderRadius: '20px 20px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.22)',
            display: 'flex', flexDirection: 'column',
            maxHeight: '75vh',
            paddingBottom: 'env(safe-area-inset-bottom)',
            animation: 'slideUp 0.28s cubic-bezier(0.4,0,0.2,1)',
            '@keyframes slideUp': {
              from: { transform: 'translateY(100%)' },
              to:   { transform: 'translateY(0)' },
            },
          }}
        >
          <Box
            onClick={onClose}
            sx={{ display: 'flex', justifyContent: 'center', pt: 1.25, pb: 0.75, flexShrink: 0, cursor: 'pointer' }}
          >
            <Box sx={{ width: 40, height: 4, borderRadius: 99, background: '#dde0e6' }} />
          </Box>

          <Box sx={{
            px: 2, pb: 1.25, pt: 0.25, flexShrink: 0,
            borderBottom: '1px solid #f0f2f5',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          }}>
            <Box>
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: type === 'employee' ? '#eef2ff' : type === 'project' ? '#f0fdf4' : '#fefce8',
                border: `1px solid ${type === 'employee' ? '#c7d2fe' : type === 'project' ? '#86efac' : '#fde68a'}`,
                borderRadius: '4px', px: '6px', py: '2px', mb: 0.5,
              }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: type === 'employee' ? '#4338ca' : type === 'project' ? '#16a34a' : '#92400e', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {type}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1a1f2e', lineHeight: 1.3 }}>
                {titles[type]}
              </Typography>
            </Box>
            <Box component="button" onClick={onClose}
              sx={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0, ml: 1,
                background: '#f3f4f6', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0,
                '&:active': { background: '#e5e7eb' },
              }}>
              <CloseIcon sx={{ fontSize: 15, color: '#6b7280' }} />
            </Box>
          </Box>

          <Box sx={{ overflowY: 'auto', px: 2, pt: 1, pb: 3, flex: 1, minHeight: 0 }}>
            {content}
          </Box>
        </Box>
      </>
    );
  }

  // ── Desktop: floating popup ──
  return (
    <>
      <Box onClick={onClose} sx={{ position: 'fixed', inset: 0, zIndex: 200 }} />
      <Paper
        ref={panelRef}
        onClick={e => e.stopPropagation()}
        elevation={8}
        sx={{
          position: 'fixed', zIndex: 201,
          width: W, top: pos.top, left: pos.left,
          borderRadius: '10px', border: '1px solid #e2e5ea',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 40px)',
          visibility: pos.top === 0 && pos.left === 0 ? 'hidden' : 'visible',
        }}
      >
        <Box sx={{ px: 1.5, py: 1.1, borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1a1f2e' }}>{titles[type]}</Typography>
          <IconButton onClick={onClose} size="small" sx={{ width: 20, height: 20, background: '#f0f2f5', borderRadius: '4px', p: 0 }}>
            <CloseIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Box>
        <Box sx={{ overflowY: 'auto', p: '6px 10px 10px', flex: 1, minHeight: 0, maxHeight: 'calc(100vh - 120px)' }}>
          {content}
        </Box>
      </Paper>
    </>
  );
}

function Dot({ color }) {
  return <Box component="span" sx={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: color, mx: '3px' }} />;
}

function SectionLabel({ children }) {
  return <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#b0b6c3', letterSpacing: '0.7px', textTransform: 'uppercase', mt: 1, mb: 0.5 }}>{children}</Typography>;
}

function Row({ children }) {
  return <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1, py: 0.75, borderRadius: '6px', background: '#f8f9fb', border: '1px solid #eef0f3', mb: '3px' }}>{children}</Box>;
}

// WFH row — same base as Row but with left green accent border (V3 style)
function WFHRow({ children }) {
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      px: 1, py: 0.75, borderRadius: '6px',
      background: '#f8f9fb',
      border: '1px solid #eef0f3',
      borderLeft: '2px solid #1D9E75',
      mb: '3px',
    }}>
      {children}
    </Box>
  );
}

function Avail({ hasLeave, isHalfDay, leaveType }) {
  if (!hasLeave)           return <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#16a34a' }}>Available</Typography>;
  if (isHalfDay)           return <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#d97706' }}>Partial</Typography>;
  if (leaveType === 'WFH') return <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#059669' }}>WFH</Typography>;
  return                          <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#dc2626' }}>Unavailable</Typography>;
}

function RiskTag({ risk }) {
  return <Chip label={risk} size="small" sx={{ height: 18, fontSize: 9, fontWeight: 700, background: RISK_BG[risk], color: RISK_COLOR[risk], borderRadius: '4px', '& .MuiChip-label': { px: '6px', py: 0 } }} />;
}

function Mini({ label, val, c = '#1a1f2e' }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography sx={{ fontSize: 16, fontWeight: 800, color: c, fontFamily: "'DM Mono', monospace" }}>{val}</Typography>
      <Typography sx={{ fontSize: 9, color: '#b0b6c3', fontWeight: 600, textTransform: 'uppercase' }}>{label}</Typography>
    </Box>
  );
}

function EmployeeView({ data, leaveStatus }) {
  const projects = data?.projects || [];
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '2px' }}>
        <SectionLabel>IMPACTED PROJECTS ({projects.length})</SectionLabel>
        <StatusIcon status={leaveStatus} />
      </Box>
      {projects.length === 0
        ? <Typography sx={{ fontSize: 11, color: '#b0b6c3' }}>No project impact.</Typography>
        : projects.map(p => (
            <Row key={p.project_id}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1a1f2e' }}>{p.project_name}</Typography>
                {p.leave_type && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: '2px' }}>
                    <Dot color={LEAVE_COLORS[p.leave_type] || '#9aa0ad'} />
                    <Typography sx={{ fontSize: 10, color: '#9aa0ad' }}>
                      {p.is_half_day ? `Partial · ${p.half_day_session || p.leave_type}` : p.leave_type}
                    </Typography>
                  </Box>
                )}
              </Box>
              <Avail hasLeave={!!p.leave_type} isHalfDay={p.is_half_day} leaveType={p.leave_type} />
            </Row>
          ))
      }
    </>
  );
}

function ProjectView({ data }) {
  const emps = data?.employees || [];
  const project = data?.project || {};

  const total        = project.assigned_employees ?? emps.length;
  const onLeave      = project.on_leave_count ?? 0;
  const available    = project.available_workforce ?? 0;

  const partialOut = emps.filter(e => e?.is_half_day);
  const wfhOnly    = emps.filter(e => e?.leave_type === 'WFH');
  const fullyOut   = emps.filter(e => e?.leave_type && e?.leave_type !== 'WFH' && !e?.is_half_day);

  const risk = data?.project?.risk_level || 'LOW';

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 1 }}>
        <Mini label="Total"     val={total} />
        <Mini label="On Leave"  val={onLeave}   c="#dc2626" />
        <Mini label="Partial"   val={partialOut.length} c="#d97706" />
        <Mini label="WFH"       val={wfhOnly.length}    c="#059669" />
        <Mini label="Available" val={available} c="#16a34a" />
        <RiskTag risk={risk} />
      </Box>

      <SectionLabel>ON LEAVE ({fullyOut.length + partialOut.length})</SectionLabel>

      {(fullyOut.length + partialOut.length) === 0
        ? <Typography sx={{ fontSize: 11, color: '#b0b6c3' }}>All available.</Typography>
        : emps
            .filter(emp => emp.leave_type)
            .map(emp => (
              <Row key={emp.user_id}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1a1f2e' }}>
                    {emp.full_name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: '2px' }}>
                    <Dot color={LEAVE_COLORS[emp.leave_type] || '#9aa0ad'} />
                    <Typography sx={{ fontSize: 10, color: '#9aa0ad' }}>
                      {emp.leave_type}
                      {emp.is_half_day && emp.half_day_session ? ` · ${emp.half_day_session}` : ''}
                    </Typography>
                  </Box>
                </Box>
                <Avail
                  hasLeave={!!emp.leave_type}
                  isHalfDay={emp.is_half_day}
                  leaveType={emp.leave_type}
                />
              </Row>
            ))
      }
    </>
  );
}

function DayView({ data }) {
  const allEmps     = data?.employees_on_leave || [];
  const projects    = (data?.projects || []).filter(p => p.employees_on_leave > 0);
  const dateMeta    = data?.date || {};
  const holidayName = dateMeta.is_public_holiday ? dateMeta.holiday_name : null;

  // Split employees into actual leave vs WFH using the availability field from backend
  const onLeaveEmps = allEmps.filter(e => e.availability !== 'WFH');
  const wfhEmps     = allEmps.filter(e => e.availability === 'WFH');

  const SCROLL_COL = {
    overflowY: 'auto',
    maxHeight: 220,
    flex: 1,
    minHeight: 0,
    pr: '2px',
    '&::-webkit-scrollbar': { width: '3px' },
    '&::-webkit-scrollbar-track': { background: 'transparent' },
    '&::-webkit-scrollbar-thumb': { background: '#dde0e6', borderRadius: '99px' },
  };

  // SectionLabel needs to be sticky inside the scroll column
  const STICKY_LABEL = {
    fontSize: 9, fontWeight: 700, color: '#b0b6c3',
    letterSpacing: '0.7px', textTransform: 'uppercase',
    mt: 1, mb: 0.5,
    position: 'sticky', top: 0,
    background: '#fff',
    zIndex: 1,
    pt: '2px',
  };

  return (
    <>
      {holidayName && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.6, mb: 0.75, background: '#fefce8', border: '1px solid #fde68a', borderRadius: '6px' }}>
          <span>🏖️</span>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#92400e' }}>{holidayName}</Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 400, color: '#a16207', ml: 0.25 }}>· Public Holiday</Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', minHeight: 0 }}>

        {/* ── Left column: On Leave + WFH ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box sx={SCROLL_COL}>

            {/* On Leave section */}
            <Typography sx={{ ...STICKY_LABEL, mt: 0 }}>
              ON LEAVE ({onLeaveEmps.length})
            </Typography>

            {onLeaveEmps.length === 0
              ? <Typography sx={{ fontSize: 11, color: '#b0b6c3' }}>None.</Typography>
              : onLeaveEmps.map(emp => (
                  <Row key={emp.user_id}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1a1f2e' }}>{emp.full_name}</Typography>
                      {emp.leave_type && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: '2px' }}>
                          <Dot color={LEAVE_COLORS[emp.leave_type] || '#9aa0ad'} />
                          <Typography sx={{ fontSize: 10, color: '#9aa0ad' }}>
                            {emp.leave_type}{emp.is_half_day && emp.half_day_session ? ` · ${emp.half_day_session}` : ''}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <Avail hasLeave={!!emp.leave_type} isHalfDay={emp.is_half_day} leaveType={emp.leave_type} />
                  </Row>
                ))
            }

            {/* WFH section — only shown if there are WFH employees */}
            {wfhEmps.length > 0 && (
              <>
                <Box sx={{ height: '0.5px', background: '#eef0f3', my: '6px' }} />
                <Typography sx={STICKY_LABEL}>
                  WFH ({wfhEmps.length})
                </Typography>
                {wfhEmps.map(emp => (
                  <WFHRow key={emp.user_id}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1a1f2e' }}>{emp.full_name}</Typography>
                      <Typography sx={{ fontSize: 10, color: '#9aa0ad', mt: '2px' }}>Working remotely</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#059669' }}>WFH</Typography>
                  </WFHRow>
                ))}
              </>
            )}

          </Box>
        </Box>

        {/* Column divider */}
        <Box sx={{ background: '#f0f2f5', mx: 1, my: '1px', width: '1px', flexShrink: 0 }} />

        {/* ── Right column: Affected projects (real absences only) ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box sx={SCROLL_COL}>
            <Typography sx={{ ...STICKY_LABEL, mt: 0 }}>
              AFFECTED ({projects.length})
            </Typography>

            {projects.length === 0
              ? <Typography sx={{ fontSize: 11, color: '#b0b6c3' }}>None.</Typography>
              : projects.map(p => {
                  const risk = p.risk_level || 'LOW';
                  return (
                    <Row key={p.project_id}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1a1f2e' }}>{p.project_name}</Typography>
                        <Typography sx={{ fontSize: 10, color: '#9aa0ad', mt: '2px' }}>
                          {p.employees_on_leave} of {p.assigned_employees} on leave
                        </Typography>
                      </Box>
                      <RiskTag risk={risk} />
                    </Row>
                  );
                })
            }
          </Box>
        </Box>

      </Box>
    </>
  );
}