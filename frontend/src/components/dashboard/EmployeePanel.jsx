// src/components/dashboard/EmployeePanel.jsx
import { useRef, useCallback, useState, useEffect } from 'react';
import { parseISO, isToday } from 'date-fns';
import { InputBase, Box, Typography, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DateStrip from './DateStrip';
import LeaveCell from '../shared/LeaveCell';

const CELL_W   = 35;
const HEADER_H = 40;
const ROW_H    = 35;
const FROZEN_W = 300;
const THUMB_H  = 3;
const THUMB_W  = 350;
const TODAY_BORDER = '#994545';

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
    Object.entries(emp.cells || {}).forEach(([date, cell]) => { if (cell) employeeCells[date] = true; });
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

  useEffect(() => {
    updateThumb(0);
    const ro = new ResizeObserver(() => updateThumb(headerRef.current?.scrollLeft || 0));
    if (headerRef.current) ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [updateThumb, dateStrip]);

  const bodyRef = useRef(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const handler = (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#ffffff' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexShrink: 0, height: HEADER_H + THUMB_H + 6, borderBottom: '2px solid #c8cdd6', background: '#f8f9fb' }}>
        <Box sx={{
          width: FROZEN_W, minWidth: FROZEN_W, display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, pl: '21px', background: '#f8f9fb', borderRight: '2px solid #c8cdd6',
          flexShrink: 0, height: '100%', boxSizing: 'border-box',
          transition: 'box-shadow 0.2s ease',
          ...(scrolled && { boxShadow: '4px 0 12px -2px rgba(0,0,0,0.12)' }),
        }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#5a6272', letterSpacing: '0.3px', textTransform: 'uppercase', flexShrink: 0 }}>ID</Typography>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75, background: '#ffffff', border: '1px solid #e8eaed', borderRadius: '6px', px: 1, py: 0.75, mx: 1.5 }}>
            <SearchIcon sx={{ fontSize: 13, color: '#9aa0ad', flexShrink: 0 }} />
            <InputBase
              placeholder="Search Employees..."
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              sx={{ flex: 1, fontSize: 12, color: '#1a1f2e', '& input': { p: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" } }}
            />
          </Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#5a6272', letterSpacing: '0.3px', textTransform: 'uppercase', flexShrink: 0, ml: 'auto', pr: 1 }}>L.C.</Typography>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Box ref={headerRef} onScroll={e => syncAll(e.currentTarget.scrollLeft)}
            sx={{ flex: 1, overflowX: 'scroll', overflowY: 'hidden', height: HEADER_H, display: 'flex', alignItems: 'flex-start', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
            <DateStrip dateStrip={dateStrip} onDateClick={onDateClick} projectCells={projectCells} employeeCells={employeeCells} />
          </Box>
          <Box ref={scrollbarRef} onClick={onTrackClick}
            sx={{ width: '100%', height: THUMB_H, position: 'relative', cursor: 'pointer', background: 'transparent', boxSizing: 'border-box' }}>
            <Box ref={thumbRef} sx={{ position: 'absolute', top: '50%', mt: '-0.5px', left: '1px', width: THUMB_W, height: THUMB_H, background: '#c0c7d4', borderRadius: THUMB_H / 2, cursor: 'grab', willChange: 'transform' }} />
          </Box>
        </Box>
      </Box>

      {/* Body */}
      <Box ref={bodyRef} sx={{ flex: 1, overflowY: 'auto' }}>
        {loading
          ? <LoadingRows />
          : filtered.length === 0
            ? <EmptyState searchValue={searchValue} />
            : filtered.map((emp, idx) => {
                const leaveCount = Object.values(emp.cells || {}).filter(c => c !== null).length;
                return (
                  <Box key={emp.user_id} sx={{ display: 'flex', alignItems: 'stretch' }}>
                    <Box sx={{
                      width: FROZEN_W, minWidth: FROZEN_W, display: 'flex', alignItems: 'center',
                      px: 1.5, background: '#ffffff', borderRight: '2px solid #c8cdd6',
                      borderBottom: '1px solid #e8eaed', flexShrink: 0, gap: 1,
                      height: ROW_H, boxSizing: 'border-box', transition: 'box-shadow 0.2s ease',
                      ...(scrolled && { boxShadow: '4px 0 12px -2px rgba(0,0,0,0.12)' }),
                    }}>
                      <Typography sx={{ fontSize: 11, color: '#9aa0ad', fontFamily: "'DM Mono', monospace", flexShrink: 0, minWidth: 40 }}>
                        #{emp.user_id.toString().padStart(4, '0')}
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1a1f2e', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {emp.full_name}
                      </Typography>
                      <Box sx={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 99, px: 1, py: '2px', flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#4338ca', fontFamily: "'DM Mono', monospace" }}>
                          {leaveCount.toFixed(1)}
                        </Typography>
                      </Box>
                    </Box>

                    <Box ref={el => { rowRefs.current[idx] = el; }} onScroll={e => syncAll(e.currentTarget.scrollLeft)}
                      sx={{ flex: 1, overflowX: 'hidden', overflowY: 'hidden', display: 'flex', alignItems: 'flex-start', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, position: 'relative' }}>
                      {todayLeft !== null && (
                        <Box sx={{ position: 'absolute', top: 0, left: todayLeft, width: CELL_W, height: '100%', borderLeft: `1px solid ${TODAY_BORDER}`, borderRight: `1px solid ${TODAY_BORDER}`, pointerEvents: 'none', zIndex: 10, boxSizing: 'border-box' }} />
                      )}
                      <Box sx={{ display: 'flex', height: ROW_H }}>
                        {dateStrip.map((d, di) => (
                          <LeaveCell key={d.date} cell={emp.cells?.[d.date]} dateInfo={d} isFirst={di === 0} onClick={(rect) => onCellClick(emp, d.date, rect)} />
                        ))}
                      </Box>
                    </Box>
                  </Box>
                );
              })
        }
      </Box>
    </Box>
  );
}

function LoadingRows() {
  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {[1, 2, 3].map(i => (
        <Box key={i} sx={{ height: ROW_H, borderRadius: '4px', background: 'linear-gradient(90deg,#f0f2f5 0%,#e8eaed 50%,#f0f2f5 100%)' }} />
      ))}
    </Box>
  );
}

function EmptyState({ searchValue }) {
  return (
    <Box sx={{ p: 5, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 13, color: '#9aa0ad' }}>
        {searchValue ? `No employees matching "${searchValue}"` : 'No leave records in this period'}
      </Typography>
    </Box>
  );
}
