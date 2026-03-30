import { useRef, useCallback, useEffect, useState } from 'react';
import { parseISO, isToday } from 'date-fns';
import { Box, Typography } from '@mui/material';
import LeaveCell from '../shared/LeaveCell';

const CELL_W       = 35;
const ROW_H        = 35;
const TODAY_BORDER = '#994545';

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

export default function EmployeePanel({
  dateStrip = [], employees = [], loading,
  globalSearch = '',
  onCellClick,
  scrollRef,
  headerScrollRef,
  projScrollRef,
  showAll = true,
}) {
  const isMobile = useIsMobile();
  const FW = useFrozenWidth();
  const rowRefs  = useRef([]);
  const syncing  = useRef(false);
  const bodyRef  = useRef(null);

  const filtered = showAll
    ? employees
    : employees.filter(emp => Object.values(emp.cells || {}).some(c => c !== null));

  // Clear stale refs whenever the filtered list length changes
  // This prevents old row refs from being at wrong indices after showAll toggles
  useEffect(() => {
    rowRefs.current = rowRefs.current.slice(0, filtered.length);
  }, [filtered.length]);

  // --- sync helper ---
  const syncAll = useCallback((scrollLeft) => {
    if (syncing.current) return;
    syncing.current = true;
    rowRefs.current.forEach(el => { if (el) el.scrollLeft = scrollLeft; });
    if (headerScrollRef?.current) headerScrollRef.current.scrollLeft = scrollLeft;
    if (projScrollRef?.current)   projScrollRef.current.scrollLeft   = scrollLeft;
    syncing.current = false;
  }, [headerScrollRef, projScrollRef]);

  // Re-sync all rows to the current scroll position after filtered list changes
  useEffect(() => {
    const currentScroll = rowRefs.current.find(Boolean)?.scrollLeft ?? 0;
    syncAll(currentScroll);
  }, [filtered.length, syncAll]);

  // Expose first row's scroll position via scrollRef so SharedHeader can init
  useEffect(() => {
    if (scrollRef) scrollRef.current = rowRefs.current[0] || null;
  });

  // Horizontal wheel on body
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const handler = (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      e.preventDefault();
      const first = rowRefs.current.find(Boolean);
      const current = first?.scrollLeft || 0;
      syncAll(Math.max(0, current + e.deltaX));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [syncAll]);

  // Touch scroll sync (mobile swipe)
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    let startX = 0, startScroll = 0;
    const onTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startScroll = rowRefs.current.find(Boolean)?.scrollLeft || 0;
    };
    const onTouchMove = (e) => {
      const dx = startX - e.touches[0].clientX;
      const newScroll = Math.max(0, startScroll + dx);
      syncAll(newScroll);
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
    };
  }, [syncAll]);

  const todayIdx  = dateStrip.findIndex(d => isToday(parseISO(d.date)));
  const todayLeft = todayIdx >= 0 ? todayIdx * CELL_W : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#ffffff' }}>
      <Box ref={bodyRef} sx={{ flex: 1, overflowY: 'auto' }}>
        {loading
          ? <LoadingRows />
          : filtered.length === 0
            ? <EmptyState searchValue={globalSearch} />
            : filtered.map((emp, idx) => {
                const leaveCount = Object.values(emp.cells || {}).filter(
                  c => c !== null && c?.leave_status === 'Approved'
                ).length;

                return (
                  <Box key={emp.user_id} sx={{ display: 'flex', alignItems: 'stretch' }}>
                    {/* Frozen label */}
                    <Box sx={{
                      width: FW, minWidth: FW, display: 'flex', alignItems: 'center',
                      px: isMobile ? 1 : 1.5,
                      background: '#ffffff', borderRight: '2px solid #c8cdd6',
                      borderBottom: '1px solid #e8eaed', flexShrink: 0, gap: isMobile ? 0.5 : 1,
                      height: ROW_H, boxSizing: 'border-box',
                    }}>
                      <Typography sx={{
                        fontSize: isMobile ? 9 : 11,
                        color: '#9aa0ad', fontFamily: "'DM Mono', monospace",
                        flexShrink: 0, minWidth: isMobile ? 28 : 40,
                        display: isMobile ? 'none' : 'block',
                      }}>
                        #{emp.user_id.toString().padStart(4, '0')}
                      </Typography>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        {isMobile && (
                          <Typography sx={{ fontSize: 9, color: '#9aa0ad', fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
                            #{emp.user_id.toString().padStart(4, '0')}
                          </Typography>
                        )}
                        <Typography sx={{ fontSize: isMobile ? 11 : 13, fontWeight: 600, color: '#1a1f2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: isMobile ? 1.3 : 'inherit' }}>
                          {emp.full_name}
                        </Typography>
                      </Box>
                      <Box sx={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 99, px: isMobile ? '5px' : 1, py: '2px', flexShrink: 0 }}>
                        <Typography sx={{ fontSize: isMobile ? 9 : 11, fontWeight: 700, color: '#4338ca', fontFamily: "'DM Mono', monospace" }}>
                          {leaveCount.toFixed(1)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Scrollable cells */}
                    <Box
                      ref={el => { rowRefs.current[idx] = el; }}
                      onScroll={e => syncAll(e.currentTarget.scrollLeft)}
                      sx={{ flex: 1, overflowX: 'hidden', overflowY: 'hidden', display: 'flex', alignItems: 'flex-start', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, position: 'relative' }}
                    >
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
        <Box key={i} sx={{ height: 35, borderRadius: '4px', background: 'linear-gradient(90deg,#f0f2f5 0%,#e8eaed 50%,#f0f2f5 100%)' }} />
      ))}
    </Box>
  );
}

function EmptyState({ searchValue }) {
  return (
    <Box sx={{ p: 5, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 13, color: '#9aa0ad' }}>
        {searchValue ? `No results for "${searchValue}"` : 'No leave records in this period'}
      </Typography>
    </Box>
  );
}