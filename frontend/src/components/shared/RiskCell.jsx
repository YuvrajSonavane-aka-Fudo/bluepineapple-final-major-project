// src/components/shared/RiskCell.jsx
// ALL colors match Legend.jsx RISK LEVELS exactly

// Legend:
//   Low Risk    bg:#ECFDF5  border:#86EFAC  text:#16A34A
//   Medium Risk bg:#FFF7ED  border:#FDBA74  text:#EA580C
//   High Risk   bg:#FEF2F2  border:#FCA5A5  text:#DC2626

const RISK_CFG = {
  HIGH:   { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' },
  MEDIUM: { bg: '#FFF7ED', text: '#EA580C', border: '#FDBA74' },
  LOW:    { bg: '#ECFDF5', text: '#16A34A', border: '#86EFAC' },
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
    boxSizing: 'border-box',
    padding: 0,
  };

  let cellBg = '#ffffff';
  if (isWeekend) cellBg = 'repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 2px,#f3f4f6 2px,#f3f4f6 5px)';
  if (isHoliday && !isWeekend) cellBg = '#fefce8';
  if (isToday) cellBg = '#fff7ed';

  // No leave data or zero on leave → show as Low Risk or empty
  if (!cell || cell.employees_on_leave === 0) {
    const pct = cell ? Math.round((cell.available_workforce / (cell.assigned_employees || 1)) * 100) : null;
    return (
      <div onClick={cell ? onClick : undefined}
        style={{ ...sharedStyle, background: (isWeekend || isHoliday) ? cellBg : (cell ? RISK_CFG.LOW.bg : '#ffffff'), cursor: cell ? 'pointer' : 'default' }}>
        {cell && !isWeekend && (
          <span style={{ fontSize: 11, fontWeight: 700, color: RISK_CFG.LOW.text, fontFamily: "'DM Mono', monospace" }}>
            {pct}%
          </span>
        )}
      </div>
    );
  }

  const cfg = RISK_CFG[cell.risk_level] || RISK_CFG.LOW;
  const pct = Math.round((cell.available_workforce / (cell.assigned_employees || 1)) * 100);

  return (
    <div onClick={onClick}
      title={`${cell.available_workforce}/${cell.assigned_employees} available`}
      style={{ ...sharedStyle, background: (isWeekend || isHoliday) ? cellBg : cfg.bg, cursor: 'pointer' }}>
      {!isWeekend && (
        <span style={{ fontSize: 11, fontWeight: 700, color: cfg.text, fontFamily: "'DM Mono', monospace" }}>
          {pct}%
        </span>
      )}
    </div>
  );
}