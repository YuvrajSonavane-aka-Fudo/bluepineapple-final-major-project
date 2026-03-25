import { useRef, useCallback, useEffect, useState } from 'react';
import { InputBase, Box, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DateStrip from './DateStrip';
import { Tooltip } from '@mui/material';

const HEADER_H = 40;
const THUMB_H  = 3;
const THUMB_W  = 350;

function useIsMobile() {
  const [mob, setMob] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mob;
}

function useFrozenWidth() {
  const [fw, setFw] = useState(() => window.innerWidth < 768 ? Math.min(140, Math.floor(window.innerWidth * 0.36)) : 300);
  useEffect(() => {
    const fn = () => setFw(window.innerWidth < 768 ? Math.min(140, Math.floor(window.innerWidth * 0.36)) : 300);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return fw;
}

export default function SharedHeader({
  dateStrip = [],
  projectCells = {},
  employeeCells = {},
  wfhCells = {},
  globalSearch,
  onGlobalSearchChange,
  onDateClick,
  scrollRef,
  empScrollRef,
  projScrollRef,
  legendVisible,
  onToggleLegend,
}) {
  const isMobile = useIsMobile();
  const FW = useFrozenWidth();
  const headerRef    = useRef(null);
  const scrollbarRef = useRef(null);
  const thumbRef     = useRef(null);
  const syncing      = useRef(false);

  // Expose headerRef as scrollRef so panels can drive this header
  useEffect(() => {
    if (scrollRef) scrollRef.current = headerRef.current;
  });

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
    if (headerRef.current)   headerRef.current.scrollLeft   = scrollLeft;
    if (empScrollRef?.current)  empScrollRef.current.scrollLeft  = scrollLeft;
    if (projScrollRef?.current) projScrollRef.current.scrollLeft = scrollLeft;
    updateThumb(scrollLeft);
    syncing.current = false;
  }, [empScrollRef, projScrollRef, updateThumb]);

  // Thumb drag
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

  // Wheel on the frozen col
  const frozenRef = useRef(null);
  useEffect(() => {
    const el = frozenRef.current;
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

  return (
    <Box sx={{
      display: 'flex', flexShrink: 0, position: 'relative',
      height: HEADER_H + THUMB_H + 6,
      borderBottom: '2px solid #c8cdd6',
      background: '#f8f9fb',
      zIndex: 20,
    }}>
      {/* Legend toggle — desktop only; mobile uses FAB */}
      <Box
  component="button"
  onClick={onToggleLegend}
  sx={{
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',

    width: 32,
    height: 32,

    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '50%',

    cursor: 'pointer',
    display: { xs: 'none', md: 'flex' },
    alignItems: 'center',
    justifyContent: 'center',

    color: '#6b7280',
    p: 0,
    zIndex: 50,

    boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
    transition: 'all 0.2s ease',

    '&:hover': {
      background: '#f9fafb',
      color: '#374151',
      transform: 'translateY(-50%) scale(1.1)',
    },

    '&:active': {
      transform: 'translateY(-50%) scale(0.96)',
    }
  }}
  title={legendVisible ? 'Hide Legend' : 'Show Legend'}
>
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    style={{
      transition: 'transform 0.2s ease',
      transform: legendVisible ? 'rotate(0deg)' : 'rotate(180deg)'
    }}
  >
    <polyline points="9,18 15,12 9,6" />
  </svg>
</Box>
      {/* Frozen column: ID label + global search + L.C. label */}
      <Box ref={frozenRef} sx={{
        width: FW, minWidth: FW, display: 'flex', alignItems: 'center', gap: isMobile ? 0.5 : 1,
        px: isMobile ? 0.75 : 1.5, pl: isMobile ? '8px' : '21px',
        background: '#f8f9fb', borderRight: '2px solid #c8cdd6',
        flexShrink: 0, height: '100%', boxSizing: 'border-box',
      }}>
        {/* On desktop show "ID" label; on mobile skip it to save space */}
        {!isMobile && (
          <Tooltip title="Employee ID" arrow>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#5a6272', letterSpacing: '0.3px', textTransform: 'uppercase', flexShrink: 0 }}>
              ID
            </Typography>
          </Tooltip>
        )}
        <Box sx={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 0.5,
          background: '#ffffff', border: '1px solid #e8eaed', borderRadius: '6px',
          px: 0.5, py: 0.4,
          mx: isMobile ? 0 : 1.5,
          overflow: 'hidden', minWidth: 0,
        }}>
          <SearchIcon sx={{ fontSize: 13, color: '#9aa0ad', flexShrink: 0 }} />
          <InputBase
            placeholder={isMobile ? 'Search…' : 'Search Employee/Project'}
            value={globalSearch}
            onChange={e => onGlobalSearchChange(e.target.value)}
            sx={{ flex: 1, fontSize: isMobile ? 11 : 12, color: '#1a1f2e', minWidth: 0, '& input': { p: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" } }}
          />
          {globalSearch && (
            <Box
              component="button"
              onClick={() => onGlobalSearchChange('')}
              sx={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#9aa0ad', p: 0, flexShrink: 0 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </Box>
          )}
        </Box>
        {/* L.C. label — hide on mobile, no room */}
        {!isMobile && (
          <Tooltip title="Leave Count" arrow>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#5a6272', letterSpacing: '0.3px', textTransform: 'uppercase', flexShrink: 0, ml: 'auto', pr: 1 }}>
              L.C.
            </Typography>
          </Tooltip>
        )}
      </Box>

      {/* Scrollable date strip + custom scrollbar thumb */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box
          ref={headerRef}
          onScroll={e => syncAll(e.currentTarget.scrollLeft)}
          sx={{
            flex: 1, overflowX: 'scroll', overflowY: 'hidden',
            height: HEADER_H, display: 'flex', alignItems: 'flex-start',
            scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <DateStrip
            dateStrip={dateStrip}
            onDateClick={onDateClick}
            projectCells={projectCells}
            employeeCells={employeeCells}
            wfhCells={wfhCells}
          />
        </Box>
        <Box
          ref={scrollbarRef}
          onClick={onTrackClick}
          sx={{ width: '100%', height: THUMB_H, position: 'relative', cursor: 'pointer', background: 'transparent' }}
        >
          <Box
            ref={thumbRef}
            sx={{
              position: 'absolute', top: '50%', mt: '-0.5px', left: '1px',
              width: THUMB_W, height: THUMB_H,
              background: '#c0c7d4', borderRadius: THUMB_H / 2,
              cursor: 'grab', willChange: 'transform',
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}