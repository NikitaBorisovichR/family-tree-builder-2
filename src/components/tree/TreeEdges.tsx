import React from 'react';
import { Edge } from './TreeTypes';

interface TreeEdgesProps {
  edges: Edge[];
  getPos: (id: string) => { x: number; y: number };
}

// ── Константы карточки (должны совпадать с TreeNode) ──────────────────────────
// Карточка 120px, кружок 90px (w-[90px]), центрируется flex items-center
const NW    = 120;  // ширина карточки
const AV_D  = 90;   // диаметр кружка (w-[90px] h-[90px])
const AV_R  = AV_D / 2;  // 45 — радиус аватара
const AV_T  = 0;    // кружок идёт с самого верха карточки (нет отступа)
const AV_CY = AV_T + AV_R;       // 45 — центр аватара по Y
const AV_BOT = AV_T + AV_D;      // 90 — низ аватара
const CX    = NW / 2;             // 60 — горизонтальный центр карточки

// Горизонтальный центр кружка: карточка 120px, кружок 90px → отступ = 15px
const AV_CX_OFFSET = (NW - AV_D) / 2;  // 15
const AV_RIGHT = AV_CX_OFFSET + AV_D;  // 105 — правый край кружка
const AV_LEFT  = AV_CX_OFFSET;          // 15  — левый край кружка

const STROKE = '#b0bec5';
const SW = 1.5;
const R  = 8; // радиус скругления углов

// Строит SVG path с прямыми линиями и скруглёнными углами
// points: массив {x, y}
function roundedPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = '';
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const prev = points[i - 1];
    const next = points[i + 1];

    if (i === 0) {
      d += `M ${p.x} ${p.y}`;
      continue;
    }

    if (i === points.length - 1) {
      d += ` L ${p.x} ${p.y}`;
      continue;
    }

    // Направления от предыдущей и к следующей точке
    const dx1 = p.x - prev.x;
    const dy1 = p.y - prev.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

    const dx2 = next.x - p.x;
    const dy2 = next.y - p.y;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    if (len1 < 0.01 || len2 < 0.01) {
      d += ` L ${p.x} ${p.y}`;
      continue;
    }

    const r = Math.min(R, len1 / 2, len2 / 2);

    // Точка входа в угол
    const ex = p.x - (dx1 / len1) * r;
    const ey = p.y - (dy1 / len1) * r;
    // Точка выхода из угла
    const fx = p.x + (dx2 / len2) * r;
    const fy = p.y + (dy2 / len2) * r;

    d += ` L ${ex} ${ey} Q ${p.x} ${p.y} ${fx} ${fy}`;
  }
  return d;
}

