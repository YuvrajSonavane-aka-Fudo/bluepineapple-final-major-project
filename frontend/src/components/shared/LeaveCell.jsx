import { useState } from 'react';
import { Tooltip } from '@mui/material';

const LEAVE_COLOR = {
  'Paid':     '#2563EB',
  'Unpaid':   '#93C5FD',
  'WFH':      '#59be68',
  'COMP Off': '#2563EB',
  'AU':       '#2563EB',
  'Other':    '#2563EB',
};

function getColor(leaveType) {
  return LEAVE_COLOR[leaveType] ?? '#2563EB';
}

function getCellLabel(leaveType) {
  if (!leaveType) return null;
  if (leaveType === 'COMP Off') return 'CO';
  if (leaveType === 'AU')       return 'AU';
  if (leaveType === 'Paid' || leaveType === 'Unpaid' || leaveType === 'WFH') return null;
  return 'O';
}

function getFullLabel(leaveType) {
  if (leaveType === 'COMP Off') return 'Comp Off';
  if (leaveType === 'AU')       return 'AU';
  return leaveType || '';
}

// Rounded animated chip — background only, no children
function Chip({ bg, hovered }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 3,
      borderRadius: 5,
      background: bg,
      // NO overflow:hidden here — labels sit outside this div
      transition: 'transform 120ms ease, box-shadow 120ms ease',
      ...(hovered ? {
        transform: 'scale(1.13)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        zIndex: 2,
      } : { zIndex: 2 }),
    }} />
  );
}

// Triangle chip for half-day — background shape only
function TriChip({ baseColor, secColor, session, hovered }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 3,
      borderRadius: 5,
      overflow: 'hidden', // needed to clip the triangle to rounded corners
      transition: 'transform 120ms ease, box-shadow 120ms ease',
      zIndex: 2,
      ...(hovered ? {
        transform: 'scale(1.13)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      } : {}),
    }}>
      {secColor ? (
        <>
          <div style={{
            position: 'absolute', inset: 0, background: baseColor,
            clipPath: session === 'Second Half' ? 'polygon(100% 0,100% 100%,0 100%)' : 'polygon(0 0,100% 0,0 100%)',
          }} />
          <div style={{
            position: 'absolute', inset: 0, background: secColor,
            clipPath: session === 'Second Half' ? 'polygon(0 0,100% 0,0 100%)' : 'polygon(100% 0,100% 100%,0 100%)',
          }} />
        </>
      ) : (
        <div style={{
          position: 'absolute', inset: 0, background: baseColor,
          clipPath: session === 'First Half' ? 'polygon(0 0,100% 0,0 100%)' : 'polygon(100% 0,100% 100%,0 100%)',
        }} />
      )}
    </div>
  );
}

// Label rendered ABOVE the chip at z-index 5 — never clipped
function CellLabel({ leaveType }) {
  const label = getCellLabel(leaveType);
  if (!label) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 5,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
      fontSize: 8, fontWeight: 800, color: '#fff',
      letterSpacing: '0.3px', lineHeight: 1,
      userSelect: 'none',
    }}>
      {label}
    </div>
  );
}

// Status overlay rendered ABOVE the chip at z-index 5 — never clipped
function StatusOverlay({ isPending, isBlocked }) {
  if (isPending) {
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', color: '#F59E0B', fontWeight: 700, fontSize: 22,
      }}>!</div>
    );
  }
  if (isBlocked) {
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </div>
    );
  }
  return null;
}

export default function LeaveCell({ cell, dateInfo, isFirst, onClick }) {
  const [hovered, setHovered] = useState(false);

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

  const isBlocked   = isRejected || isCancelled;
  const isClickable = hasLeave && !isBlocked;

  const handleClick = (e) => {
    if (!isClickable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onClick(rect);
  };

  const cellLabel = getCellLabel(leaveType);
  const tooltipParts = [];
  if (isRejected)  tooltipParts.push('Rejected');
  if (isCancelled) tooltipParts.push('Cancelled');
  if (isPending)   tooltipParts.push('Pending approval');
  if (cellLabel)   tooltipParts.push(getFullLabel(leaveType));
  const tooltipTitle = tooltipParts.join(' · ');

  const cellContent = (
    <div
      onClick={isClickable ? handleClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
      {/* ── SPLIT HALF-DAY ── */}
      {hasSplit && (
        <>
          <TriChip baseColor={baseColor} secColor={secColor} session={session} hovered={hovered} />
          <StatusOverlay isPending={isPending} isBlocked={isBlocked} />
          <CellLabel leaveType={leaveType} />
        </>
      )}

      {/* ── FULL LEAVE ── */}
      {hasLeave && !hasSplit && !isHalfDay && (
        <>
          <Chip bg={baseColor} hovered={hovered} />
          <StatusOverlay isPending={isPending} isBlocked={isBlocked} />
          <CellLabel leaveType={leaveType} />
        </>
      )}

      {/* ── HALF-DAY ── */}
      {hasLeave && !hasSplit && isHalfDay && (
        <>
          <TriChip baseColor={baseColor} session={session} hovered={hovered} />
          <StatusOverlay isPending={isPending} isBlocked={isBlocked} />
          <CellLabel leaveType={leaveType} />
        </>
      )}
    </div>
  );

  if (tooltipTitle) {
    return (
      <Tooltip title={tooltipTitle} placement="top" arrow>
        {cellContent}
      </Tooltip>
    );
  }

  return cellContent;
}