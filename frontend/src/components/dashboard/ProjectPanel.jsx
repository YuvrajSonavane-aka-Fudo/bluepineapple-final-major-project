// src/components/dashboard/ProjectPanel.jsx
// Today overlay: Legend "Current Day" → no bg, 1px solid #994545

import { useRef, useCallback } from 'react';
import { parseISO, isToday } from 'date-fns';
import DateStrip from './DateStrip';
import RiskCell from '../shared/RiskCell';

const CELL_W = 35;

const TODAY_BORDER = '#994545';

export default function ProjectPanel({
  dateStrip = [], projects = [], loading,
  searchValue, onSearchChange,
  onCellClick, onDateClick,
  scrollRef, employeeCells = {},
}) {
  const projectCells = {};
  projects.forEach(proj => {
    Object.entries(proj.cells || {}).forEach(([date, cell]) => {
      if (cell && cell.employees_on_leave > 0) {
        const order = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        if (!projectCells[date] || order[cell.risk_level] > order[projectCells[date]])
          projectCells[date] = cell.risk_level;
      }
    });
  });

  const filtered = projects.filter(p =>
    !searchValue || p.project_name.toLowerCase().includes(searchValue.toLowerCase())
  );

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
      {/* Header row */}
      <div style={s.headerRow}>
        <div style={s.frozenHeader}>
          <div style={s.searchWrap}>
            <SearchIcon />
            <input
              placeholder="Search Projects..."
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              style={s.search}
            />
          </div>
        </div>

        <div style={s.stripWrapper} ref={headerRef} onScroll={e => syncAll(e.currentTarget.scrollLeft)}>
          <DateStrip
              dateStrip={dateStrip}
              onDateClick={onDateClick}
              projectCells={projectCells}
              employeeCells={employeeCells}
            />
        </div>
      </div>

      {/* Body */}
      <div style={s.body}>
        {loading ? <LoadingRows /> : filtered.length === 0 ? <Empty searchValue={searchValue} /> : (
          filtered.map((proj, idx) => {
            const isLastRow = idx === filtered.length - 1;
            return (
              <div key={proj.project_id} style={s.row}>
                <div style={s.frozenCell}>
                  <span style={s.projName}>{proj.project_name}</span>
                </div>

                <div
                  style={s.cellsRow}
                  ref={el => { rowRefs.current[idx] = el; }}
                  onScroll={e => syncAll(e.currentTarget.scrollLeft)}
                >
                  <div style={{ display: 'flex' }}>
                    {dateStrip.map((d, di) => (
                      <RiskCell
                        key={d.date}
                        cell={proj.cells?.[d.date]}
                        dateInfo={d}
                        isFirst={di === 0}
                        isToday={isToday(parseISO(d.date))}
                        onClick={() => onCellClick(proj, d.date)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
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
      {[1, 2].map(i => (
        <div key={i} style={{ height: 37, borderRadius: 4, background: 'linear-gradient(90deg,#f0f2f5 0%,#e8eaed 50%,#f0f2f5 100%)' }} />
      ))}
    </div>
  );
}

function Empty({ searchValue }) {
  return (
    <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9aa0ad' }}>
      <p style={{ fontSize: 13 }}>{searchValue ? `No projects matching "${searchValue}"` : 'No projects to display'}</p>
    </div>
  );
}

const FROZEN_W = 220;

const s = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#ffffff', borderTop: '2px solid #e8eaed' },
  headerRow: { display: 'flex', flexShrink: 0, borderBottom: '2px solid #c8cdd6', background: '#f8f9fb' },
  frozenHeader: {
    width: FROZEN_W, minWidth: FROZEN_W,
    display: 'flex', alignItems: 'center', padding: '0 12px',
    background: '#f8f9fb', borderRight: '2px solid #c8cdd6',
    flexShrink: 0, height: 40, boxSizing: 'border-box',
  },
  searchWrap: { flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #e8eaed', borderRadius: 6, padding: '4px 8px' },
  search: { flex: 1, border: 'none', background: 'transparent', fontSize: 12, color: '#1a1f2e', outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  stripWrapper: { flex: 1, minWidth: 0, overflowX: 'scroll', overflowY: 'hidden', position: 'relative', display: 'flex', alignItems: 'center' },
  body: { flex: 1, overflowY: 'auto' },
  row: { display: 'flex', alignItems: 'stretch' },
  frozenCell: {
    width: FROZEN_W, minWidth: FROZEN_W,
    display: 'flex', alignItems: 'center', padding: '4px 14px',
    background: '#ffffff', borderRight: '2px solid #c8cdd6',
    borderBottom: '1px solid #e8eaed', flexShrink: 0,
    height: 37, boxSizing: 'border-box',
  },
  projName: { fontSize: 13, fontWeight: 600, color: '#1a1f2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cellsRow: { flex: 1, overflowX: 'hidden', overflowY: 'hidden', display: 'flex', alignItems: 'center', position: 'relative' },
};