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

// Rounded chip — this is the only visual change
const chipStyle = (bg) => ({
  position: 'absolute',
  inset: 3,
  borderRadius: 5,
  background: bg,
  overflow: 'hidden',
  transition: 'transform 120ms ease, box-shadow 120ms ease',
});

const chipHoverStyle = {
  transform: 'scale(1.13)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
  zIndex: 10,
};

function Chip({ bg, children, hovered }) {
  return (
    <div style={{ ...chipStyle(bg), ...(hovered ? chipHoverStyle : {}) }}>
      {children}
    </div>
  );
}

function CellLabel({ leaveType }) {
  const label = getCellLabel(leaveType);
  if (!label) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 3,
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
      {/* ── SPLIT HALF-DAY APPROVED ── */}
      {hasSplit && !isBlocked && !isPending && (
        <>
          <Chip bg="transparent" hovered={hovered}>
            <div style={{
              position: 'absolute', inset: 0, background: baseColor,
              clipPath: session === 'Second Half' ? 'polygon(100% 0,100% 100%,0 100%)' : 'polygon(0 0,100% 0,0 100%)',
            }} />
            <div style={{
              position: 'absolute', inset: 0, background: secColor,
              clipPath: session === 'Second Half' ? 'polygon(0 0,100% 0,0 100%)' : 'polygon(100% 0,100% 100%,0 100%)',
            }} />
          </Chip>
          <CellLabel leaveType={leaveType} />
        </>
      )}

      {/* ── SPLIT HALF-DAY PENDING ── */}
      {hasSplit && isPending && (
        <>
          <Chip bg="transparent" hovered={hovered}>
            <div style={{
              position: 'absolute', inset: 0, background: baseColor,
              clipPath: session === 'Second Half' ? 'polygon(100% 0,100% 100%,0 100%)' : 'polygon(0 0,100% 0,0 100%)',
            }} />
            <div style={{
              position: 'absolute', inset: 0, background: secColor,
              clipPath: session === 'Second Half' ? 'polygon(0 0,100% 0,0 100%)' : 'polygon(100% 0,100% 100%,0 100%)',
            }} />
          </Chip>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: '#F59E0B', fontWeight: 700, fontSize: 22, zIndex: 4 }}>!</div>
          <CellLabel leaveType={leaveType} />
        </>
      )}

      {/* ── SPLIT HALF-DAY REJECTED/CANCELLED ── */}
      {hasSplit && isBlocked && (
        <>
          <Chip bg="transparent" hovered={hovered}>
            <div style={{
              position: 'absolute', inset: 0, background: baseColor,
              clipPath: session === 'Second Half' ? 'polygon(100% 0,100% 100%,0 100%)' : 'polygon(0 0,100% 0,0 100%)',
            }} />
            <div style={{
              position: 'absolute', inset: 0, background: secColor,
              clipPath: session === 'Second Half' ? 'polygon(0 0,100% 0,0 100%)' : 'polygon(100% 0,100% 100%,0 100%)',
            }} />
          </Chip>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
          <CellLabel leaveType={leaveType} />
        </>
      )}

      {/* ── FULL LEAVE APPROVED ── */}
      {hasLeave && !hasSplit && !isHalfDay && !isBlocked && !isPending && (
        <>
          <Chip bg={baseColor} hovered={hovered} />
          <CellLabel leaveType={leaveType} />
        </>
      )}

      {/* ── FULL LEAVE PENDING ── */}
      {hasLeave && !hasSplit && !isHalfDay && isPending && (
        <>
          <Chip bg={baseColor} hovered={hovered} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: '#F59E0B', fontWeight: 700, fontSize: 22, zIndex: 4 }}>!</div>
          <CellLabel leaveType={leaveType} />
        </>
      )}

      {/* ── FULL LEAVE REJECTED/CANCELLED ── */}
      {hasLeave && !hasSplit && !isHalfDay && isBlocked && (
        <>
          <Chip bg={baseColor} hovered={hovered} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
          <CellLabel leaveType={leaveType} />
        </>
      )}

      {/* ── HALF-DAY APPROVED ── */}
      {hasLeave && !hasSplit && isHalfDay && !isBlocked && !isPending && (
        <>
          <Chip bg="transparent" hovered={hovered}>
            <div style={{
              position: 'absolute', inset: 0, background: baseColor,
              clipPath: session === 'First Half' ? 'polygon(0 0,100% 0,0 100%)' : 'polygon(100% 0,100% 100%,0 100%)',
            }} />
          </Chip>
          <CellLabel leaveType={leaveType} />
        </>
      )}

      {/* ── HALF-DAY PENDING ── */}
      {hasLeave && !hasSplit && isHalfDay && isPending && (
        <>
          <Chip bg="transparent" hovered={hovered}>
            <div style={{
              position: 'absolute', inset: 0, background: baseColor,
              clipPath: session === 'First Half' ? 'polygon(0 0,100% 0,0 100%)' : 'polygon(100% 0,100% 100%,0 100%)',
            }} />
          </Chip>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: '#F59E0B', fontWeight: 700, fontSize: 22, zIndex: 4 }}>!</div>
          <CellLabel leaveType={leaveType} />
        </>
      )}

      {/* ── HALF-DAY REJECTED/CANCELLED ── */}
      {hasLeave && !hasSplit && isHalfDay && isBlocked && (
        <>
          <Chip bg="transparent" hovered={hovered}>
            <div style={{
              position: 'absolute', inset: 0, background: baseColor,
              clipPath: session === 'First Half' ? 'polygon(0 0,100% 0,0 100%)' : 'polygon(100% 0,100% 100%,0 100%)',
            }} />
          </Chip>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
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