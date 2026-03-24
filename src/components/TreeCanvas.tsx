import React, { useState } from 'react';
import Icon from '@/components/ui/icon';
import { LayoutNode } from '@/hooks/useTreeLayout';

export interface FamilyNode {
  id: string;
  x: number;
  y: number;
  firstName: string;
  lastName: string;
  middleName: string;
  maidenName: string;
  gender: 'male' | 'female';
  birthDate: string;
  birthPlace: string;
  deathDate: string;
  deathPlace: string;
  occupation: string;
  isAlive: boolean;
  relation: string;
  bio: string;
  historyContext: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type?: 'spouse' | 'sibling';
}

interface TreeCanvasProps {
  nodes: FamilyNode[];
  layoutNodes: LayoutNode[];
  edges: Edge[];
  selectedId: string | null;
  transform: { x: number; y: number; k: number };
  mode: 'canvas' | 'timeline';
  onSetMode: (mode: 'canvas' | 'timeline') => void;
  onSetTransform: (transform: { x: number; y: number; k: number }) => void;
  onWheel: (e: React.WheelEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onSelectNode: (id: string) => void;
  onAddRelative: (sourceId: string, type: string, gender?: 'male' | 'female') => void;
  lastMousePos?: React.MutableRefObject<{ x: number; y: number }>;
}

export function getFullName(node: FamilyNode | null): string {
  if (!node) return '';
  return `${node.lastName || ''} ${node.firstName || ''} ${node.middleName || ''}`.trim();
}

export default function TreeCanvas({
  nodes,
  layoutNodes,
  edges,
  selectedId,
  transform,
  mode,
  onSetMode,
  onSetTransform,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onSelectNode,
  onAddRelative,
  lastMousePos
}: TreeCanvasProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Используем layout-координаты вместо node.x/node.y
  const getPos = (id: string) => layoutNodes.find(l => l.id === id) ?? { x: 0, y: 0 };

  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur rounded-full shadow-lg p-1 flex border border-border">
        <button
          onClick={() => onSetMode('canvas')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${
            mode === 'canvas' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Icon name="Share2" size={16} /> Древо
        </button>
        <button
          onClick={() => onSetMode('timeline')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${
            mode === 'timeline' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Icon name="Calendar" size={16} /> Лента
        </button>
      </div>

      {mode === 'canvas' ? (
        <>
          <div className="absolute top-4 left-4 z-20 bg-white p-2 rounded-lg shadow-md flex flex-col gap-2 border border-border">
            <button
              className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onSetTransform({ ...transform, k: Math.min(transform.k + 0.2, 2.5) })}
            >
              <Icon name="ZoomIn" size={20} />
            </button>
            <button
              className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onSetTransform({ ...transform, k: Math.max(transform.k - 0.2, 0.4) })}
            >
              <Icon name="ZoomOut" size={20} />
            </button>
            <div className="h-px bg-border my-1"></div>
            <button
              className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onSetTransform({ x: 0, y: 0, k: 1 })}
            >
              <Icon name="Move" size={20} />
            </button>
          </div>

          <div
            ref={containerRef}
            className="flex-1 relative cursor-default overflow-hidden"
            onWheel={onWheel}
            onMouseDown={(e) => {
              setActiveMenu(null);
              onMouseDown(e);
            }}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <div
              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
                transformOrigin: '0 0',
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            >
              <div className="absolute inset-0 w-full h-full pointer-events-auto">
                <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible">
                  <defs>
                    <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                      <circle cx="3" cy="3" r="1.5" fill="hsl(var(--muted-foreground))" opacity="0.5" />
                    </marker>
                  </defs>
                  {(() => {
                    // Размеры карточки: ширина=120, аватар 90px центр на y+45, низ аватара y+90, верх карточки y
                    const NW = 120;        // ширина карточки
                    const CX = NW / 2;    // центр по X = 60
                    const AV_TOP = 8;     // отступ аватара сверху карточки
                    const AV_R = 45;      // радиус аватара
                    const AV_CY = AV_TOP + AV_R;   // центр аватара Y = 53
                    const AV_BOT = AV_TOP + AV_R * 2; // низ аватара = 98
                    const lineColor = '#90a4ae';
                    const lineW = 1.5;

                    const parentEdges = edges.filter(e => !e.type);
                    const spouseEdges = edges.filter(e => e.type === 'spouse');
                    const siblingEdges = edges.filter(e => e.type === 'sibling');

                    const rendered = new Set<string>();
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
                          stroke={lineColor} strokeWidth={lineW} strokeDasharray="4,3" />
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
                          stroke={lineColor} strokeWidth={lineW} />
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

                      if (childNodes.length === 1) {
                        // Один ребёнок — прямая Г-линия
                        const cx = childTops[0].x;
                        const cy = childTops[0].y;
                        paths.push(
                          <path key={`pc-${groupKey}`}
                            d={`M ${parentLineX} ${parentLineY} L ${parentLineX} ${midY} L ${cx} ${midY} L ${cx} ${cy}`}
                            fill="none" stroke={lineColor} strokeWidth={lineW} />
                        );
                      } else {
                        // Несколько детей — «гребёнка»
                        // Вертикаль вниз от родителя до midY
                        paths.push(
                          <line key={`pv-${groupKey}`}
                            x1={parentLineX} y1={parentLineY}
                            x2={parentLineX} y2={midY}
                            stroke={lineColor} strokeWidth={lineW} />
                        );
                        // Горизонталь на уровне midY
                        paths.push(
                          <line key={`ph-${groupKey}`}
                            x1={childMinX} y1={midY}
                            x2={childMaxX} y2={midY}
                            stroke={lineColor} strokeWidth={lineW} />
                        );
                        // Вертикали вниз к каждому ребёнку
                        childTops.forEach((ct, i) => {
                          paths.push(
                            <line key={`pch-${groupKey}-${i}`}
                              x1={ct.x} y1={midY}
                              x2={ct.x} y2={ct.y}
                              stroke={lineColor} strokeWidth={lineW} />
                          );
                        });
                        // Соединяем parentLineX с горизонталью
                        if (parentLineX < childMinX || parentLineX > childMaxX) {
                          const clampX = Math.max(childMinX, Math.min(childMaxX, parentLineX));
                          paths.push(
                            <line key={`pcon-${groupKey}`}
                              x1={parentLineX} y1={midY}
                              x2={clampX} y2={midY}
                              stroke={lineColor} strokeWidth={lineW} />
                          );
                        }
                      }
                    });

                    return paths;
                  })()}
                </svg>
                {nodes.map((node) => {
                  const isMale = node.gender === 'male';
                  const selected = selectedId === node.id;
                  const menuOpen = activeMenu === node.id;

                  const avatarBg = isMale ? 'bg-[#dce8f5]' : 'bg-[#f5dce8]';
                  const avatarIcon = isMale ? 'text-[#6baed6]' : 'text-[#d6748b]';
                  const avatarRing = isMale
                    ? selected ? 'ring-4 ring-blue-400' : 'ring-2 ring-[#6baed6]/40'
                    : selected ? 'ring-4 ring-pink-400' : 'ring-2 ring-[#d6748b]/40';

                  // Edge семантика: source = родитель, target = ребёнок
                  // gen > 0 = предки (отец=1, дед=2, прадед=3...)
                  // gen < 0 = потомки (сын=-1, внук=-2...)
                  // gen = 0 = одно поколение (братья/сёстры, супруги)
                  const getGeneration = (nodeId: string): number => {
                    const visited = new Set<string>();
                    const queue: Array<{ id: string; gen: number }> = [{ id: 'root', gen: 0 }];
                    while (queue.length > 0) {
                      const { id, gen } = queue.shift()!;
                      if (id === nodeId) return gen;
                      if (visited.has(id)) continue;
                      visited.add(id);
                      // родители текущего: те у кого target === id (source — родитель)
                      edges.filter(e => e.target === id && e.type !== 'spouse')
                        .forEach(e => queue.push({ id: e.source, gen: gen + 1 }));
                      // дети текущего: те у кого source === id (target — ребёнок)
                      edges.filter(e => e.source === id && e.type !== 'spouse')
                        .forEach(e => queue.push({ id: e.target, gen: gen - 1 }));
                    }
                    return 0;
                  };

                  const getRelationLabel = (): { label: string; color: string } => {
                    const blue = 'bg-[#5b9bd5]';
                    const pink = 'bg-[#e91e63]';
                    const green = 'bg-[#4caf50]';
                    const c = isMale ? blue : pink;

                    if (node.id === 'root') return { label: 'Я', color: green };

                    // Супруг: смотрим поколение партнёра
                    const spouseEdge = edges.find(e => e.type === 'spouse' && (e.source === node.id || e.target === node.id));
                    if (spouseEdge) {
                      const partnerId = spouseEdge.source === node.id ? spouseEdge.target : spouseEdge.source;
                      const partnerGen = getGeneration(partnerId);
                      if (partnerGen === 0) return { label: isMale ? 'Муж' : 'Жена', color: c };
                      if (partnerGen === 1) return { label: isMale ? 'Муж мамы' : 'Жена папы', color: c };
                      if (partnerGen === 2) return { label: isMale ? 'Дед' : 'Бабушка', color: c };
                      if (partnerGen >= 3) {
                        const pra = 'Пра'.repeat(partnerGen - 2);
                        return { label: isMale ? `${pra}дед` : `${pra}бабушка`, color: c };
                      }
                      if (partnerGen === -1) return { label: isMale ? 'Муж дочери' : 'Жена сына', color: c };
                      return { label: isMale ? 'Муж' : 'Жена', color: c };
                    }

                    const gen = getGeneration(node.id);

                    if (gen === 1)  return { label: isMale ? 'Отец' : 'Мать', color: c };
                    if (gen === 2)  return { label: isMale ? 'Дедушка' : 'Бабушка', color: c };
                    if (gen === 3)  return { label: isMale ? 'Прадедушка' : 'Прабабушка', color: c };
                    if (gen >= 4) {
                      const pra = 'Пра'.repeat(gen - 2);
                      return { label: isMale ? `${pra}дедушка` : `${pra}бабушка`, color: c };
                    }
                    if (gen === -1) return { label: isMale ? 'Сын' : 'Дочь', color: c };
                    if (gen === -2) return { label: isMale ? 'Внук' : 'Внучка', color: c };
                    if (gen === -3) return { label: isMale ? 'Правнук' : 'Правнучка', color: c };
                    if (gen <= -4) {
                      const pra = 'Пра'.repeat(Math.abs(gen) - 2);
                      return { label: isMale ? `${pra}внук` : `${pra}внучка`, color: c };
                    }
                    // gen === 0 — брат/сестра
                    return { label: isMale ? 'Брат' : 'Сестра', color: c };
                  };

                  const { label: badge, color: badgeBg } = getRelationLabel();

                  const lastName = node.lastName || '';
                  const firstName = [node.firstName, node.middleName].filter(Boolean).join(' ');
                  const maiden = node.maidenName ? `(${node.maidenName})` : '';
                  const dates = [node.birthDate, node.isAlive ? null : (node.deathDate || '...')].filter(Boolean).join('—');
                  const place = node.birthPlace || '';

                  const pos = getPos(node.id);

                  return (
                    <div
                      key={node.id}
                      className="absolute group"
                      style={{
                        left: pos.x,
                        top: pos.y,
                        width: 120,
                        zIndex: selected ? 50 : menuOpen ? 60 : 10,
                        cursor: 'pointer'
                      }}
                      onClick={(e) => { e.stopPropagation(); onSelectNode(node.id); }}
                    >
                      <div className="flex flex-col items-center select-none">
                        {/* Аватар */}
                        <div className="relative">
                          <div
                            className={`w-[90px] h-[90px] rounded-full ${avatarBg} ${avatarIcon} ${avatarRing} flex items-center justify-center shadow-md transition-all ${
                              selected ? 'scale-105' : 'hover:scale-[1.03]'
                            }`}
                          >
                            <Icon name={isMale ? 'User' : 'User'} size={46} />
                          </div>
                          {/* Бейдж роли */}
                          <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${badgeBg} text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow`}>
                            {badge}
                          </div>
                        </div>

                        {/* Имя и детали */}
                        <div className="mt-4 text-center w-full">
                          {lastName && (
                            <p className="text-[11px] font-bold text-foreground leading-tight">
                              {lastName}{maiden ? ` ${maiden}` : ''}
                            </p>
                          )}
                          {firstName && (
                            <p className="text-[11px] font-semibold text-foreground leading-tight">
                              {firstName}
                            </p>
                          )}
                          {!lastName && !firstName && (
                            <p className="text-[10px] text-muted-foreground italic">Не заполнено</p>
                          )}
                          {place && (
                            <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{place}</p>
                          )}
                          {dates && (
                            <p className="text-[9px] text-muted-foreground leading-tight">{dates}</p>
                          )}
                        </div>
                      </div>

                      {/* Кнопка + */}
                      <div
                        className="mt-1 relative flex justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          title="Добавить родственника"
                          className="bg-foreground text-background rounded-full w-6 h-6 flex items-center justify-center hover:bg-primary shadow-lg hover:scale-110 transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(menuOpen ? null : node.id);
                          }}
                        >
                          <Icon name="Plus" size={13} />
                        </button>

                        {menuOpen && (
                          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-border overflow-hidden z-30" style={{ minWidth: 130 }}>
                            <div className="grid grid-cols-2 gap-px bg-border">
                              {node.gender === 'male' ? (
                                <button className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'spouse', 'female'); setActiveMenu(null); }}>
                                  <Icon name="Heart" size={15} className="text-pink-500" />
                                  <span className="text-[10px] font-medium">Жена</span>
                                </button>
                              ) : (
                                <button className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'spouse', 'male'); setActiveMenu(null); }}>
                                  <Icon name="Heart" size={15} className="text-blue-500" />
                                  <span className="text-[10px] font-medium">Муж</span>
                                </button>
                              )}
                              <button className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'parent', 'male'); setActiveMenu(null); }}>
                                <Icon name="UserRound" size={15} className="text-blue-500" />
                                <span className="text-[10px] font-medium">Отец</span>
                              </button>
                              <button className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'parent', 'female'); setActiveMenu(null); }}>
                                <Icon name="UserRound" size={15} className="text-pink-500" />
                                <span className="text-[10px] font-medium">Мать</span>
                              </button>
                              <button className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'sibling', 'male'); setActiveMenu(null); }}>
                                <Icon name="Users" size={15} className="text-blue-500" />
                                <span className="text-[10px] font-medium">Брат</span>
                              </button>
                              <button className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'sibling', 'female'); setActiveMenu(null); }}>
                                <Icon name="Users" size={15} className="text-pink-500" />
                                <span className="text-[10px] font-medium">Сестра</span>
                              </button>
                              <button className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'child', 'male'); setActiveMenu(null); }}>
                                <Icon name="Baby" size={15} className="text-blue-500" />
                                <span className="text-[10px] font-medium">Сын</span>
                              </button>
                              <button className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'child', 'female'); setActiveMenu(null); }}>
                                <Icon name="Baby" size={15} className="text-pink-500" />
                                <span className="text-[10px] font-medium">Дочь</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="p-8 max-w-3xl mx-auto">
            <div className="relative border-l-4 border-primary/30 ml-4 space-y-8 pb-12">
              {[...nodes]
                .filter((n) => n.birthDate && !isNaN(parseInt(n.birthDate)))
                .sort((a, b) => parseInt(a.birthDate) - parseInt(b.birthDate))
                .map((node) => (
                  <div key={node.id} className="relative pl-8">
                    <div className="absolute -left-[13px] top-1 w-6 h-6 rounded-full bg-white border-4 border-primary"></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-border flex justify-between">
                      <div>
                        <h3 className="font-bold text-foreground">{getFullName(node)}</h3>
                        <span className="text-sm text-primary font-bold">{node.birthDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}