// src/components/shared/RiskCell.jsx
const RISK_COLORS = {
  HIGH:   'rgba(239,68,68,0.80)',
  MEDIUM: 'rgba(245,158,11,0.55)',
  LOW:    'rgba(34,197,94,0.30)',
};

export default function RiskCell({ cell, dateInfo, isFirst, isToday, onClick }) {
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
  };

  let cellBg = '#ffffff';
  if (isWeekend) cellBg = 'repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 2px,#f3f4f6 2px,#f3f4f6 5px)';
  if (isHoliday && !isWeekend) cellBg = '#fefce8';

  const risk = cell?.risk_level || null;
  const showRiskColor = !isWeekend && !isHoliday && risk !== null && cell?.employees_on_leave > 0;

  const bg = showRiskColor ? (RISK_COLORS[risk] || RISK_COLORS['LOW']) : cellBg;

  const handleClick = (e) => { const rect = e.currentTarget.getBoundingClientRect(); onClick(rect); };

  return (
    <div
      onClick={cell ? handleClick : undefined}
      style={{ ...sharedStyle, background: bg, cursor: cell ? 'pointer' : 'default' }}
    />
  );
}