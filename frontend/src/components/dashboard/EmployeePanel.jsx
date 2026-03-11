// src/components/dashboard/EmployeePanel.jsx
// Today highlight: single absolutely-positioned overlay per row — no per-cell border/bg
// Alignment: stripWrapper height matches DateStrip cell height (40px), cellsRow height matches LeaveCell (35px)

import { useRef, useCallback } from 'react';
import { parseISO, isToday } from 'date-fns';
import DateStrip from './DateStrip';
import LeaveCell from '../shared/LeaveCell';

const CELL_W      = 35;  // must match LeaveCell width and DateStrip cell width
const HEADER_H    = 40;  // must match DateStrip cell height
const ROW_H       = 35;  // must match LeaveCell height
const TODAY_BORDER = '#994545';
const FROZEN_W    = 300;

export default function EmployeePanel({
  dateStrip = [], employees = [], loading,
  searchValue, onSearchChange,
  onCellClick, onDateClick,
  scrollRef, projectCells = {},
  showAll = true,
}) {
  const employeeCells = {};
  employees.forEach(emp => {
    Object.entries(emp.cells || {}).forEach(([date, cell]) => {
      if (cell) employeeCells[date] = true;
    });
  });

  const filtered = employees.filter(emp => {
    if (searchValue && !emp.full_name.toLowerCase().includes(searchValue.toLowerCase())) return false;
    if (!showAll) return Object.values(emp.cells || {}).some(c => c !== null);
    return true;
  });

  const headerRef = useRef(null);
  const rowRefs   = useRef([]);
  const syncing   = useRef(false);

  const syncAll = useCallback((scrollLeft) => {
    if (syncing.current) return;
    syncing.current = true;
    if (headerRef.current) headerRef.current.scrollLeft = scrollLeft;
    if (scrollRef?.current) scrollRef.current.scrollLeft = scrollLeft;
    rowRefs.current.forEach(el => { if (el) el.scrollLeft = scrollLeft; });
    syncing.current = false;
  }, [scrollRef]);

  const todayIdx  = dateStrip.findIndex(d => isToday(parseISO(d.date)));
  const todayLeft = todayIdx >= 0 ? todayIdx * CELL_W : null;

  return (
    <div style={s.root}>
      {/* ── Header row ── */}
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

        {/* Strip wrapper: exact height = HEADER_H so DateStrip cells align flush */}
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

      {/* ── Body ── */}
      <div style={s.body}>
        {loading
          ? <LoadingRows />
          : filtered.length === 0
            ? <Empty searchValue={searchValue} />
            : filtered.map((emp, idx) => {
                const leaveCount = Object.values(emp.cells || {}).filter(c => c !== null).length;

                return (
                  <div key={emp.user_id} style={s.row}>
                    <div style={s.frozenCell}>
                      <span style={s.empId}>#{emp.user_id.toString().padStart(4, '0')}</span>
                      <span style={s.empName}>{emp.full_name}</span>
                      <div style={s.lcBadge}><span style={s.lcNum}>{leaveCount.toFixed(1)}</span></div>
                    </div>

                    {/* cellsRow: exact height = ROW_H so LeaveCells align flush with header */}
                    <div
                      style={s.cellsRow}
                      ref={el => { rowRefs.current[idx] = el; }}
                      onScroll={e => syncAll(e.currentTarget.scrollLeft)}
                    >
                      {/* Today column overlay — one element, unbroken border, no bg */}
                      {todayLeft !== null && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: todayLeft,
                            width: CELL_W,
                            height: '100%',
                            borderLeft:  `1px solid ${TODAY_BORDER}`,
                            borderRight: `1px solid ${TODAY_BORDER}`,
                            pointerEvents: 'none',
                            zIndex: 10,
                            boxSizing: 'border-box',
                          }}
                        />
                      )}

                      <div style={{ display: 'flex', height: ROW_H }}>
                        {dateStrip.map((d, di) => (
                          <LeaveCell
                            key={d.date}
                            cell={emp.cells?.[d.date]}
                            dateInfo={d}
                            isFirst={di === 0}
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
        <div key={i} style={{ height: ROW_H, borderRadius: 4, background: 'linear-gradient(90deg,#f0f2f5 0%,#e8eaed 50%,#f0f2f5 100%)' }} />
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

const s = {
  root: {
    display: 'flex', flexDirection: 'column',
    height: '100%', overflow: 'hidden', background: '#ffffff',
  },
  headerRow: {
    display: 'flex', flexShrink: 0,
    height: HEADER_H,                        // ← explicit height locks header
    borderBottom: '2px solid #c8cdd6',
    background: '#f8f9fb',
  },
  frozenHeader: {
    width: FROZEN_W, minWidth: FROZEN_W,
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '0 12px', background: '#f8f9fb',
    borderRight: '2px solid #c8cdd6', flexShrink: 0,
    height: HEADER_H, boxSizing: 'border-box',paddingLeft:'21px'
  },
  colLabel: {
    fontSize: 12, fontWeight: 700, color: '#5a6272',
    letterSpacing: '0.3px', textTransform: 'uppercase', flexShrink: 0,
  },
  searchWrap: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 6,
    background: '#ffffff', border: '1px solid #e8eaed',
    borderRadius: 6, padding: '6px 8px',marginLeft:'15px',marginRight:'6px'
  },
  search: {
    flex: 1, border: 'none', background: 'transparent',
    fontSize: 12, color: '#1a1f2e', outline: 'none',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  // stripWrapper: NO alignItems — let DateStrip fill naturally from top, matching border edges
  stripWrapper: {
    flex: 1, minWidth: 0,
    overflowX: 'scroll', overflowY: 'hidden',
    height: HEADER_H,                        // ← exact height, no centering offset
    display: 'flex', alignItems: 'flex-start',
  },
  body: { flex: 1, overflowY: 'auto' },
  row: { display: 'flex', alignItems: 'stretch' },
  frozenCell: {
    width: FROZEN_W, minWidth: FROZEN_W,
    display: 'flex', alignItems: 'center', padding: '4px 12px',
    background: '#ffffff', borderRight: '2px solid #c8cdd6',
    borderBottom: '1px solid #e8eaed', flexShrink: 0, gap: 8,
    height: ROW_H, boxSizing: 'border-box',
  },
  empId: {
    fontSize: 11, color: '#9aa0ad',
    fontFamily: "'DM Mono', monospace", flexShrink: 0, minWidth: 40,
  },
  empName: {
    fontSize: 13, fontWeight: 600, color: '#1a1f2e',
    flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  lcBadge: {
    background: '#eef2ff', border: '1px solid #c7d2fe',
    borderRadius: 99, padding: '2px 8px', flexShrink: 0,
  },
  lcNum: {
    fontSize: 11, fontWeight: 700, color: '#4338ca',
    fontFamily: "'DM Mono', monospace",
  },
  // position: relative required for today overlay; height set explicitly on inner div
  cellsRow: {
    flex: 1,
    overflowX: 'scroll', overflowY: 'hidden',
    display: 'flex', alignItems: 'flex-start',  // ← flush from top, not centered
    scrollbarWidth: 'none', msOverflowStyle: 'none',
    position: 'relative',
  },
};