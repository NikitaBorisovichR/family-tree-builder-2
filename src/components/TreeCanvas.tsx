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
                    // NODE_W=80, NODE_H=100, avatar center ~40px from top
                    const NW = 80;
                    const isSpouse = edge.type === 'spouse';
                    const isHorizontal = isSpouse || Math.abs(s.y - t.y) < 60;

                    if (isHorizontal) {
                      const leftNode = s.x < t.x ? s : t;
                      const rightNode = s.x < t.x ? t : s;
                      const sy = leftNode.y + 40;
                      const ey = rightNode.y + 40;
                      const sx = leftNode.x + NW;
                      const ex = rightNode.x;
                      const mx = (sx + ex) / 2;
                      return (
                        <g key={edge.id}>
                          <path
                            d={`M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`}
                            fill="none"
                            stroke={isSpouse ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                            strokeWidth={isSpouse ? 2 : 1.5}
                            strokeDasharray={isSpouse ? '6,3' : undefined}
                            opacity="0.7"
                          />
                          {isSpouse && (
                            <circle cx={mx} cy={(sy + ey) / 2} r="3" fill="hsl(var(--primary))" opacity="0.5" />
                          )}
                        </g>
                      );
                    } else {
                      // parent → child vertical
                      const sx = s.x + NW / 2;
                      const sy = s.y + 98;
                      const ex = t.x + NW / 2;
                      const ey = t.y;
                      const my = (sy + ey) / 2;
                      return (
                        <path
                          key={edge.id}
                          d={`M ${sx} ${sy} C ${sx} ${my}, ${ex} ${my}, ${ex} ${ey}`}
                          fill="none"
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth="1.5"
                          opacity="0.6"
                        />
                      );
                    }
                  })}
                </svg>
                {nodes.map((node) => {
                  const isMale = node.gender === 'male';
                  const avatarBg = isMale ? 'bg-blue-100' : 'bg-pink-100';
                  const avatarBorder = isMale ? 'border-blue-400' : 'border-pink-400';
                  const avatarIcon = isMale ? 'text-blue-500' : 'text-pink-500';
                  const selected = selectedId === node.id;
                  const menuOpen = activeMenu === node.id;
                  const hasName = node.firstName || node.lastName;
                  const shortName = node.firstName
                    ? node.firstName.split(' ')[0]
                    : node.lastName || '?';

                  return (
                    <div
                      key={node.id}
                      className="absolute group"
                      style={{
                        left: node.x,
                        top: node.y,
                        width: 80,
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
                      {/* Карточка */}
                      <div className={`flex flex-col items-center select-none`}>
                        {/* Аватар */}
                        <div
                          className={`w-14 h-14 rounded-full border-2 ${avatarBorder} ${avatarBg} flex items-center justify-center ${avatarIcon} shadow-md transition-all ${
                            selected ? 'ring-4 ring-primary ring-offset-2 shadow-xl scale-110' : 'hover:scale-105'
                          }`}
                        >
                          <Icon name={isMale ? 'User' : 'User'} size={26} />
                        </div>

                        {/* Имя и даты */}
                        <div className="mt-1.5 text-center w-full">
                          <p className="text-[11px] font-semibold text-foreground leading-tight truncate px-0.5">
                            {hasName ? shortName : '—'}
                          </p>
                          {node.lastName && node.firstName && (
                            <p className="text-[9px] text-muted-foreground truncate px-0.5 leading-tight">
                              {node.lastName}
                            </p>
                          )}
                          <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                            {node.birthDate ? node.birthDate.slice(-4) || node.birthDate : '????'}
                            {!node.isAlive && node.deathDate ? `–${node.deathDate.slice(-4) || node.deathDate}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Кнопка + */}
                      <div
                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20"
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