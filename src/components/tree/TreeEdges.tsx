import React from 'react';
import { Edge } from './TreeTypes';
import { LayoutNode } from '@/hooks/useTreeLayout';

interface TreeEdgesProps {
  edges: Edge[];
  getPos: (id: string) => { x: number; y: number };
}

// Размеры карточки (должны совпадать с TreeNode)
const NW = 120;
const CX = NW / 2;
const AV_TOP = 8;
const AV_R = 45;
const AV_CY = AV_TOP + AV_R;   // 53
const AV_BOT = AV_TOP + AV_R * 2; // 98
const LINE_COLOR = '#90a4ae';
const LINE_W = 1.5;

export default function TreeEdges({ edges, getPos }: TreeEdgesProps) {
  const parentEdges = edges.filter(e => !e.type);
  const spouseEdges = edges.filter(e => e.type === 'spouse');
  const siblingEdges = edges.filter(e => e.type === 'sibling');

  const paths: React.ReactNode[] = [];

  // 0. Линии братьев/сестёр без общих родителей (пунктир)
  siblingEdges.forEach(edge => {
    const sPos = getPos(edge.source);
    const tPos = getPos(edge.target);
    const left = sPos.x <= tPos.x ? sPos : tPos;
    const right = sPos.x <= tPos.x ? tPos : sPos;
    const y = left.y + AV_CY;
    paths.push(
      <line key={edge.id} x1={left.x + NW} y1={y} x2={right.x} y2={y}
        stroke={LINE_COLOR} strokeWidth={LINE_W} strokeDasharray="4,3" />
    );
  });

  // 1. Линии супругов
  spouseEdges.forEach(edge => {
    const sPos = getPos(edge.source);
    const tPos = getPos(edge.target);
    const left = sPos.x <= tPos.x ? sPos : tPos;
    const right = sPos.x <= tPos.x ? tPos : sPos;
    const y = left.y + AV_CY;
    paths.push(
      <line key={edge.id} x1={left.x + NW} y1={y} x2={right.x} y2={y}
        stroke={LINE_COLOR} strokeWidth={LINE_W} />
    );
  });

  // 2. Линии parent→child
  const childrenMap = new Map<string, string[]>();
  parentEdges.forEach(edge => {
    const childId = edge.target;
    const allParentsOfChild = parentEdges
      .filter(e => e.target === childId)
      .map(e => e.source)
      .sort()
      .join(',');
    if (!childrenMap.has(allParentsOfChild)) childrenMap.set(allParentsOfChild, []);
    if (!childrenMap.get(allParentsOfChild)!.includes(childId)) {
      childrenMap.get(allParentsOfChild)!.push(childId);
    }
  });

  const rendered = new Set<string>();

  childrenMap.forEach((childIds, parentKey) => {
    const parentIds = parentKey.split(',').filter(Boolean);
    const parentPositions = parentIds.map(id => getPos(id));
    const childPositions = childIds.map(id => getPos(id));
    if (!parentPositions.length || !childPositions.length) return;

    let parentLineX: number;
    let parentLineY: number;
    if (parentPositions.length === 1) {
      parentLineX = parentPositions[0].x + CX;
      parentLineY = parentPositions[0].y + AV_BOT;
    } else {
      const sorted = [...parentPositions].sort((a, b) => a.x - b.x);
      parentLineX = (sorted[0].x + NW + sorted[1].x) / 2;
      parentLineY = sorted[0].y + AV_CY;
    }

    const childTops = childPositions.map(c => ({ x: c.x + CX, y: c.y }));
    const childMinX = Math.min(...childTops.map(c => c.x));
    const childMaxX = Math.max(...childTops.map(c => c.x));
    const midY = parentLineY + (childTops[0].y - parentLineY) / 2;

    const groupKey = parentKey + childIds.join(',');
    if (rendered.has(groupKey)) return;
    rendered.add(groupKey);

    if (childPositions.length === 1) {
      const cx = childTops[0].x;
      const cy = childTops[0].y;
      paths.push(
        <path key={`pc-${groupKey}`}
          d={`M ${parentLineX} ${parentLineY} L ${parentLineX} ${midY} L ${cx} ${midY} L ${cx} ${cy}`}
          fill="none" stroke={LINE_COLOR} strokeWidth={LINE_W} />
      );
    } else {
      paths.push(
        <line key={`pv-${groupKey}`}
          x1={parentLineX} y1={parentLineY}
          x2={parentLineX} y2={midY}
          stroke={LINE_COLOR} strokeWidth={LINE_W} />
      );
      paths.push(
        <line key={`ph-${groupKey}`}
          x1={childMinX} y1={midY}
          x2={childMaxX} y2={midY}
          stroke={LINE_COLOR} strokeWidth={LINE_W} />
      );
      childTops.forEach((ct, i) => {
        paths.push(
          <line key={`pch-${groupKey}-${i}`}
            x1={ct.x} y1={midY}
            x2={ct.x} y2={ct.y}
            stroke={LINE_COLOR} strokeWidth={LINE_W} />
        );
      });
      if (parentLineX < childMinX || parentLineX > childMaxX) {
        const clampX = Math.max(childMinX, Math.min(childMaxX, parentLineX));
        paths.push(
          <line key={`pcon-${groupKey}`}
            x1={parentLineX} y1={midY}
            x2={clampX} y2={midY}
            stroke={LINE_COLOR} strokeWidth={LINE_W} />
        );
      }
    }
  });

  return (
    <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible">
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <circle cx="3" cy="3" r="1.5" fill="hsl(var(--muted-foreground))" opacity="0.5" />
        </marker>
      </defs>
      {paths}
    </svg>
  );
}

// re-export чтобы useTreeLayout мог использоваться снаружи
export type { LayoutNode };
