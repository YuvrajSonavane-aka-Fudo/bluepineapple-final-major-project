// src/components/dashboard/EmployeePanel.jsx
// Today highlight: single absolutely-positioned overlay per row — no per-cell border/bg
// Alignment: stripWrapper height matches DateStrip cell height (40px), cellsRow height matches LeaveCell (35px)

import { useRef, useCallback, useState, useEffect } from 'react';
import { parseISO, isToday } from 'date-fns';
import DateStrip from './DateStrip';
import LeaveCell from '../shared/LeaveCell';

const CELL_W       = 35;
const HEADER_H     = 40;
const ROW_H        = 35;
const TODAY_BORDER = '#994545';
const FROZEN_W     = 300;
const THUMB_H      = 3;
const THUMB_W      = 350; // fixed small pill width

export default function EmployeePanel({
  dateStrip = [], employees = [], loading,
  searchValue, onSearchChange,
  onCellClick, onDateClick,
  scrollRef, projectCells = {},
  showAll = true,
}) {
  const [scrolled, setScrolled] = useState(false);

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

  const headerRef    = useRef(null);
  const rowRefs      = useRef([]);
  const scrollbarRef = useRef(null);
  const thumbRef     = useRef(null);
  const syncing      = useRef(false);

  const updateThumb = useCallback((scrollLeft) => {
    const container = headerRef.current;
    const thumb     = thumbRef.current;
    if (!container || !thumb) return;

    const { scrollWidth, clientWidth } = container;
    if (scrollWidth <= clientWidth) {
      thumb.style.display = 'none';
      return;
    }
    thumb.style.display = 'block';

    const trackW    = (scrollbarRef.current?.clientWidth || clientWidth) - 8; // 4px padding each side
    const maxScroll = scrollWidth - clientWidth;
    const maxThumbX = trackW - THUMB_W;
    const thumbX    = maxScroll > 0 ? (scrollLeft / maxScroll) * maxThumbX : 0;

    thumb.style.transform = `translateX(${thumbX + 4}px)`; // +4 for left padding
  }, []);

  const syncAll = useCallback((scrollLeft) => {
    if (syncing.current) return;
    syncing.current = true;
    setScrolled(scrollLeft > 0);
    if (headerRef.current) headerRef.current.scrollLeft = scrollLeft;
    if (scrollRef?.current) scrollRef.current.scrollLeft = scrollLeft;
    rowRefs.current.forEach(el => { if (el) el.scrollLeft = scrollLeft; });
    updateThumb(scrollLeft);
    syncing.current = false;
  }, [scrollRef, updateThumb]);

  // Drag thumb
  useEffect(() => {
    const thumb = thumbRef.current;
    if (!thumb) return;

    let startX      = 0;
    let startScroll = 0;

    const onMouseMove = (e) => {
      const container = headerRef.current;
      if (!container) return;
      const trackW    = (scrollbarRef.current?.clientWidth || container.clientWidth) - 8;
      const { scrollWidth, clientWidth } = container;
      const maxScroll = scrollWidth - clientWidth;
      const maxThumbX = trackW - THUMB_W;
      const dx        = e.clientX - startX;
      const newScroll = Math.max(0, Math.min(maxScroll, startScroll + (dx / maxThumbX) * maxScroll));
      syncAll(newScroll);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      thumb.style.cursor = 'grab';
    };

    const onMouseDown = (e) => {
      e.preventDefault();
      startX      = e.clientX;
      startScroll = headerRef.current?.scrollLeft || 0;
      thumb.style.cursor = 'grabbing';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    thumb.addEventListener('mousedown', onMouseDown);
    return () => thumb.removeEventListener('mousedown', onMouseDown);
  }, [syncAll]);

  // Click track to jump
  const onTrackClick = useCallback((e) => {
    if (e.target === thumbRef.current) return;
    const container = headerRef.current;
    if (!container) return;
    const rect      = scrollbarRef.current.getBoundingClientRect();
    const clickX    = e.clientX - rect.left - 4; // account for padding
    const trackW    = rect.width - 8;
    const { scrollWidth, clientWidth } = container;
    const maxScroll = scrollWidth - clientWidth;
    const newScroll = Math.max(0, Math.min(maxScroll, (clickX / trackW) * maxScroll));
    syncAll(newScroll);
  }, [syncAll]);

  // Init + resize
  useEffect(() => {
    updateThumb(0);
    const ro = new ResizeObserver(() => updateThumb(headerRef.current?.scrollLeft || 0));
    if (headerRef.current) ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [updateThumb, dateStrip]);

  const todayIdx  = dateStrip.findIndex(d => isToday(parseISO(d.date)));
  const todayLeft = todayIdx >= 0 ? todayIdx * CELL_W : null;

  return (
    <div style={s.root}>
      {/* ── Header row ── */}
      <div style={s.headerRow}>
        <div style={{ ...s.frozenHeader, ...(scrolled && s.frozenShadow) }}>
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

        <div style={s.stripOuter}>
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

          {/* Slim track with fixed-width travelling pill */}
          <div
            ref={scrollbarRef}
            style={s.scrollTrack}
            onClick={onTrackClick}
          >
            <div ref={thumbRef} style={s.scrollThumb} />
          </div>
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
                    <div style={{ ...s.frozenCell, ...(scrolled && s.frozenShadow) }}>
                      <span style={s.empId}>#{emp.user_id.toString().padStart(4, '0')}</span>
                      <span style={s.empName}>{emp.full_name}</span>
                      <div style={s.lcBadge}><span style={s.lcNum}>{leaveCount.toFixed(1)}</span></div>
                    </div>

                    <div
                      style={s.cellsRow}
                      ref={el => { rowRefs.current[idx] = el; }}
                      onScroll={e => syncAll(e.currentTarget.scrollLeft)}
                    >
                      {todayLeft !== null && (
                        <div
                          style={{
                            position: 'absolute', top: 0, left: todayLeft,
                            width: CELL_W, height: '100%',
                            borderLeft: `1px solid ${TODAY_BORDER}`,
                            borderRight: `1px solid ${TODAY_BORDER}`,
                            pointerEvents: 'none', zIndex: 10, boxSizing: 'border-box',
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
                            onClick={(e) => onCellClick(emp, d.date,e)}
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
    height: HEADER_H + THUMB_H + 6,
    borderBottom: '2px solid #c8cdd6',
    background: '#f8f9fb',
  },
  frozenHeader: {
    width: FROZEN_W, minWidth: FROZEN_W,
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '0 12px', background: '#f8f9fb',
    borderRight: '2px solid #c8cdd6', flexShrink: 0,
    height: '100%', boxSizing: 'border-box', paddingLeft: '21px',
    transition: 'box-shadow 0.2s ease',
  },
  colLabel: {
    fontSize: 12, fontWeight: 700, color: '#5a6272',
    letterSpacing: '0.3px', textTransform: 'uppercase', flexShrink: 0,
  },
  searchWrap: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 6,
    background: '#ffffff', border: '1px solid #e8eaed',
    borderRadius: 6, padding: '6px 8px', marginLeft: '15px', marginRight: '6px',
  },
  search: {
    flex: 1, border: 'none', background: 'transparent',
    fontSize: 12, color: '#1a1f2e', outline: 'none',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  stripOuter: {
    flex: 1, minWidth: 0,
    display: 'flex', flexDirection: 'column',
  },
  stripWrapper: {
    flex: 1,
    overflowX: 'scroll', overflowY: 'hidden',
    height: HEADER_H,
    display: 'flex', alignItems: 'flex-start',
    scrollbarWidth: 'none', msOverflowStyle: 'none',
  },
  scrollTrack: {
    width: '100%',
    height: THUMB_H ,
    position: 'relative',
    cursor: 'pointer',
    background: 'transparent',
    boxSizing: 'border-box',
  },
  scrollThumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -0.5,
    left: 1,
    width: THUMB_W,
    height: THUMB_H,
    background: '#c0c7d4',
    borderRadius: THUMB_H / 2,
    cursor: 'grab',
    willChange: 'transform',
  },
  body: { flex: 1, overflowY: 'auto' },
  row: { display: 'flex', alignItems: 'stretch' },
  frozenCell: {
    width: FROZEN_W, minWidth: FROZEN_W,
    display: 'flex', alignItems: 'center', padding: '4px 12px',
    background: '#ffffff', borderRight: '2px solid #c8cdd6',
    borderBottom: '1px solid #e8eaed', flexShrink: 0, gap: 8,
    height: ROW_H, boxSizing: 'border-box',
    transition: 'box-shadow 0.2s ease',
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
  cellsRow: {
    flex: 1,
    overflowX: 'scroll', overflowY: 'hidden',
    display: 'flex', alignItems: 'flex-start',
    scrollbarWidth: 'none', msOverflowStyle: 'none',
    position: 'relative',
  },
  frozenShadow: {
    boxShadow: '4px 0 12px -2px rgba(0,0,0,0.12)',
  },
};