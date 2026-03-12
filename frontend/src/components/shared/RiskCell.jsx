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
    width: 35,
    minWidth: 35,
    height: 35,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderTop: 'none',
    borderLeft: isToday ? tb : (isFirst ? nb : 'none'),
    borderRight: isToday ? tb : nb,
    borderBottom: nb,
    boxSizing: 'border-box',
    padding: 0,
  };

  let cellBg = '#ffffff';

  if (isWeekend) {
    cellBg =
      'repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 2px,#f3f4f6 2px,#f3f4f6 5px)';
  }

  if (isHoliday && !isWeekend) {
    cellBg = '#fefce8';
  }

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onClick(rect);
  };

  const pct = cell
    ? Math.round((cell.available_workforce / (cell.assigned_employees || 1)) * 100)
    : null;

  const showRiskColor =
    !isWeekend &&
    !isHoliday &&
    pct !== null &&
    pct > 0 &&
    pct < 100;

  let bg = cellBg;

  if (showRiskColor) {

    // Determine risk from percentage (matches legend)
    let risk;
    if (pct < 40) risk = 'HIGH';
    else if (pct <= 75) risk = 'MEDIUM';
    else risk = 'LOW';

    const rgb = RISK_RGB[risk];

    // Heatmap intensity
    const severity = 1 - pct / 100;
    const opacity = Math.min(0.9, 0.25 + severity * 0.75);

    bg = `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity})`;
  }

  return (
    <div
      onClick={cell ? handleClick : undefined}
      title={cell ? `${cell.available_workforce}/${cell.assigned_employees} available` : undefined}
      style={{
        ...sharedStyle,
        background: bg,
        cursor: cell ? 'pointer' : 'default',
      }}
    />
  );
}