// src/components/shared/LeaveCell.jsx
// Matches mock Image 2 exactly:
//   Full leave = solid colored block
//   Half AM    = top-left triangle (navy blue in mock)
//   Half PM    = bottom-right triangle
//   WFH        = small dot / text badge (green in mock)
//   Pending    = dashed border
//   Rejected   = X mark with red border

const LEAVE_COLORS = {
  Paid:       ' #A7C7E7',
  Sick:       '#FFFAA0',
  WFH:        '#16a34a',
  'Half Day': ' #A7C7E7',
  Conference: ' #A7C7E7',
  Unpaid:     '#FFFAA0',
};

export default function LeaveCell({ cell, dateInfo, isToday, onClick }) {
  const isWeekend = dateInfo?.is_weekend;
  const isHoliday = dateInfo?.is_public_holiday;
  const hasLeave  = cell !== null && cell !== undefined;
  const color     = hasLeave ? (LEAVE_COLORS[cell?.leave_type] || '#3b5bdb') : null;

  // Background for weekend/holiday — hatched pattern like mock
  let cellBg = 'transparent';
  if (isWeekend) cellBg = 'repeating-linear-gradient(45deg, #f0f2f5, #f0f2f5 2px, #e8eaed 2px, #e8eaed 6px)';
  if (isHoliday) cellBg = '#fef9e7';

  const isPending  = hasLeave && cell?.leave_status === 'Pending';
  const isRejected = hasLeave && cell?.leave_status === 'Rejected';
  const isWFH      = hasLeave && cell?.leave_type === 'WFH';
  const isHalfDay  = hasLeave && cell?.is_half_day;
  const session    = cell?.half_day_session;

  return (
    <div
      onClick={hasLeave ? onClick : undefined}
      style={{
        width: 44, minWidth: 44, height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: hasLeave ? 'pointer' : 'default',
        flexShrink: 0,
        position: 'relative',
        background: cellBg,
        border: isToday ? '2px solid #e85d26' : '1px solid transparent',
        borderRadius: 4,
        padding: 2,
      }}
    >
      {hasLeave && !isHalfDay && !isWFH && !isRejected && (
        /* Full day block */
        <div style={{
          position: 'absolute', inset: isPending ? 3 : 2,
          borderRadius: 4,
          background: isPending ? 'transparent' : color,
          border: isPending ? `2px dashed ${color}` : 'none',
          opacity: isPending ? 0.8 : 1,
        }} />
      )}

      {hasLeave && isWFH && !isHalfDay && (
        /* WFH: small centered text badge like mock */
        <div style={{
          position: 'absolute', inset: 2,
          borderRadius: 4,
          background: '#dcfce7',
          border: isPending ? `2px dashed ${color}` : `1.5px solid #bbf7d0`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', letterSpacing: '0.3px' }}>WFH</span>
        </div>
      )}

      {hasLeave && isRejected && !isHalfDay && (
        /* Rejected: X icon with pink/red bg like mock */
        <div style={{
          position: 'absolute', inset: 2,
          borderRadius: 4,
          background: '#fff1f2',
          border: '1.5px solid #fecdd3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </div>
      )}

      {/* Half day AM (First Half) = upper-left triangle, like mock "Half Day AM" */}
      {hasLeave && isHalfDay && session === 'First Half' && (
        <div style={{
          position: 'absolute', inset: 2, borderRadius: 4, overflow: 'hidden',
          border: '1.5px solid #e8eaed',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: color,
            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
          }} />
        </div>
      )}

      {/* Half day PM (Second Half) = lower-right triangle */}
      {hasLeave && isHalfDay && session === 'Second Half' && (
        <div style={{
          position: 'absolute', inset: 2, borderRadius: 4, overflow: 'hidden',
          border: '1.5px solid #e8eaed',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: color,
            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
          }} />
        </div>
      )}
    </div>
  );
}
