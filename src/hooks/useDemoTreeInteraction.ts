import { useState, useRef } from 'react';
import { FamilyNode, Edge } from '@/components/TreeCanvas';

export function useDemoTreeInteraction(nodes: FamilyNode[], edges: Edge[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'canvas' | 'timeline'>('canvas');
  const [transform, setTransform] = useState({ x: -100, y: 100, k: 0.7 });
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      k: Math.max(0.3, Math.min(2.5, prev.k * delta))
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1 && !selectedId) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setTransform(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy
      }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    // no-op: required by canvas interface
  };

  const handleNodeDragStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
  };

  const selectedNode = nodes.find(n => n.id === selectedId) || null;
  const parents = selectedNode ? edges
    .filter(e => e.target === selectedId && e.type !== 'spouse')
    .map(e => nodes.find(n => n.id === e.source))
    .filter(Boolean) as FamilyNode[] : [];

  return {
    selectedId,
    setSelectedId,
    mode,
    setMode,
    transform,
    setTransform,
    lastMousePos,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleNodeDragStart,
    selectedNode,
    parents
  };
}