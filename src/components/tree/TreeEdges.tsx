import React from 'react';
import { Edge } from './TreeTypes';

interface TreeEdgesProps {
  edges: Edge[];
  getPos: (id: string) => { x: number; y: number };
}

// Размеры карточки — должны совпадать с TreeNode
const NW = 120;        // ширина карточки
const NH = 190;        // высота карточки
const AV_TOP = 8;      // отступ сверху до аватара
const AV_R = 45;       // радиус аватара
const AV_CY = AV_TOP + AV_R;        // 53  — центр аватара по Y
const AV_BOT = AV_TOP + AV_R * 2;   // 98  — низ аватара
const CX = NW / 2;                  // 60  — центр карточки по X

const LINE_COLOR = '#b0bec5';
const LINE_W = 1.5;

export default function TreeEdges({ edges, getPos }: TreeEdgesProps) {
  const parentEdges = edges.filter(e => !e.type);
  const spouseEdges = edges.filter(e => e.type === 'spouse');
  const siblingEdges = edges.filter(e => e.type === 'sibling');

  const paths: React.ReactNode[] = [];

  // ─── Линии братьев/сестёр (пунктир) ───────────────────────────────────────
  siblingEdges.forEach(edge => {
    const sPos = getPos(edge.source);
    const tPos = getPos(edge.target);
    const left  = sPos.x <= tPos.x ? sPos : tPos;
    const right = sPos.x <= tPos.x ? tPos : sPos;
    const y = left.y + AV_CY;
    paths.push(
      <line key={edge.id}
        x1={left.x + NW} y1={y} x2={right.x} y2={y}
        stroke={LINE_COLOR} strokeWidth={LINE_W} strokeDasharray="5,4" />
    );
  });

  // ─── Линии супругов ────────────────────────────────────────────────────────
  // Горизонтальная черта между правым краем левой карточки и левым краем правой
  // на уровне центра аватара
  spouseEdges.forEach(edge => {
    const sPos = getPos(edge.source);
    const tPos = getPos(edge.target);
    const left  = sPos.x <= tPos.x ? sPos : tPos;
    const right = sPos.x <= tPos.x ? tPos : sPos;
    const y = left.y + AV_CY;
    paths.push(
      <line key={edge.id}
        x1={left.x + NW} y1={y} x2={right.x} y2={y}
        stroke={LINE_COLOR} strokeWidth={LINE_W} />
    );
  });

  // ─── Линии родитель → дети ────────────────────────────────────────────────
  // Группируем детей по набору родителей (сортированный ключ)
  const childrenMap = new Map<string, string[]>();
  parentEdges.forEach(edge => {
    const childId = edge.target;
    const parentsKey = parentEdges
      .filter(e => e.target === childId)
      .map(e => e.source)
      .sort()
      .join(',');
    if (!childrenMap.has(parentsKey)) childrenMap.set(parentsKey, []);
    if (!childrenMap.get(parentsKey)!.includes(childId))
      childrenMap.get(parentsKey)!.push(childId);
  });

  const rendered = new Set<string>();

  childrenMap.forEach((childIds, parentKey) => {
    const groupKey = parentKey + '|' + childIds.slice().sort().join(',');
    if (rendered.has(groupKey)) return;
    rendered.add(groupKey);

    const parentIds = parentKey.split(',').filter(Boolean);
    const parentPositions = parentIds.map(id => getPos(id));
    const childPositions  = childIds.map(id => getPos(id));
    if (!parentPositions.length || !childPositions.length) return;

    // Точка выхода от родителей:
    // • Два родителя рядом (пара): середина горизонтальной линии супругов, Y = центр аватара
    // • Один родитель: центр низа его аватара
    let fromX: number;
    let fromY: number;

    if (parentPositions.length >= 2) {
      // Сортируем по X — берём крайних левого и правого
      const sorted = [...parentPositions].sort((a, b) => a.x - b.x);
      const leftP  = sorted[0];
      const rightP = sorted[sorted.length - 1];
      fromX = (leftP.x + NW + rightP.x) / 2;   // середина зазора между ними
      fromY = leftP.y + AV_CY;                  // уровень центра аватара
    } else {
      fromX = parentPositions[0].x + CX;
      fromY = parentPositions[0].y + AV_BOT;    // низ аватара единственного родителя
    }

    // Верхушка каждого ребёнка (центр карточки по X, верх карточки по Y)
    const childTops = childPositions.map(c => ({ x: c.x + CX, y: c.y }));
    const childMinX = Math.min(...childTops.map(c => c.x));
    const childMaxX = Math.max(...childTops.map(c => c.x));
    const childTopY = childTops[0].y; // все дети на одном Y (одно поколение)

    // Горизонтальная «шина» — на полпути между fromY и верхом детей
    const busY = fromY + (childTopY - fromY) / 2;

    if (childIds.length === 1) {
      // Один ребёнок — просто ломаная: вниз → по горизонтали → вниз
      const cx = childTops[0].x;
      const cy = childTops[0].y;
      if (Math.abs(fromX - cx) < 1) {
        // Точно под родителем — просто прямая
        paths.push(
          <line key={`pc-${groupKey}`}
            x1={fromX} y1={fromY} x2={cx} y2={cy}
            stroke={LINE_COLOR} strokeWidth={LINE_W} />
        );
      } else {
        paths.push(
          <polyline key={`pc-${groupKey}`}
            points={`${fromX},${fromY} ${fromX},${busY} ${cx},${busY} ${cx},${cy}`}
            fill="none" stroke={LINE_COLOR} strokeWidth={LINE_W} />
        );
      }
    } else {
      // Несколько детей — классическая «расчёска»:
      // 1) вертикаль от родителя вниз до busY
      paths.push(
        <line key={`pv-${groupKey}`}
          x1={fromX} y1={fromY} x2={fromX} y2={busY}
          stroke={LINE_COLOR} strokeWidth={LINE_W} />
      );

      // 2) горизонтальная шина от крайнего левого до крайнего правого ребёнка
      //    (и до fromX если родитель выходит за эти пределы)
      const busMinX = Math.min(childMinX, fromX);
      const busMaxX = Math.max(childMaxX, fromX);
      paths.push(
        <line key={`ph-${groupKey}`}
          x1={busMinX} y1={busY} x2={busMaxX} y2={busY}
          stroke={LINE_COLOR} strokeWidth={LINE_W} />
      );

      // 3) вертикали от шины до верха каждого ребёнка
      childTops.forEach((ct, i) => {
        paths.push(
          <line key={`pch-${groupKey}-${i}`}
            x1={ct.x} y1={busY} x2={ct.x} y2={ct.y}
            stroke={LINE_COLOR} strokeWidth={LINE_W} />
        );
      });
    }
  });

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none overflow-visible"
      style={{ width: 5000, height: 5000 }}
    >
      {paths}
    </svg>
  );
}

export type { };
