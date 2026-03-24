import React from 'react';
import Icon from '@/components/ui/icon';
import { FamilyNode, Edge } from './TreeTypes';

interface TreeNodeProps {
  node: FamilyNode;
  pos: { x: number; y: number };
  selected: boolean;
  menuOpen: boolean;
  edges: Edge[];
  onSelect: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onAddRelative: (sourceId: string, type: string, gender?: 'male' | 'female') => void;
}

function getGeneration(nodeId: string, edges: Edge[]): number {
  const visited = new Set<string>();
  const queue: Array<{ id: string; gen: number }> = [{ id: 'root', gen: 0 }];
  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;
    if (id === nodeId) return gen;
    if (visited.has(id)) continue;
    visited.add(id);
    edges.filter(e => e.target === id && e.type !== 'spouse')
      .forEach(e => queue.push({ id: e.source, gen: gen + 1 }));
    edges.filter(e => e.source === id && e.type !== 'spouse')
      .forEach(e => queue.push({ id: e.target, gen: gen - 1 }));
  }
  return 0;
}

function getRelationLabel(node: FamilyNode, edges: Edge[]): { label: string; color: string } {
  const isMale = node.gender === 'male';
  const blue = 'bg-[#5b9bd5]';
  const pink = 'bg-[#e91e63]';
  const green = 'bg-[#4caf50]';
  const c = isMale ? blue : pink;

  if (node.id === 'root') return { label: 'Я', color: green };

  const spouseEdge = edges.find(e => e.type === 'spouse' && (e.source === node.id || e.target === node.id));
  if (spouseEdge) {
    const partnerId = spouseEdge.source === node.id ? spouseEdge.target : spouseEdge.source;
    const partnerGen = getGeneration(partnerId, edges);
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

  const gen = getGeneration(node.id, edges);
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
  return { label: isMale ? 'Брат' : 'Сестра', color: c };
}

export default function TreeNode({
  node, pos, selected, menuOpen, edges,
  onSelect, onToggleMenu, onCloseMenu, onAddRelative
}: TreeNodeProps) {
  const isMale = node.gender === 'male';
  const avatarBg = isMale ? 'bg-[#dce8f5]' : 'bg-[#f5dce8]';
  const avatarIcon = isMale ? 'text-[#6baed6]' : 'text-[#d6748b]';
  const avatarRing = isMale
    ? selected ? 'ring-4 ring-blue-400' : 'ring-2 ring-[#6baed6]/40'
    : selected ? 'ring-4 ring-pink-400' : 'ring-2 ring-[#d6748b]/40';

  const { label: badge, color: badgeBg } = getRelationLabel(node, edges);

  const lastName = node.lastName || '';
  const firstName = [node.firstName, node.middleName].filter(Boolean).join(' ');
  const maiden = node.maidenName ? `(${node.maidenName})` : '';
  const dates = [node.birthDate, node.isAlive ? null : (node.deathDate || '...')].filter(Boolean).join('—');
  const place = node.birthPlace || '';

  return (
    <div
      key={node.id}
      className="absolute group"
      style={{ left: pos.x, top: pos.y, width: 120, zIndex: selected ? 50 : menuOpen ? 60 : 10, cursor: 'pointer' }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <div className="flex flex-col items-center select-none">
        {/* Аватар */}
        <div className="relative">
          <div className={`w-[90px] h-[90px] rounded-full ${avatarBg} ${avatarIcon} ${avatarRing} flex items-center justify-center shadow-md transition-all ${selected ? 'scale-105' : 'hover:scale-[1.03]'}`}>
            <Icon name="User" size={46} />
          </div>
          <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${badgeBg} text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow`}>
            {badge}
          </div>
        </div>

        {/* Имя и детали */}
        <div className="mt-4 text-center w-full">
          {lastName && <p className="text-[11px] font-bold text-foreground leading-tight">{lastName}{maiden ? ` ${maiden}` : ''}</p>}
          {firstName && <p className="text-[11px] font-semibold text-foreground leading-tight">{firstName}</p>}
          {!lastName && !firstName && <p className="text-[10px] text-muted-foreground italic">Не заполнено</p>}
          {place && <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{place}</p>}
          {dates && <p className="text-[9px] text-muted-foreground leading-tight">{dates}</p>}
        </div>
      </div>

      {/* Кнопка + и меню */}
      <div
        className="mt-1 relative flex justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          title="Добавить родственника"
          className="bg-foreground text-background rounded-full w-6 h-6 flex items-center justify-center hover:bg-primary shadow-lg hover:scale-110 transition"
          onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
        >
          <Icon name="Plus" size={13} />
        </button>

        {menuOpen && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-border overflow-hidden z-30" style={{ minWidth: 130 }}>
            <div className="grid grid-cols-2 gap-px bg-border">
              {node.gender === 'male' ? (
                <button className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'spouse', 'female'); onCloseMenu(); }}>
                  <Icon name="Heart" size={15} className="text-pink-500" />
                  <span className="text-[10px] font-medium">Жена</span>
                </button>
              ) : (
                <button className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'spouse', 'male'); onCloseMenu(); }}>
                  <Icon name="Heart" size={15} className="text-blue-500" />
                  <span className="text-[10px] font-medium">Муж</span>
                </button>
              )}
              <button className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'parent', 'male'); onCloseMenu(); }}>
                <Icon name="UserRound" size={15} className="text-blue-500" />
                <span className="text-[10px] font-medium">Отец</span>
              </button>
              <button className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'parent', 'female'); onCloseMenu(); }}>
                <Icon name="UserRound" size={15} className="text-pink-500" />
                <span className="text-[10px] font-medium">Мать</span>
              </button>
              <button className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'sibling', 'male'); onCloseMenu(); }}>
                <Icon name="Users" size={15} className="text-blue-500" />
                <span className="text-[10px] font-medium">Брат</span>
              </button>
              <button className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'sibling', 'female'); onCloseMenu(); }}>
                <Icon name="Users" size={15} className="text-pink-500" />
                <span className="text-[10px] font-medium">Сестра</span>
              </button>
              <button className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'child', 'male'); onCloseMenu(); }}>
                <Icon name="Baby" size={15} className="text-blue-500" />
                <span className="text-[10px] font-medium">Сын</span>
              </button>
              <button className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onAddRelative(node.id, 'child', 'female'); onCloseMenu(); }}>
                <Icon name="Baby" size={15} className="text-pink-500" />
                <span className="text-[10px] font-medium">Дочь</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
