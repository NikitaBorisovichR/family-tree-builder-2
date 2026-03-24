import React from 'react';
import { Edge } from './TreeTypes';

interface TreeEdgesProps {
  edges: Edge[];
  getPos: (id: string) => { x: number; y: number };
}

// ── Константы карточки (должны совпадать с TreeNode) ──────────────────────────
const NW   = 120;  // ширина карточки
const AV_R = 45;   // радиус аватара
const AV_T = 8;    // отступ аватара сверху
const AV_CY = AV_T + AV_R;          // 53 — центр аватара по Y
const AV_BOT = AV_T + AV_R * 2;     // 98 — низ аватара
const CX = NW / 2;                  // 60 — горизонтальный центр карточки

const STROKE = '#b0bec5';
const SW = 1.5;

export default function TreeEdges({ edges, getPos }: TreeEdgesProps) {
  const parentEdges  = edges.filter(e => !e.type);
  const spouseEdges  = edges.filter(e => e.type === 'spouse');
  const siblingEdges = edges.filter(e => e.type === 'sibling');

  const els: React.ReactNode[] = [];

  // ── 1. Линии «sibling» (пунктир, только для редкого случая без родителей) ──
  siblingEdges.forEach(edge => {
    const sP = getPos(edge.source);
    const tP = getPos(edge.target);
    const left  = sP.x <= tP.x ? sP : tP;
    const right = sP.x <= tP.x ? tP : sP;
    const y = left.y + AV_CY;
    els.push(
      <line key={edge.id}
        x1={left.x + NW} y1={y} x2={right.x} y2={y}
        stroke={STROKE} strokeWidth={SW} strokeDasharray="5,4" />
    );
  });

  // ── 2. Линии супругов ─────────────────────────────────────────────────────
  // Горизонтальная черта между карточками на уровне центра аватара
  spouseEdges.forEach(edge => {
    const sP = getPos(edge.source);
    const tP = getPos(edge.target);
    const left  = sP.x <= tP.x ? sP : tP;
    const right = sP.x <= tP.x ? tP : sP;
    const y = left.y + AV_CY;
    els.push(
      <line key={edge.id}
        x1={left.x + NW} y1={y} x2={right.x} y2={y}
        stroke={STROKE} strokeWidth={SW} />
    );
  });

  // ── 3. Линии родитель → дети ──────────────────────────────────────────────
  // Группируем детей по «ключу родителей» (sorted ids через запятую)
  // Это позволяет нарисовать одну «расчёску» на группу детей

  const childGroupMap = new Map<string, Set<string>>();
  parentEdges.forEach(edge => {
    const childId = edge.target;
    // Все родители данного ребёнка
    const allParents = parentEdges
      .filter(e => e.target === childId)
      .map(e => e.source)
      .sort()
      .join(',');
    if (!childGroupMap.has(allParents)) childGroupMap.set(allParents, new Set());
    childGroupMap.get(allParents)!.add(childId);
  });

  const renderedGroups = new Set<string>();

  childGroupMap.forEach((childSet, parentKey) => {
    const groupId = parentKey + '|' + [...childSet].sort().join(',');
    if (renderedGroups.has(groupId)) return;
    renderedGroups.add(groupId);

    const parentIds = parentKey.split(',').filter(Boolean);
    const childIds  = [...childSet];

    const pPositions = parentIds.map(id => getPos(id));
    const cPositions = childIds.map(id => getPos(id));
    if (!pPositions.length || !cPositions.length) return;

    // ── Точка выхода от родителей ──────────────────────────────────────────
    // Два родителя (пара): выход из середины горизонтальной линии супругов,
    //   Y = уровень центра аватара
    // Один родитель: выход из низа аватара по центру карточки
    let fromX: number;
    let fromY: number;

    if (pPositions.length >= 2) {
      const sorted = [...pPositions].sort((a, b) => a.x - b.x);
      fromX = (sorted[0].x + NW + sorted[sorted.length - 1].x) / 2;
      fromY = sorted[0].y + AV_BOT; // выход из нижней точки аватара, а не центра
    } else {
      fromX = pPositions[0].x + CX;
      fromY = pPositions[0].y + AV_BOT;
    }

    // ── Верхушки детей (центр по X, верхний Y карточки) ───────────────────
    const tops = cPositions.map(c => ({ x: c.x + CX, y: c.y }));
    const topY = tops[0].y; // все дети на одном Y-уровне

    // Горизонтальная «шина» — ровно посередине по вертикали
    const busY = fromY + (topY - fromY) / 2;

    if (childIds.length === 1) {
      // ── Один ребёнок ───────────────────────────────────────────────────
      const cx = tops[0].x;
      const cy = tops[0].y;

      if (Math.abs(fromX - cx) < 2) {
        // Строго под родителями — прямая вертикаль
        els.push(
          <line key={`v-${groupId}`}
            x1={fromX} y1={fromY} x2={cx} y2={cy}
            stroke={STROKE} strokeWidth={SW} />
        );
      } else {
        // Ступенчатая ломаная: вниз → вправо/влево → вниз
        els.push(
          <polyline key={`step-${groupId}`}
            points={`${fromX},${fromY} ${fromX},${busY} ${cx},${busY} ${cx},${cy}`}
            fill="none" stroke={STROKE} strokeWidth={SW} />
        );
      }
    } else {
      // ── Несколько детей («расчёска») ───────────────────────────────────
      const minChildX = Math.min(...tops.map(t => t.x));
      const maxChildX = Math.max(...tops.map(t => t.x));

      // Вертикаль от родителей вниз до шины
      els.push(
        <line key={`down-${groupId}`}
          x1={fromX} y1={fromY} x2={fromX} y2={busY}
          stroke={STROKE} strokeWidth={SW} />
      );

      // Горизонтальная шина — от крайнего левого до крайнего правого ребёнка
      // (расширяем до fromX если родитель выходит за пределы)
      const busX1 = Math.min(minChildX, fromX);
      const busX2 = Math.max(maxChildX, fromX);
      els.push(
        <line key={`bus-${groupId}`}
          x1={busX1} y1={busY} x2={busX2} y2={busY}
          stroke={STROKE} strokeWidth={SW} />
      );

      // Вертикали от шины к каждому ребёнку
      tops.forEach((t, i) => {
        els.push(
          <line key={`child-${groupId}-${i}`}
            x1={t.x} y1={busY} x2={t.x} y2={t.y}
            stroke={STROKE} strokeWidth={SW} />
        );
      });
    }
  });

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none overflow-visible"
      style={{ width: 8000, height: 8000 }}
    >
      {els}
    </svg>
  );
}