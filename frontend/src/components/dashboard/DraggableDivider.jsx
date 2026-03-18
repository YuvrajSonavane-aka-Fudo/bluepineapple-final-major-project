// src/components/dashboard/DraggableDivider.jsx
import { useRef } from 'react';
import { Box } from '@mui/material';

export default function DraggableDivider({ onResize }) {
  const dragging = useRef(false);

  // ── Mouse (desktop) ──
  const onMouseDown = (e) => {
    dragging.current = true;
    e.preventDefault();
    const onMouseMove = (e) => { if (dragging.current) onResize(e.clientY); };
    const onMouseUp   = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
  };

  // ── Touch (mobile) ──
  const onTouchStart = (e) => {
    dragging.current = true;
    const onTouchMove = (ev) => {
      if (!dragging.current) return;
      const touch = ev.touches[0];
      if (touch) {
        ev.preventDefault();
        onResize(touch.clientY);
      }
    };
    const onTouchEnd = () => {
      dragging.current = false;
      window.removeEventListener('touchmove',   onTouchMove);
      window.removeEventListener('touchend',    onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
    window.addEventListener('touchmove',   onTouchMove,  { passive: false });
    window.addEventListener('touchend',    onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
  };

  return (
    <Box
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      sx={{
        height: '10px',
        flexShrink: 0,
        cursor: 'row-resize',
        background: '#e8eaed',
        position: 'relative',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        '&:hover':  { background: '#c8cdd6' },
        '&:active': { background: '#b0b6c3' },
        '&::after': {
          content: '""',
          position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 40, height: 3, borderRadius: 2,
          background: '#9aa0ad',
        },
      }}
    />
  );
}
