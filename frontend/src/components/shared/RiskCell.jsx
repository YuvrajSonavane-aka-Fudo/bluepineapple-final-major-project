import { useState } from 'react';

const RISK_COLORS = {
  HIGH:   'rgba(239,68,68,0.80)',
  MEDIUM: 'rgba(245,158,11,0.55)',
  LOW:    'rgba(34,197,94,0.30)',
};

export default function RiskCell({ cell, dateInfo, isFirst, isToday, onClick }) {
  const [hovered, setHovered] = useState(false);

  const isWeekend = dateInfo?.is_weekend;
  const isHoliday = dateInfo?.is_public_holiday;
  const nb = '1px solid #e8eaed';
  const tb = '1px solid #994545';

  const sharedStyle = {
    width: 35, minWidth: 35, height: 35, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderTop: 'none',
    borderLeft: isToday ? tb : (isFirst ? nb : 'none'),
    borderRight: isToday ? tb : nb,
    borderBottom: nb,
    boxSizing: 'border-box', padding: 0,
    position: 'relative',
  };

  let cellBg = '#ffffff';
  if (isWeekend) cellBg = 'repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 2px,#f3f4f6 2px,#f3f4f6 5px)';
  if (isHoliday && !isWeekend) cellBg = '#fefce8';

  const risk     = cell?.risk_level        ?? null;
  const onLeave  = cell?.employees_on_leave ?? 0;
  const partial  = cell?.partial_count      ?? 0;

  const shouldHighlight = onLeave > 0 || partial > 0;
  const showRiskColor   = !isWeekend && !isHoliday && risk !== null && shouldHighlight;
  const chipBg          = showRiskColor ? (RISK_COLORS[risk] || RISK_COLORS['LOW']) : null;

  const isClickable = shouldHighlight && !isWeekend && !isHoliday;

  const handleClick = (e) => {
    if (!isClickable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onClick(rect);
  };

  return (
    <div
      onClick={isClickable ? handleClick : undefined}
      onMouseEnter={() => isClickable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...sharedStyle, background: cellBg, cursor: isClickable ? 'pointer' : 'default' }}
    >
      {chipBg && (
        <div
          style={{
            position: 'absolute',
            inset: 3,
            borderRadius: 5,
            background: chipBg,
            transition: 'transform 120ms ease, box-shadow 120ms ease',
            ...(hovered ? {
              transform: 'scale(1.13)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              zIndex: 10,
            } : {}),
          }}
        />
      )}
    </div>
  );
}