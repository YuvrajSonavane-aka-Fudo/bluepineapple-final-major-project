// src/components/dashboard/DateStrip.jsx
// Colors match Legend.jsx exactly:
//   Current Day    → NO bg, 2px solid #994545border + dull red text only
//   Weekend        → #f3f4f6/#e5e7eb hatch
//   Public Holiday → #fefce8 bg, #fde68a border
//   Leave day      → dull red tint #FDE8E8 bg on header cell

import { parseISO, isToday } from 'date-fns';

const CELL_W = 35;

export default function DateStrip({ dateStrip = [], onDateClick, projectCells = {}, employeeCells = {} }) {
  return (
    <div style={{ display: 'flex' }}>
      {dateStrip.map((d, i) => {
        const today     = isToday(parseISO(d.date));
        const isWeekend = d.is_weekend;
        const isHoliday = d.is_public_holiday;
        const risk      = projectCells[d.date];
        const hasLeave  = !!employeeCells[d.date];

        const dayNum    = d.date.slice(8);
        const dayLetter = d.day.slice(0, 3).toUpperCase();

        // Background priority: weekend > holiday > leave tint > risk > default
        // today: no bg override — box-shadow handles the orange border
        let headerBg = '#f8f9fb';
        if (isWeekend)                            headerBg = 'repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 2px,#f3f4f6 2px,#f3f4f6 5px)';
        else if (isHoliday)                       headerBg = '#fefce8';
        else if (hasLeave)                        headerBg = '#ffe2e2';  // dull red tint
        else if (risk === 'HIGH')                 headerBg = '#FEF2F2';
        else if (risk === 'MEDIUM')               headerBg = '#FFF7ED';

        // Text colors
        let textColor = '#5a6272';
        let numColor  = '#1a1f2e';
        if (isWeekend) { textColor = '#9aa0ad'; numColor = '#9aa0ad'; }
        if (today)     { textColor = '#994545'; numColor = '#994545'; }

        // Borders
        const normalBorderR = '1px solid #e8eaed';
        const normalBorderL = i === 0 ? '1px solid #e8eaed' : 'none';
        const normalBorderT = '1px solid #e8eaed';
        const normalBorderB = (isHoliday && !isWeekend) ? '1px solid #fde68a' : '1px solid #e8eaed';

        return (
          <div
            key={d.date}
            onClick={(e) => onDateClick && onDateClick(d.date,e)}
            style={{
              width: CELL_W,
              minWidth: CELL_W,
              height: 40,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              gap: 2,
              background: headerBg,
              borderTop: normalBorderT,
              borderLeft: normalBorderL,
              borderRight: normalBorderR,
              borderBottom: normalBorderB,
              boxSizing: 'border-box',
              position: 'relative',
              // Today: inset box-shadow for clean unbroken dull red  border, no layout shift
              boxShadow: today ? 'inset 0 0 0 1px #994545' : 'none',
              zIndex: today ? 4 : 'auto',
            }}
          >
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: textColor,
              letterSpacing: '0.2px',
              lineHeight: 1,
            }}>
              {dayLetter}
            </span>
            <span style={{
              fontSize: 12,
              fontWeight: today ? 800 : 700,
              color: numColor,
              fontFamily: "'DM Mono', monospace",
              lineHeight: 1,
            }}>
              {dayNum}
            </span>

            {/* Holiday dot — only when no leave (avoid overlap) */}
            {isHoliday && !hasLeave && (
              <div style={{
                position: 'absolute',
                bottom: 3,
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#994545',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}