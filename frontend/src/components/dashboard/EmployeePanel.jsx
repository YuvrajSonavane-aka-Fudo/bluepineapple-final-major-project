// src/components/dashboard/EmployeePanel.jsx
import { useRef, useCallback } from 'react';
import { parseISO, isToday } from 'date-fns';
import DateStrip from './DateStrip';
import LeaveCell from '../shared/LeaveCell';

const AVATAR_COLORS = [
  '#3b5bdb', '#e85d26', '#7c3aed', '#0891b2',
  '#16a34a', '#dc2626', '#db2777', '#d97706',
];

export default function EmployeePanel({
  dateStrip = [], employees = [], loading,
  searchValue, onSearchChange,
  onCellClick, onDateClick,
  scrollRef, projectCells = {},
}) {
  const employeeCells = {};
  employees.forEach(emp => {
    Object.entries(emp.cells || {}).forEach(([date, cell]) => {
      if (cell) employeeCells[date] = true;
    });
  });

  const filtered = employees.filter(emp => {
    if (!searchValue) return true;
    return emp.full_name.toLowerCase().includes(searchValue.toLowerCase());
  });

  // One ref for the header strip, one array for every data row
  const headerRef = useRef(null);
  const rowRefs   = useRef([]);    // rowRefs.current[i] = cell-scroll div for row i
  const syncing   = useRef(false); // prevent infinite scroll event loop

  const syncAll = useCallback((scrollLeft) => {
    if (syncing.current) return;
    syncing.current = true;

    // Sync header strip
    if (headerRef.current) headerRef.current.scrollLeft = scrollLeft;
    // Sync external ref (passed from Dashboard for cross-panel coordination)
    if (scrollRef?.current) scrollRef.current.scrollLeft = scrollLeft;
    // Sync every data row
    rowRefs.current.forEach(el => { if (el) el.scrollLeft = scrollLeft; });

    syncing.current = false;
  }, [scrollRef]);

  return (
    <div style={s.root}>
      {/* Header row */}
      <div style={s.headerRow}>
        <div style={s.frozenHeader}>
          <span style={s.colLabel}>ID</span>
          <div style={s.searchWrap}>
            <SearchIcon />
            <input
              placeholder="Search Employees..."
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              style={s.search}
            />
          </div>
          <span style={{ ...s.colLabel, marginLeft: 'auto', paddingRight: 8 }}>L.C.</span>
        </div>

        {/* Date strip — scrolling this syncs all rows */}
        <div
          style={s.stripWrapper}
          ref={headerRef}
          onScroll={e => syncAll(e.currentTarget.scrollLeft)}
        >
          <DateStrip
            dateStrip={dateStrip}
            onDateClick={onDateClick}
            projectCells={projectCells}
            employeeCells={employeeCells}
          />
        </div>
      </div>

      {/* Body rows */}
      <div style={s.body}>
        {loading
          ? <LoadingRows />
          : filtered.length === 0
            ? <Empty searchValue={searchValue} />
            : filtered.map((emp, idx) => {
                const leaveCount = Object.values(emp.cells || {}).filter(c => c !== null).length;
                const avatarBg   = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const initials   = emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                return (
                  <div key={emp.user_id} style={s.row}>
                    <div style={s.frozenCell}>
                      <span style={s.empId}>#{emp.user_id.toString().padStart(4, '0')}</span>
                      <div style={{ ...s.avatar, background: avatarBg }}>{initials}</div>
                      <span style={s.empName}>{emp.full_name}</span>
                      <div style={s.lcBadge}>
                        <span style={s.lcNum}>{leaveCount.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Each row registers itself into the rowRefs array */}
                    <div
                      style={s.cellsRow}
                      ref={el => { rowRefs.current[idx] = el; }}
                      onScroll={e => syncAll(e.currentTarget.scrollLeft)}
                    >
                      <div style={{ display: 'flex', gap: 2, padding: '2px 4px' }}>
                        {dateStrip.map(d => (
                          <LeaveCell
                            key={d.date}
                            cell={emp.cells?.[d.date]}
                            dateInfo={d}
                            isToday={isToday(parseISO(d.date))}
                            onClick={() => onCellClick(emp, d.date)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
        }
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9aa0ad" strokeWidth="2" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  );
}

function LoadingRows() {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 44, borderRadius: 6,
          background: 'linear-gradient(90deg, #f0f2f5 0%, #e8eaed 50%, #f0f2f5 100%)',
          backgroundSize: '400px 100%',
          animation: 'shimmer 1.4s ease-in-out infinite',
          animationDelay: `${i * 100}ms`,
        }} />
      ))}
    </div>
  );
}

function Empty({ searchValue }) {
  return (
    <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9aa0ad' }}>
      <p style={{ fontSize: 13 }}>
        {searchValue ? `No employees matching "${searchValue}"` : 'No leave records in this period'}
      </p>
    </div>
  );
}

const FROZEN_W = 300;

const s = {
  root: {
    display: 'flex', flexDirection: 'column',
    height: '100%', overflow: 'hidden',
    background: '#ffffff',
  },
  headerRow: {
    display: 'flex',
    borderBottom: '2px solid #e8eaed',
    background: '#f8f9fb',
    flexShrink: 0,
  },
  frozenHeader: {
    width: FROZEN_W, minWidth: FROZEN_W,
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px',
    borderRight: '2px solid #e8eaed',
    flexShrink: 0,
  },
  colLabel: {
    fontSize: 11, fontWeight: 700, color: '#5a6272',
    letterSpacing: '0.3px', textTransform: 'uppercase',
    flexShrink: 0,
  },
  searchWrap: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 6,
    background: '#ffffff', border: '1px solid #e8eaed',
    borderRadius: 6, padding: '4px 8px',
  },
  search: {
    flex: 1, border: 'none', background: 'transparent',
    fontSize: 12, color: '#1a1f2e', outline: 'none',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  stripWrapper: {
    flex: 1, minWidth: 0,
    overflowX: 'scroll',
    overflowY: 'hidden',
    display: 'flex', alignItems: 'center',
    padding: '4px 0',
  },
  body: { flex: 1, overflowY: 'auto' },
  row: {
    display: 'flex', alignItems: 'center',
    borderBottom: '1px solid #f0f2f5',
    minHeight: 48,
  },
  frozenCell: {
    width: FROZEN_W, minWidth: FROZEN_W,
    display: 'flex', alignItems: 'center',
    padding: '4px 12px',
    borderRight: '2px solid #e8eaed',
    background: '#ffffff',
    flexShrink: 0, gap: 8,
  },
  empId: {
    fontSize: 11, color: '#9aa0ad',
    fontFamily: "'DM Mono', monospace",
    flexShrink: 0, minWidth: 40,
  },
  avatar: {
    width: 30, height: 30, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700, color: '#fff',
    flexShrink: 0,
  },
  empName: {
    fontSize: 13, fontWeight: 600, color: '#1a1f2e',
    flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  lcBadge: {
    background: '#eef2ff', border: '1px solid #c7d2fe',
    borderRadius: 99, padding: '1px 8px', flexShrink: 0,
  },
  lcNum: {
    fontSize: 11, fontWeight: 700, color: '#4338ca',
    fontFamily: "'DM Mono', monospace",
  },
  cellsRow: {
    flex: 1,
    overflowX: 'scroll',
    overflowY: 'hidden',
    display: 'flex', alignItems: 'center',
    scrollbarWidth: 'none', // rows are scroll-hidden; header is the only visible scrollbar
    msOverflowStyle: 'none',
  },
};