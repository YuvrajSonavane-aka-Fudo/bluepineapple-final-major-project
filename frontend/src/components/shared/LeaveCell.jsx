// src/components/shared/LeaveCell.jsx
// ALL colors match Legend.jsx exactly
// Today column highlight is handled by EmployeePanel overlay — NOT here

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

  // Background — NO today tint here, handled by parent overlay
  let cellBg = '#ffffff';
  if (isWeekend) cellBg = 'repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 2px,#f3f4f6 2px,#f3f4f6 5px)';
  if (isHoliday && !isWeekend) cellBg = '#fefce8';

  const nb = '1px solid #e8eaed';

  // Leave type → fill color per Legend LEAVE TYPES
  const LEAVE_COLOR = {
    'Paid':   '#2563EB',
    'Unpaid': '#93C5FD',
    'WFH':    '#06B6D4',
  };
  const baseColor = LEAVE_COLOR[leaveType] ?? '#2563EB';

  return (
    <div
      onClick={hasLeave ? onClick : undefined}
      style={{
        width: 35, minWidth: 35, height: 35,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: hasLeave ? 'pointer' : 'default',
        flexShrink: 0, position: 'relative',
        background: cellBg,
        borderTop: 'none',
        borderLeft: isFirst ? nb : 'none',
        borderRight: nb,
        borderBottom: nb,
        boxSizing: 'border-box',
        padding: 0,
        zIndex: hasLeave ? 2 : 'auto',
      }}
    >
      {/* APPROVED full day */}
      {hasLeave && !isHalfDay && !isWFH && !isRejected && !isPending && (
        <div style={{ position: 'absolute', inset: 3, borderRadius: 3, background: baseColor }} />
      )}

      {/* PENDING full day — dashed amber border */}
      {hasLeave && !isHalfDay && !isWFH && !isRejected && isPending && (
        <div style={{
          position: 'absolute', inset: 4, borderRadius: 3,
          border: '2px dashed #994545', background: 'transparent',
        }} />
      )}

      {/* WFH full day — cyan dot */}
      {hasLeave && isWFH && !isHalfDay && (
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#06B6D4' }} />
      )}

      {/* REJECTED full day */}
      {hasLeave && isRejected && !isHalfDay && (
        <div style={{
          position: 'absolute', inset: 3, borderRadius: 3,
          background: '#fff1f2', border: '1px solid #fecdd3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </div>
      )}

      {/* HALF DAY AM — upper-left triangle, leave-type color */}
      {hasLeave && isHalfDay && !isRejected && !isPending && session === 'First Half' && (
        <div style={{ position: 'absolute', inset: 3, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: baseColor,
            clipPath: 'polygon(0 0,100% 0,0 100%)',
          }} />
        </div>
      )}

      {/* HALF DAY PM — lower-right triangle, leave-type color */}
      {hasLeave && isHalfDay && !isRejected && !isPending && session === 'Second Half' && (
        <div style={{ position: 'absolute', inset: 3, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: baseColor,
            clipPath: 'polygon(100% 0,100% 100%,0 100%)',
          }} />
        </div>
      )}

      {/* HALF DAY PENDING */}
      {hasLeave && isHalfDay && isPending && (
        <div style={{
          position: 'absolute', inset: 4, borderRadius: 3,
          border: '2px dashed #994545', background: 'transparent',
        }} />
      )}

      {/* HALF DAY REJECTED */}
      {hasLeave && isHalfDay && isRejected && (
        <div style={{
          position: 'absolute', inset: 3, borderRadius: 3,
          background: '#fff1f2', border: '1px solid #fecdd3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </div>
      )}
    </div>
  );
}