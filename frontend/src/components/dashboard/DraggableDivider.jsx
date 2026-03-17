// src/components/dashboard/DraggableDivider.jsx
import { useRef } from 'react';
import { Box } from '@mui/material';

export default function DraggableDivider({ onResize }) {
  const dragging = useRef(false);

  const onMouseDown = (e) => {
    dragging.current = true;
    e.preventDefault();
    const onMouseMove = (e) => { if (dragging.current) onResize(e.clientY); };
    const onMouseUp   = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <Box
      onMouseDown={onMouseDown}
      sx={{
        height: '6px', flexShrink: 0, cursor: 'row-resize',
        background: '#e8eaed', position: 'relative',
        '&:hover': { background: '#c8cdd6' },
        '&::after': {
          content: '""', position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 32, height: 2, borderRadius: 1,
          background: '#9aa0ad',
        },
      }}
    />
  );
}
