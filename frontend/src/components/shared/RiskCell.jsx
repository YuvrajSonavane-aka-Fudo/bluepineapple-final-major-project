// src/components/shared/RiskCell.jsx
// Matches mock Image 2: shows percentage availability, color-coded bg
// e.g. "80%" in green bg, "20%" in red bg, "55%" in yellow bg

const RISK_CFG = {
  HIGH:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  MEDIUM: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  LOW:    { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
};

export default function RiskCell({ cell, dateInfo, isToday, onClick }) {
  const isWeekend = dateInfo?.is_weekend;
  const isHoliday = dateInfo?.is_public_holiday;

  // Weekends get hatched pattern
  let cellBg = 'transparent';
  if (isWeekend) cellBg = 'repeating-linear-gradient(45deg, #f0f2f5, #f0f2f5 2px, #e8eaed 2px, #e8eaed 6px)';
  if (isHoliday) cellBg = '#fef9e7';

  if (!cell || (!isWeekend && !isHoliday && cell.employees_on_leave === 0)) {
    // Available / no impact — show light green
    const pct = cell ? Math.round((cell.available_workforce / (cell.assigned_employees || 1)) * 100) : null;
    return (
      <div style={{
        width: 44, minWidth: 44, height: 44, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: cell ? '#f0fdf4' : cellBg,
        border: isToday ? '2px solid #e85d26' : `1px solid ${cell ? '#bbf7d0' : 'transparent'}`,
        borderRadius: 4,
        cursor: cell ? 'pointer' : 'default',
      }} onClick={cell ? onClick : undefined}>
        {cell && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', fontFamily: "'DM Mono', monospace" }}>
            {pct}%
          </span>
        )}
      </div>
    );
  }

  const cfg = RISK_CFG[cell.risk_level] || RISK_CFG.LOW;
  const pct = Math.round((cell.available_workforce / (cell.assigned_employees || 1)) * 100);

  return (
    <div
      onClick={onClick}
      title={`${cell.available_workforce}/${cell.assigned_employees} available`}
      style={{
        width: 44, minWidth: 44, height: 44, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isWeekend ? cellBg : cfg.bg,
        border: isToday ? '2px solid #e85d26' : `1px solid ${cfg.border}`,
        borderRadius: 4,
        cursor: 'pointer',
      }}
    >
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: cfg.text,
        fontFamily: "'DM Mono', monospace",
      }}>
        {pct}%
      </span>
    </div>
  );
}
