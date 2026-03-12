// src/components/dashboard/ProjectPanel.jsx
// Scrollbar: same slim travelling-pill as EmployeePanel — draggable, track-click, no native scrollbar

import { useRef, useCallback, useState, useEffect } from 'react';
import { parseISO, isToday } from 'date-fns';
import DateStrip from './DateStrip';
import RiskCell from '../shared/RiskCell';

const CELL_W       = 35;
const HEADER_H     = 40;
const ROW_H        = 35;
const TODAY_BORDER = '#994545';
const FROZEN_W     = 300;
const THUMB_H      = 3;
const THUMB_W      = 350;

export default function ProjectPanel({
  dateStrip = [], projects = [], loading,
  searchValue, onSearchChange,
  onCellClick, onDateClick,
  scrollRef, employeeCells = {},
}) {
  const [scrolled, setScrolled] = useState(false);

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
    if (scrollWidth <= clientWidth) { thumb.style.display = 'none'; return; }
    thumb.style.display = 'block';
    const trackW    = (scrollbarRef.current?.clientWidth || clientWidth) - 8;
    const maxScroll = scrollWidth - clientWidth;
    const maxThumbX = trackW - THUMB_W;
    const thumbX    = maxScroll > 0 ? (scrollLeft / maxScroll) * maxThumbX : 0;
    thumb.style.transform = `translateX(${thumbX + 4}px)`;
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
    let startX = 0, startScroll = 0;

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
    const clickX    = e.clientX - rect.left - 4;
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



  // Route wheel events on the body area to syncAll for smooth horizontal scroll
  const bodyRef = useRef(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const handler = (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return; // let vertical scroll pass through
      e.preventDefault();
      const current = headerRef.current?.scrollLeft || 0;
      syncAll(Math.max(0, current + e.deltaX));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [syncAll]);

  const todayIdx  = dateStrip.findIndex(d => isToday(parseISO(d.date)));
  const todayLeft = todayIdx >= 0 ? todayIdx * CELL_W : null;

  return (
    <div style={s.root}>
      {/* Header row */}
      <div style={s.headerRow}>
        <div style={{ ...s.frozenHeader, ...(scrolled && s.frozenShadow) }}>
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

          {/* Slim travelling pill scrollbar */}
          <div
            ref={scrollbarRef}
            style={s.scrollTrack}
            onClick={onTrackClick}
          >
            <div ref={thumbRef} style={s.scrollThumb} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={s.body} ref={bodyRef}>
        {loading ? <LoadingRows /> : filtered.length === 0 ? <Empty searchValue={searchValue} /> : (
          filtered.map((proj, idx) => (
            <div key={proj.project_id} style={s.row}>
              <div style={{ ...s.frozenCell, ...(scrolled && s.frozenShadow) }}>
                <span style={s.projName}>{proj.project_name}</span>
              </div>

              <div
                style={s.cellsRow}
                ref={el => { rowRefs.current[idx] = el; }}
                onScroll={e => syncAll(e.currentTarget.scrollLeft)}

              >
                {todayLeft !== null && (
                  <div style={{
                    position: 'absolute', top: 0, left: todayLeft,
                    width: CELL_W, height: '100%',
                    borderLeft: `1px solid ${TODAY_BORDER}`,
                    borderRight: `1px solid ${TODAY_BORDER}`,
                    pointerEvents: 'none', zIndex: 10, boxSizing: 'border-box',
                  }} />
                )}
                <div style={{ display: 'flex', height: ROW_H, flexShrink: 0 }}>
                  {dateStrip.map((d, di) => (
                    <RiskCell
                      key={d.date}
                      cell={proj.cells?.[d.date]}
                      dateInfo={d}
                      isFirst={di === 0}
                      isToday={isToday(parseISO(d.date))}
                      onClick={(rect) => onCellClick(proj, d.date, rect)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))
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
        <div key={i} style={{ height: ROW_H, borderRadius: 4, background: 'linear-gradient(90deg,#f0f2f5 0%,#e8eaed 50%,#f0f2f5 100%)' }} />
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

const s = {
  root: {
    display: 'flex', flexDirection: 'column',
    height: '100%', overflow: 'hidden',
    background: '#ffffff', borderTop: '2px solid #e8eaed',
  },
  headerRow: {
    display: 'flex', flexShrink: 0,
    height: HEADER_H + THUMB_H + 6,   // matches EmployeePanel
    borderBottom: '2px solid #c8cdd6',
    background: '#f8f9fb',
  },
  frozenHeader: {
    width: FROZEN_W, minWidth: FROZEN_W,
    display: 'flex', alignItems: 'center', padding: '0 12px',
    background: '#f8f9fb', borderRight: '2px solid #c8cdd6',
    flexShrink: 0, height: '100%', boxSizing: 'border-box',
    transition: 'box-shadow 0.2s ease',
  },
  frozenShadow: {
    boxShadow: '4px 0 12px -2px rgba(0,0,0,0.12)',
  },
  searchWrap: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 6,
    background: '#ffffff', border: '1px solid #e8eaed',
    borderRadius: 6, padding: '6px 8px',
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
    height: THUMB_H,
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
    display: 'flex', alignItems: 'center', padding: '4px 14px',
    background: '#ffffff', borderRight: '2px solid #c8cdd6',
    borderBottom: '1px solid #e8eaed', flexShrink: 0,
    height: ROW_H, boxSizing: 'border-box',
    transition: 'box-shadow 0.2s ease',
  },
  projName: {
    fontSize: 13, fontWeight: 600, color: '#1a1f2e',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  cellsRow: {
    flex: 1,
    overflowX: 'hidden', overflowY: 'hidden',
    display: 'flex', alignItems: 'flex-start',
    scrollbarWidth: 'none', msOverflowStyle: 'none',
    position: 'relative',
  },
};