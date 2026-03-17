// src/components/shared/LeaveCell.jsx
// Pure inline styles — MUI cannot replicate clip-path triangle shapes pixel-perfectly
export default function LeaveCell({ cell, dateInfo, isFirst, onClick }) {
  const isWeekend = dateInfo?.is_weekend;
  const isHoliday = dateInfo?.is_public_holiday;
  const hasLeave  = cell !== null && cell !== undefined;
  const leaveType = cell?.leave_type;
  const session   = cell?.half_day_session;
  const isPending  = hasLeave && cell?.leave_status === 'Pending';
  const isRejected = hasLeave && cell?.leave_status === 'Rejected';
  const isWFH      = hasLeave && leaveType === 'WFH';
  const isHalfDay  = hasLeave && cell?.is_half_day;

  let cellBg = '#ffffff';
  if (isWeekend) cellBg = 'repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 2px,#f3f4f6 2px,#f3f4f6 5px)';
  if (isHoliday && !isWeekend) cellBg = '#fefce8';

  const nb = '1px solid #e8eaed';
  const LEAVE_COLOR = { 'Paid': '#2563EB', 'Unpaid': '#93C5FD', 'WFH': '#59be68' };
  const baseColor = LEAVE_COLOR[leaveType] ?? '#2563EB';

  const handleClick = (e) => { const rect = e.currentTarget.getBoundingClientRect(); onClick(rect); };

  return (
    <div
      onClick={hasLeave ? handleClick : undefined}
      style={{
        width: 35, minWidth: 35, height: 35,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: hasLeave ? 'pointer' : 'default',
        flexShrink: 0, position: 'relative',
        background: cellBg,
        borderTop: 'none', borderLeft: isFirst ? nb : 'none',
        borderRight: nb, borderBottom: nb,
        boxSizing: 'border-box', padding: 0,
        zIndex: hasLeave ? 2 : 'auto',
      }}
    >
      {hasLeave && !isHalfDay && !isRejected && !isPending && (
        <div style={{ position: 'absolute', inset: -1, background: baseColor }} />
      )}
      {hasLeave && !isHalfDay && !isWFH && !isRejected && isPending && (
        <div style={{ position: 'absolute', inset: -1, border: '2px dashed #994545', background: 'transparent' }} />
      )}
      {hasLeave && isRejected && !isHalfDay && (
        <div style={{ position: 'absolute', inset: -1, background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </div>
      )}
      {hasLeave && isHalfDay && !isRejected && !isPending && session === 'First Half' && (
        <div style={{ position: 'absolute', inset: -1, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: baseColor, clipPath: 'polygon(0 0,100% 0,0 100%)' }} />
        </div>
      )}
      {hasLeave && isHalfDay && !isRejected && !isPending && session === 'Second Half' && (
        <div style={{ position: 'absolute', inset: -1, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: -1, background: baseColor, clipPath: 'polygon(100% 0,100% 100%,0 100%)' }} />
        </div>
      )}
      {hasLeave && isHalfDay && isPending && (
        <div style={{ position: 'absolute', inset: -1, border: '2px dashed #994545', background: 'transparent' }} />
      )}
      {hasLeave && isHalfDay && isRejected && (
        <div style={{ position: 'absolute', inset: -1, background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </div>
      )}
    </div>
  );
}
