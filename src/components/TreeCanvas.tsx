import React, { useRef, useState } from 'react';
import Icon from '@/components/ui/icon';

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
  type?: 'spouse';
}

interface TreeCanvasProps {
  nodes: FamilyNode[];
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
  onNodeDragStart: (e: React.MouseEvent, id: string) => void;
  onSelectNode: (id: string) => void;
  onAddRelative: (sourceId: string, type: string, gender?: 'male' | 'female') => void;
  lastMousePos: React.MutableRefObject<{ x: number; y: number }>;
}

export function getFullName(node: FamilyNode | null): string {
  if (!node) return '';
  return `${node.lastName || ''} ${node.firstName || ''} ${node.middleName || ''}`.trim();
}

export default function TreeCanvas({
  nodes,
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
  onNodeDragStart,
  onSelectNode,
  onAddRelative,
  lastMousePos
}: TreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

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
                  {edges.map((edge) => {
                    const s = nodes.find((n) => n.id === edge.source);
                    const t = nodes.find((n) => n.id === edge.target);
                    if (!s || !t) return null;
                    // NODE_W=120, аватар центр ~60px, низ карточки ~170px
                    const NW = 120;
                    const AVATAR_CY = 60;
                    const NODE_BOTTOM = 170;
                    const isSpouse = edge.type === 'spouse';
                    const isHorizontal = isSpouse || Math.abs(s.y - t.y) < 80;
                    const lineColor = '#b0bec5';
                    const lineW = 1.5;

                    if (isHorizontal) {
                      // горизонтальная линия между супругами — на уровне аватара
                      const leftNode = s.x < t.x ? s : t;
                      const rightNode = s.x < t.x ? t : s;
                      const y = leftNode.y + AVATAR_CY;
                      const sx = leftNode.x + NW;
                      const ex = rightNode.x;
                      return (
                        <line key={edge.id} x1={sx} y1={y} x2={ex} y2={y}
                          stroke={lineColor} strokeWidth={lineW} />
                      );
                    } else {
                      // родитель → ребёнок: вниз из центра родителя, потом горизонталь, потом вверх к ребёнку
                      const px = s.x + NW / 2;
                      const py = s.y + NODE_BOTTOM;
                      const cx2 = t.x + NW / 2;
                      const cy2 = t.y;
                      const midY = (py + cy2) / 2;
                      return (
                        <path key={edge.id}
                          d={`M ${px} ${py} L ${px} ${midY} L ${cx2} ${midY} L ${cx2} ${cy2}`}
                          fill="none" stroke={lineColor} strokeWidth={lineW} />
                      );
                    }
                  })}
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

                  // Вычисляем поколение узла относительно root (через parent-edges)
                  const getGeneration = (nodeId: string): number => {
                    const visited = new Set<string>();
                    const queue: Array<{ id: string; gen: number }> = [{ id: 'root', gen: 0 }];
                    while (queue.length > 0) {
                      const { id, gen } = queue.shift()!;
                      if (id === nodeId) return gen;
                      if (visited.has(id)) continue;
                      visited.add(id);
                      // children (source→target = parent→child)
                      edges.filter(e => e.source === id && e.type !== 'spouse').forEach(e => queue.push({ id: e.target, gen: gen + 1 }));
                      // parents (target→source)
                      edges.filter(e => e.target === id && e.type !== 'spouse').forEach(e => queue.push({ id: e.source, gen: gen - 1 }));
                    }
                    return 0;
                  };

                  const getRelationLabel = (): { label: string; color: string } => {
                    if (node.id === 'root') return { label: 'Я', color: 'bg-[#4caf50]' };

                    const gen = getGeneration(node.id);

                    // Проверяем — это супруг кого-то
                    const isSpouseOf = edges.some(e => e.type === 'spouse' && (e.source === node.id || e.target === node.id));

                    if (isSpouseOf) {
                      const spouseEdge = edges.find(e => e.type === 'spouse' && (e.source === node.id || e.target === node.id));
                      const partnerId = spouseEdge ? (spouseEdge.source === node.id ? spouseEdge.target : spouseEdge.source) : null;
                      const partnerGen = partnerId ? getGeneration(partnerId) : gen;
                      if (partnerGen === 0) return { label: isMale ? 'Муж' : 'Жена', color: isMale ? 'bg-[#5b9bd5]' : 'bg-[#e91e63]' };
                      if (partnerGen === -1) return { label: isMale ? 'Муж детей' : 'Жена детей', color: isMale ? 'bg-[#5b9bd5]' : 'bg-[#e91e63]' };
                      if (partnerGen <= -2) return { label: isMale ? 'Дед (жена)' : 'Бабушка', color: isMale ? 'bg-[#5b9bd5]' : 'bg-[#e91e63]' };
                    }

                    // По поколению
                    if (gen === -1) return { label: isMale ? 'Сын' : 'Дочь', color: isMale ? 'bg-[#5b9bd5]' : 'bg-[#e91e63]' };
                    if (gen === -2) return { label: isMale ? 'Внук' : 'Внучка', color: isMale ? 'bg-[#5b9bd5]' : 'bg-[#e91e63]' };
                    if (gen === 1) return { label: isMale ? 'Отец' : 'Мать', color: isMale ? 'bg-[#5b9bd5]' : 'bg-[#e91e63]' };
                    if (gen === 2) return { label: isMale ? 'Дедушка' : 'Бабушка', color: isMale ? 'bg-[#5b9bd5]' : 'bg-[#e91e63]' };
                    if (gen === 3) return { label: isMale ? 'Прадедушка' : 'Прабабушка', color: isMale ? 'bg-[#5b9bd5]' : 'bg-[#e91e63]' };
                    if (gen >= 4) {
                      const pra = 'Пра'.repeat(gen - 2);
                      return { label: isMale ? `${pra}дедушка` : `${pra}бабушка`, color: isMale ? 'bg-[#5b9bd5]' : 'bg-[#e91e63]' };
                    }
                    if (gen <= -3) {
                      const pra = 'Пра'.repeat(Math.abs(gen) - 2);
                      return { label: isMale ? `${pra}внук` : `${pra}внучка`, color: isMale ? 'bg-[#5b9bd5]' : 'bg-[#e91e63]' };
                    }

                    // Братья/сёстры (gen === 0, не root)
                    return { label: isMale ? 'Брат' : 'Сестра', color: isMale ? 'bg-[#5b9bd5]' : 'bg-[#e91e63]' };
                  };

                  const { label: badge, color: badgeBg } = getRelationLabel();

                  const lastName = node.lastName || '';
                  const firstName = [node.firstName, node.middleName].filter(Boolean).join(' ');
                  const maiden = node.maidenName ? `(${node.maidenName})` : '';
                  const dates = [node.birthDate, node.isAlive ? null : (node.deathDate || '...')].filter(Boolean).join('—');
                  const place = node.birthPlace || '';

                  return (
                    <div
                      key={node.id}
                      className="absolute group"
                      style={{
                        left: node.x,
                        top: node.y,
                        width: 120,
                        zIndex: selected ? 50 : menuOpen ? 60 : 10,
                        cursor: 'grab'
                      }}
                      onMouseDown={(e) => onNodeDragStart(e, node.id)}
                      onMouseUp={(e) => {
                        const startPos = lastMousePos.current;
                        const dist = Math.sqrt(
                          Math.pow(e.clientX - startPos.x, 2) + Math.pow(e.clientY - startPos.y, 2)
                        );
                        if (dist < 5) onSelectNode(node.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
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
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
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