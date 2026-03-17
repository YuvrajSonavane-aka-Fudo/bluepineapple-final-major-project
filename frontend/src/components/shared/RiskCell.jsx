// src/components/shared/RiskCell.jsx
const RISK_RGB = {
  HIGH:   { r: 239, g: 68,  b: 68  },
  MEDIUM: { r: 245, g: 158, b: 11  },
  LOW:    { r: 34,  g: 197, b: 94  },
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

  let bg = cellBg;
  if (showRiskColor) {
    const rgb = RISK_RGB[risk] || RISK_RGB['LOW'];
    const pct = cell.assigned_employees ? cell.employees_on_leave / cell.assigned_employees : 0;
    const maxOpacity = risk === 'HIGH' ? 0.90 : risk === 'MEDIUM' ? 0.65 : 0.35;
    const opacity = Math.min(maxOpacity, 0.15 + pct * 0.75);
    bg = `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity})`;
  }

  const handleClick = (e) => { const rect = e.currentTarget.getBoundingClientRect(); onClick(rect); };

  return (
    <div
      onClick={cell ? handleClick : undefined}
      style={{ ...sharedStyle, background: bg, cursor: cell ? 'pointer' : 'default' }}
    />
  );
}
