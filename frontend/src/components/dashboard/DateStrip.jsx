import { parseISO, isToday, format } from 'date-fns';
import { useState, useCallback } from 'react';

const CELL_W = 35;

export default function DateStrip({ dateStrip = [], onDateClick, projectCells = {}, employeeCells = {}, wfhCells = {} }) {
  const [tooltip, setTooltip] = useState(null); // { label, x, y }

  const handleMouseEnter = useCallback((e, label) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, x: rect.left + rect.width / 2, y: rect.bottom + 6 });
  }, []);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <>
      {/* Fixed tooltip rendered above everything via explicit screen coordinates */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translateX(-50%)',
          background: '#1a1f2e',
          color: '#fff',
          fontSize: 11,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          padding: '4px 8px',
          borderRadius: 5,
          pointerEvents: 'none',
          zIndex: 99999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          {tooltip.label}
          <span style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderBottom: '4px solid #1a1f2e',
          }} />
        </div>
      )}

      {/*  Removed zIndex: 100 — it was creating a stacking context that blocked the legend button */}
      <div style={{ display: 'flex', position: 'relative' }}>
        {dateStrip.map((d, i) => {
          const today     = isToday(parseISO(d.date));
          const isWeekend = d.is_weekend;
          const isHoliday = d.is_public_holiday;
          const risk      = projectCells[d.date];
          const hasLeave  = !!employeeCells[d.date];
          const hasWFH    = !!wfhCells[d.date];
          const dayNum    = d.date.slice(8);
          const dayLetter = d.day.slice(0, 3).toUpperCase();

          const isClickable = !isWeekend && (hasLeave || hasWFH || !!risk || isHoliday);

          let headerBg = '#f8f9fb';
          if (isWeekend)              headerBg = 'repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 2px,#f3f4f6 2px,#f3f4f6 5px)';
          else if (isHoliday)         headerBg = '#fefce8';
          else if (hasLeave)          headerBg = '#cfcfcf';
          else if (risk === 'HIGH')   headerBg = '#FEF2F2';
          else if (risk === 'MEDIUM') headerBg = '#FFF7ED';

          let textColor = '#5a6272';
          let numColor  = '#1a1f2e';
          if (isWeekend) { textColor = '#9aa0ad'; numColor = '#9aa0ad'; }
          if (today)     { textColor = '#994545'; numColor = '#994545'; }

          const tooltipLabel = format(parseISO(d.date), 'MMM d, yyyy').replace(', ', ',\u00A0\u00A0\u00A0');
          return (
            <div
              key={d.date}
              onClick={(e) => {
                if (!isClickable) return;
                const rect = e.currentTarget.getBoundingClientRect();
                onDateClick && onDateClick(d.date, rect);
              }}
              onMouseEnter={(e) => handleMouseEnter(e, tooltipLabel)}
              onMouseLeave={handleMouseLeave}
              style={{
                width: CELL_W, minWidth: CELL_W, height: 40,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: isClickable ? 'pointer' : 'default',
                flexShrink: 0, gap: 2,
                background: headerBg,
                borderTop: '1px solid #e8eaed',
                borderLeft: i === 0 ? '1px solid #e8eaed' : 'none',
                borderRight: '1px solid #e8eaed',
                borderBottom: (isHoliday && !isWeekend) ? '1px solid #fde68a' : '1px solid #e8eaed',
                boxSizing: 'border-box', position: 'relative',
                boxShadow: today ? 'inset 0 0 0 1px #994545' : 'none',
                //  Only today cells get elevated zIndex — not the whole strip
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
    </>
  );
}