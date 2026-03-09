// src/components/dashboard/DraggableDivider.jsx
import { useRef, useCallback } from 'react';

export default function DraggableDivider({ onResize }) {
  const dragging = useRef(false);

  const onMouseDown = useCallback((e) => {
    dragging.current = true;
    e.preventDefault();
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev) => { if (dragging.current) onResize(ev.clientY); };
    const onUp   = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [onResize]);

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        height: 6, flexShrink: 0,
        background: '#f0f2f5',
        borderTop: '1px solid #e8eaed',
        borderBottom: '1px solid #e8eaed',
        cursor: 'row-resize',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width: 40, height: 3, borderRadius: 99,
        background: '#d4d7dc',
      }} />
    </div>
  );
}