export default function TreeEdges({ edges, getPos }: TreeEdgesProps) {
  const parentEdges  = edges.filter(e => !e.type);
  const spouseEdges  = edges.filter(e => e.type === 'spouse');
  const siblingEdges = edges.filter(e => e.type === 'sibling');

  const els: React.ReactNode[] = [];

  // ── 1. Линии «sibling» (пунктир) ──────────────────────────────────────────
  siblingEdges.forEach(edge => {
    const sP = getPos(edge.source);
    const tP = getPos(edge.target);
    const left  = sP.x <= tP.x ? sP : tP;
    const right = sP.x <= tP.x ? tP : sP;
    const y = left.y + AV_CY;
    // от правого края кружка левого до левого края кружка правого
    els.push(
      <line key={edge.id}
        x1={left.x + AV_RIGHT} y1={y} x2={right.x + AV_LEFT} y2={y}
        stroke={STROKE} strokeWidth={SW} strokeDasharray="5,4" />
    );
  });

  // ── 2. Линии супругов ─────────────────────────────────────────────────────
  // От правого края кружка левого партнёра до левого края кружка правого
  spouseEdges.forEach(edge => {
    const sP = getPos(edge.source);
    const tP = getPos(edge.target);
    const left  = sP.x <= tP.x ? sP : tP;
    const right = sP.x <= tP.x ? tP : sP;
    const y = left.y + AV_CY;
    els.push(
      <line key={edge.id}
        x1={left.x + AV_RIGHT} y1={y} x2={right.x + AV_LEFT} y2={y}
        stroke={STROKE} strokeWidth={SW} />
    );
  });

  // ── 3. Линии родитель → дети ──────────────────────────────────────────────
  const childGroupMap = new Map<string, Set<string>>();
  parentEdges.forEach(edge => {
    const childId = edge.target;
    const allParents = parentEdges
      .filter(e => e.target === childId)
      .map(e => e.source)
      .sort()
      .join(',');
    if (!childGroupMap.has(allParents)) childGroupMap.set(allParents, new Set());
    childGroupMap.get(allParents)!.add(childId);
  });

  const renderedGroups = new Set<string>();

  // Назначаем каждой уникальной группе (fromY → topY) свой индекс
  const busYIndexMap = new Map<string, number>();
  const getBusYIndex = (fromY: number, topY: number): number => {
    const key = `${Math.round(fromY)}-${Math.round(topY)}`;
    const idx = busYIndexMap.has(key) ? busYIndexMap.get(key)! + 1 : 0;
    busYIndexMap.set(key, idx);
    return idx;
  };

  const groups: Array<{ groupId: string; parentKey: string; childSet: Set<string> }> = [];
  childGroupMap.forEach((childSet, parentKey) => {
    const groupId = parentKey + '|' + [...childSet].sort().join(',');
    groups.push({ groupId, parentKey, childSet });
  });

  groups.forEach(({ groupId, parentKey, childSet }) => {
    if (renderedGroups.has(groupId)) return;
    renderedGroups.add(groupId);

    const parentIds = parentKey.split(',').filter(Boolean);
    const childIds  = [...childSet];

    const pPositions = parentIds.map(id => getPos(id));
    const cPositions = childIds.map(id => getPos(id));
    if (!pPositions.length || !cPositions.length) return;

    // ── Точка выхода от родителей ──────────────────────────────────────────
    let fromX: number;
    let fromY: number;

    if (pPositions.length >= 2) {
      const sorted = [...pPositions].sort((a, b) => a.x - b.x);
      fromX = (sorted[0].x + AV_RIGHT + sorted[sorted.length - 1].x + AV_LEFT) / 2;
      fromY = sorted[0].y + AV_BOT;
    } else {
      fromX = pPositions[0].x + CX;
      fromY = pPositions[0].y + AV_BOT;
    }

    // ── Верхушки детей: центр по X, верх кружка ───────────────────────────
    // Входим не в верх карточки, а в верх кружка (AV_T)
    const tops = cPositions.map(c => ({ x: c.x + CX, y: c.y + AV_T }));
    const topY = tops[0].y;

    // ── busY со смещением для разных групп ────────────────────────────────
    const BUS_STEP = 12;
    const busIdx = getBusYIndex(fromY, topY);
    const baseBusY = fromY + (topY - fromY) / 2;
    const busY = baseBusY + (busIdx % 2 === 0 ? -(busIdx / 2) : Math.ceil(busIdx / 2)) * BUS_STEP;

    if (childIds.length === 1) {
      const cx = tops[0].x;
      const cy = tops[0].y;

      if (Math.abs(fromX - cx) < 2) {
        els.push(
          <path key={`v-${groupId}`}
            d={`M ${fromX} ${fromY} L ${cx} ${cy}`}
            fill="none" stroke={STROKE} strokeWidth={SW} />
        );
      } else {
        const d = roundedPath([
          { x: fromX, y: fromY },
          { x: fromX, y: busY },
          { x: cx,    y: busY },
          { x: cx,    y: cy   },
        ]);
        els.push(
          <path key={`step-${groupId}`}
            d={d} fill="none" stroke={STROKE} strokeWidth={SW} />
        );
      }
    } else {
      const minChildX = Math.min(...tops.map(t => t.x));
      const maxChildX = Math.max(...tops.map(t => t.x));
      const busX1 = Math.min(minChildX, fromX);
      const busX2 = Math.max(maxChildX, fromX);

      // Вертикаль от родителей вниз до шины — прямая, без скруглений
      els.push(
        <line key={`down-${groupId}`}
          x1={fromX} y1={fromY} x2={fromX} y2={busY}
          stroke={STROKE} strokeWidth={SW} />,
      );

      // Горизонтальная шина — от края до края, пересекает вертикаль прямо (пункт 2)
      els.push(
        <line key={`bus-${groupId}`}
          x1={busX1} y1={busY} x2={busX2} y2={busY}
          stroke={STROKE} strokeWidth={SW} />,
      );

      // Вертикали от шины к каждому ребёнку — угол шина→вертикаль скруглён (пункт 3)
      // Скругление: горизонталь подходит к точке, потом плавный поворот вниз
      tops.forEach((t, i) => {
        // Определяем с какой стороны шина подходит к этой точке
        // (если точка левее fromX — подходим справа, иначе слева)
        const approach = t.x <= fromX ? R : -R;
        const d = roundedPath([
          { x: t.x + approach, y: busY },
          { x: t.x,            y: busY },
          { x: t.x,            y: t.y  },
        ]);
        els.push(
          <path key={`child-${groupId}-${i}`}
            d={d} fill="none" stroke={STROKE} strokeWidth={SW} />
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