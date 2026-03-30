import { Tooltip } from '@mui/material';

const LEAVE_COLOR = {
  'Paid':   '#2563EB',
  'Unpaid': '#93C5FD',
  'WFH':    '#59be68',
};

function getColor(leaveType) {
  return LEAVE_COLOR[leaveType] ?? '#2563EB';
}

export default function LeaveCell({ cell, dateInfo, isFirst, onClick }) {
  const isWeekend   = dateInfo?.is_weekend;
  const isHoliday   = dateInfo?.is_public_holiday;
  const hasLeave    = cell !== null && cell !== undefined;
  const leaveType   = cell?.leave_type;
  const session     = cell?.half_day_session;
  const isPending   = hasLeave && cell?.leave_status === 'Pending';
  const isRejected  = hasLeave && cell?.leave_status === 'Rejected';
  const isCancelled = hasLeave && cell?.leave_status === 'Cancelled';
  const isHalfDay   = hasLeave && cell?.is_half_day;

  const secondary    = cell?.secondary ?? null;
  const hasSplit     = hasLeave && secondary !== null;
  const secLeaveType = secondary?.leave_type;

  let cellBg = '#ffffff';
  if (isWeekend) cellBg = 'repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 2px,#f3f4f6 2px,#f3f4f6 5px)';
  if (isHoliday && !isWeekend) cellBg = '#fefce8';

  const nb        = '1px solid #e8eaed';
  const baseColor = getColor(leaveType);
  const secColor  = getColor(secLeaveType);

  //  was (!isRejected || !isCancelled) which is almost always true
  const isBlocked   = isRejected || isCancelled;
  const isClickable = hasLeave && !isBlocked;

  const handleClick = (e) => {
    if (!isClickable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onClick(rect);
  };

  const tooltipTitle = isRejected ? 'Rejected' : isCancelled ? 'Cancelled' : '';

  const cellContent = (
    <div
      onClick={isClickable ? handleClick : undefined}
      style={{
        width: 35, minWidth: 35, height: 35,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: isClickable ? 'pointer' : 'default',
        flexShrink: 0, position: 'relative',
        background: cellBg,
        borderTop: 'none', borderLeft: isFirst ? nb : 'none',
        borderRight: nb, borderBottom: nb,
        boxSizing: 'border-box', padding: 0,
        zIndex: hasLeave ? 2 : 'auto',
      }}
    >
      {/* ── SPLIT HALF-DAY APPROVED ── */}
      {hasSplit && !isBlocked && !isPending && (
        <div style={{ position: 'absolute', inset: 0.2, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0, background: baseColor,
            clipPath: session === 'Second Half' ? 'polygon(100% 0,100% 100%,0 100%)' : 'polygon(0 0,100% 0,0 100%)',
          }} />
          <div style={{
            position: 'absolute', inset: 0, background: secColor,
            clipPath: session === 'Second Half' ? 'polygon(0 0,100% 0,0 100%)' : 'polygon(100% 0,100% 100%,0 100%)',
          }} />
        </div>
      )}

      {/* ── SPLIT HALF-DAY PENDING: triangles + bang overlay ── */}
      {hasSplit && isPending && (
        <>
          <div style={{ position: 'absolute', inset: 0.2, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: 0, background: baseColor,
              clipPath: session === 'Second Half' ? 'polygon(100% 0,100% 100%,0 100%)' : 'polygon(0 0,100% 0,0 100%)',
            }} />
            <div style={{
              position: 'absolute', inset: 0, background: secColor,
              clipPath: session === 'Second Half' ? 'polygon(0 0,100% 0,0 100%)' : 'polygon(100% 0,100% 100%,0 100%)',
            }} />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: '#F59E0B', fontWeight: 700, fontSize: 22 }}>!</div>
        </>
      )}

      {/* ── SPLIT HALF-DAY REJECTED/CANCELLED: triangles + cross overlay ── */}
      {hasSplit && isBlocked && (
        <>
          <div style={{ position: 'absolute', inset: 0.2, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: 0, background: baseColor,
              clipPath: session === 'Second Half' ? 'polygon(100% 0,100% 100%,0 100%)' : 'polygon(0 0,100% 0,0 100%)',
            }} />
            <div style={{
              position: 'absolute', inset: 0, background: secColor,
              clipPath: session === 'Second Half' ? 'polygon(0 0,100% 0,0 100%)' : 'polygon(100% 0,100% 100%,0 100%)',
            }} />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
        </>
      )}

      {/* ── FULL LEAVE APPROVED ── */}
      {hasLeave && !hasSplit && !isHalfDay && !isBlocked && !isPending && (
        <div style={{ position: 'absolute', inset: 0.2, background: baseColor }} />
      )}

      {/* ── FULL LEAVE PENDING: colour fill + bang ── */}
      {hasLeave && !hasSplit && !isHalfDay && isPending && (
        <>
          <div style={{ position: 'absolute', inset: 0.2, background: baseColor }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: '#F59E0B', fontWeight: 700, fontSize: 22 }}>!</div>
        </>
      )}

      {/* ── FULL LEAVE REJECTED/CANCELLED: colour fill + cross ── */}
      {hasLeave && !hasSplit && !isHalfDay && isBlocked && (
        <>
          <div style={{ position: 'absolute', inset: 0.2, background: baseColor }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
        </>
      )}

      {/* ── HALF-DAY APPROVED ── */}
      {hasLeave && !hasSplit && isHalfDay && !isBlocked && !isPending && (
        <div style={{ position: 'absolute', inset: 0.2, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0, background: baseColor,
            clipPath: session === 'First Half' ? 'polygon(0 0,100% 0,0 100%)' : 'polygon(100% 0,100% 100%,0 100%)',
          }} />
        </div>
      )}

      {/* ── HALF-DAY PENDING: colour triangle + bang ── */}
      {hasLeave && !hasSplit && isHalfDay && isPending && (
        <>
          <div style={{ position: 'absolute', inset: 0.2, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: 0, background: baseColor,
              clipPath: session === 'First Half' ? 'polygon(0 0,100% 0,0 100%)' : 'polygon(100% 0,100% 100%,0 100%)',
            }} />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: '#F59E0B', fontWeight: 700, fontSize: 22 }}>!</div>
        </>
      )}

      {/* ── HALF-DAY REJECTED/CANCELLED: colour triangle + cross ── */}
      {hasLeave && !hasSplit && isHalfDay && isBlocked && (
        <>
          <div style={{ position: 'absolute', inset: 0.2, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: 0, background: baseColor,
              clipPath: session === 'First Half' ? 'polygon(0 0,100% 0,0 100%)' : 'polygon(100% 0,100% 100%,0 100%)',
            }} />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
        </>
      )}
    </div>
  );

  // Wrap with Tooltip only for Rejected/Cancelled
  if (isBlocked) {
    return (
      <Tooltip title={tooltipTitle} placement="top" arrow>
        {cellContent}
      </Tooltip>
    );
  }
  
  if (isPending) {
  return (
    <Tooltip title="Pending approval" placement="top" arrow>
      {cellContent}
    </Tooltip>
  );
}

  return cellContent;
}