// src/components/dashboard/DraggableDivider.jsx
import { useRef, useCallback } from 'react';
import { Box } from '@mui/material';

export default function DraggableDivider({ onResize }) {
  const dragging = useRef(false);
  const pending  = useRef(null);  // last uncommitted clientY

  // Flush pending position on the next animation frame.
  // Only one rAF is ever queued at a time — subsequent pointer
  // moves just overwrite `pending` so the frame always gets the
  // freshest value with zero queuing lag.
  const scheduleFlush = useCallback(() => {
    if (pending.current === null) return;
    requestAnimationFrame(() => {
      if (pending.current !== null) {
        onResize(pending.current);
        pending.current = null;
      }
    });
  }, [onResize]);

  const onPointerDown = useCallback((e) => {
    // Only left-click / primary touch
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();

    // setPointerCapture routes all future pointer events for this
    // pointerId to this element — no window listeners needed.
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return;
    // Overwrite — we only care about the latest position
    pending.current = e.clientY;
    scheduleFlush();
  }, [scheduleFlush]);

  const onPointerUp = useCallback((e) => {
    if (!dragging.current) return;
    dragging.current = false;
    pending.current  = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  return (
    <Box
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      sx={{
        height: '12px',
        flexShrink: 0,
        cursor: 'row-resize',
        background: '#e8eaed',
        position: 'relative',
        // pointer-events API handles touch natively — no touchAction needed
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        willChange: 'background', // hint to browser — avoids composite layer recalc
        '&:hover':  { background: '#c8cdd6' },
        '&:active': { background: '#b0b6c3' },
        '&::after': {
          content: '""',
          position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 44, height: 3, borderRadius: 2,
          background: '#9aa0ad',
        },
      }}
    />
  );
}