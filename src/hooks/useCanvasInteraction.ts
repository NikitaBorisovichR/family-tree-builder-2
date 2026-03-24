import { useState, useRef } from 'react';

export function useCanvasInteraction() {
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    const zoomSensitivity = 0.001;
    const newK = Math.min(Math.max(0.3, transform.k - e.deltaY * zoomSensitivity), 2.5);
    setTransform((prev) => ({ ...prev, k: newK }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    setTransform((prev) => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return {
    transform,
    lastMousePos,
    setTransform,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  };
}
