// src/components/dashboard/DateStrip.jsx
import { parseISO, isToday } from 'date-fns';

export default function DateStrip({ dateStrip = [], onDateClick, projectCells = {}, employeeCells = {} }) {
  return (
    <div style={{ display: 'flex', gap: 2, padding: '0 4px' }}>
      {dateStrip.map((d) => {
        const today     = isToday(parseISO(d.date));
        const isWeekend = d.is_weekend;
        const isHoliday = d.is_public_holiday;
        const risk      = projectCells[d.date];
        const hasLeave  = employeeCells[d.date];

        const dayNum = d.date.slice(8); // "01"
        const dayLetter = d.day.slice(0, 3).toUpperCase(); // "MON"

        // Color-code date header background per mock
        let headerBg = 'transparent';
        let textColor = '#5a6272';
        let numColor  = '#1a1f2e';
        let borderColor = 'transparent';

        if (isWeekend) { textColor = '#9aa0ad'; numColor = '#9aa0ad'; }
        if (isHoliday) { headerBg = '#fef9e7'; }
        if (today)     { borderColor = '#e85d26'; numColor = '#e85d26'; textColor = '#e85d26'; }
        if (risk === 'HIGH' && !isWeekend)   headerBg = '#fff1f0';
        if (risk === 'MEDIUM' && !isWeekend) headerBg = '#fffbe6';

        return (
          <div
            key={d.date}
            onClick={() => onDateClick && onDateClick(d.date)}
            style={{
              width: 44, minWidth: 44, height: 44,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, gap: 1,
              background: headerBg,
              border: `2px solid ${borderColor}`,
              borderRadius: 4,
              transition: 'background 120ms',
            }}
          >
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: textColor,
              letterSpacing: '0.3px',
              lineHeight: 1,
            }}>
              {dayLetter}
            </span>
            <span style={{
              fontSize: 13, fontWeight: today ? 800 : 600,
              color: numColor,
              fontFamily: "'DM Mono', monospace",
              lineHeight: 1,
            }}>
              {dayNum}
            </span>
            {isHoliday && (
              <div style={{
                position: 'absolute', bottom: 2,
                width: 4, height: 4, borderRadius: '50%',
                background: '#d97706',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
