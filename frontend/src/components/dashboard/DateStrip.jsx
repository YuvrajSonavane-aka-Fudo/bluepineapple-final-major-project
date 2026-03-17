// src/components/dashboard/DateStrip.jsx
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

        let headerBg = '#f8f9fb';
        if (isWeekend)          headerBg = 'repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 2px,#f3f4f6 2px,#f3f4f6 5px)';
        else if (isHoliday)     headerBg = '#fefce8';
        else if (hasLeave)      headerBg = '#cfcfcf';
        else if (risk === 'HIGH')   headerBg = '#FEF2F2';
        else if (risk === 'MEDIUM') headerBg = '#FFF7ED';

        let textColor = '#5a6272';
        let numColor  = '#1a1f2e';
        if (isWeekend) { textColor = '#9aa0ad'; numColor = '#9aa0ad'; }
        if (today)     { textColor = '#994545'; numColor = '#994545'; }

        return (
          <div
            key={d.date}
            onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); onDateClick && onDateClick(d.date, rect); }}
            style={{
              width: CELL_W, minWidth: CELL_W, height: 40,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, gap: 2,
              background: headerBg,
              borderTop: '1px solid #e8eaed',
              borderLeft: i === 0 ? '1px solid #e8eaed' : 'none',
              borderRight: '1px solid #e8eaed',
              borderBottom: (isHoliday && !isWeekend) ? '1px solid #fde68a' : '1px solid #e8eaed',
              boxSizing: 'border-box', position: 'relative',
              boxShadow: today ? 'inset 0 0 0 1px #994545' : 'none',
              zIndex: today ? 4 : 'auto',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: hasLeave ? 600 : 500, color: textColor, letterSpacing: '0.2px', lineHeight: 1 }}>
              {dayLetter}
            </span>
            <span style={{ fontSize: 12, fontWeight: today ? 800 : hasLeave ? 700 : 400, color: numColor, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
              {dayNum}
            </span>
          </div>
        );
      })}
    </div>
  );
}
