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
                  {edges.map((edge) => {
                    const s = nodes.find((n) => n.id === edge.source);
                    const t = nodes.find((n) => n.id === edge.target);
                    if (!s || !t) return null;
                    const isHorizontal = edge.type === 'spouse' || Math.abs(s.y - t.y) < 50;
                    let start, end;
                    if (isHorizontal) {
                      const leftNode = s.x < t.x ? s : t;
                      const rightNode = s.x < t.x ? t : s;
                      start = { x: leftNode.x + 192, y: leftNode.y + 40 };
                      end = { x: rightNode.x, y: rightNode.y + 40 };
                    } else {
                      start = { x: s.x + 96, y: s.y + 70 };
                      end = { x: t.x + 96, y: t.y };
                    }

                    if (isHorizontal) {
                      return (
                        <path
                          key={edge.id}
                          d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                          fill="none"
                          stroke="hsl(var(--destructive))"
                          strokeWidth="1.5"
                          strokeDasharray="5,5"
                          className="pointer-events-none"
                        />
                      );
                    } else {
                      const deltaY = end.y - start.y;
                      const cp1 = { x: start.x, y: start.y + deltaY / 2 };
                      const cp2 = { x: end.x, y: end.y - deltaY / 2 };
                      return (
                        <path
                          key={edge.id}
                          d={`M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`}
                          fill="none"
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth="2"
                          className="pointer-events-none"
                        />
                      );
                    }
                  })}
                </svg>
                {nodes.map((node) => {
                  const isMale = node.gender === 'male';
                  const borderColor = isMale ? 'border-blue-400' : 'border-pink-400';
                  const bgColor = isMale ? 'bg-blue-50' : 'bg-pink-50';
                  const iconColor = isMale ? 'text-blue-400' : 'text-pink-400';
                  const selected = selectedId === node.id;
                  const menuOpen = activeMenu === node.id;

                  return (
                    <div
                      key={node.id}
                      className="absolute w-48 transition-shadow duration-200 group"
                      style={{
                        left: node.x,
                        top: node.y,
                        zIndex: selected ? 50 : menuOpen ? 60 : 10,
                        cursor: 'grab'
                      }}
                      onMouseDown={(e) => onNodeDragStart(e, node.id)}
                      onMouseUp={(e) => {
                        const startPos = lastMousePos.current;
                        const dist = Math.sqrt(
                          Math.pow(e.clientX - startPos.x, 2) + Math.pow(e.clientY - startPos.y, 2)
                        );
                        if (dist < 5) {
                          onSelectNode(node.id);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`relative bg-white rounded-lg shadow-md p-3 border-l-4 ${borderColor} ${
                          selected ? 'ring-2 ring-primary shadow-xl' : ''
                        }`}
                      >
                        <div 
                          className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20"
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
                            <Icon name="Plus" size={14} />
                          </button>

                          {menuOpen && (
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white rounded-md shadow-2xl border-2 border-primary/20 overflow-hidden min-w-[120px] z-30">
                              <div className="grid grid-cols-2 gap-px bg-border">
                                {node.gender === 'male' && (
                                  <button
                                    className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAddRelative(node.id, 'spouse', 'female');
                                      setActiveMenu(null);
                                    }}
                                  >
                                    <Icon name="Heart" size={16} className="text-pink-500" />
                                    <span className="text-xs font-medium">Жена</span>
                                  </button>
                                )}
                                {node.gender === 'female' && (
                                  <button
                                    className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAddRelative(node.id, 'spouse', 'male');
                                      setActiveMenu(null);
                                    }}
                                  >
                                    <Icon name="Heart" size={16} className="text-blue-500" />
                                    <span className="text-xs font-medium">Муж</span>
                                  </button>
                                )}
                                <button
                                  className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddRelative(node.id, 'parent', 'male');
                                    setActiveMenu(null);
                                  }}
                                >
                                  <Icon name="UserRound" size={16} className="text-blue-500" />
                                  <span className="text-xs font-medium">Отец</span>
                                </button>
                                <button
                                  className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddRelative(node.id, 'parent', 'female');
                                    setActiveMenu(null);
                                  }}
                                >
                                  <Icon name="UserRound" size={16} className="text-pink-500" />
                                  <span className="text-xs font-medium">Мать</span>
                                </button>
                                <button
                                  className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddRelative(node.id, 'sibling', 'male');
                                    setActiveMenu(null);
                                  }}
                                >
                                  <Icon name="Users" size={16} className="text-blue-500" />
                                  <span className="text-xs font-medium">Брат</span>
                                </button>
                                <button
                                  className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddRelative(node.id, 'sibling', 'female');
                                    setActiveMenu(null);
                                  }}
                                >
                                  <Icon name="Users" size={16} className="text-pink-500" />
                                  <span className="text-xs font-medium">Сестра</span>
                                </button>
                                <button
                                  className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddRelative(node.id, 'child', 'male');
                                    setActiveMenu(null);
                                  }}
                                >
                                  <Icon name="Baby" size={16} className="text-blue-500" />
                                  <span className="text-xs font-medium">Сын</span>
                                </button>
                                <button
                                  className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddRelative(node.id, 'child', 'female');
                                    setActiveMenu(null);
                                  }}
                                >
                                  <Icon name="Baby" size={16} className="text-pink-500" />
                                  <span className="text-xs font-medium">Дочь</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 select-none">
                          <div
                            className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center ${iconColor} shrink-0`}
                          >
                            <Icon name="User" size={20} />
                          </div>
                          <div className="overflow-hidden w-full">
                            <h4 className="font-bold text-foreground text-sm truncate leading-tight">
                              {node.firstName} {node.lastName}
                            </h4>
                            {node.maidenName && (
                              <p className="text-[10px] text-muted-foreground truncate">({node.maidenName})</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {node.birthDate || '????'} - {node.isAlive ? '' : node.deathDate || '...'}
                            </p>
                          </div>
                        </div>
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