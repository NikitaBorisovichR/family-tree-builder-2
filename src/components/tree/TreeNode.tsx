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
    // родители (source→target = родитель→ребёнок): идём вверх +1
    edges.filter(e => e.target === id && !e.type)
      .forEach(e => { if (!visited.has(e.source)) queue.push({ id: e.source, gen: gen + 1 }); });
    // дети: идём вниз -1
    edges.filter(e => e.source === id && !e.type)
      .forEach(e => { if (!visited.has(e.target)) queue.push({ id: e.target, gen: gen - 1 }); });
    // супруги: то же поколение (позволяет добраться до их родственников)
    edges.filter(e => e.type === 'spouse' && (e.source === id || e.target === id))
      .forEach(e => {
        const spId = e.source === id ? e.target : e.source;
        if (!visited.has(spId)) queue.push({ id: spId, gen });
      });
  }
  return 0;
}

// Ищем кратчайший путь от root до nodeId.
// Возвращаем массив шагов: { id, via: 'parent'|'child'|'spouse' }
// parent = идём к родителю, child = идём к ребёнку, spouse = идём к супругу
type Step = { id: string; via: 'parent' | 'child' | 'spouse' };

function findPath(nodeId: string, edges: Edge[]): Step[] | null {
  if (nodeId === 'root') return [];
  const visited = new Set<string>();
  const queue: Array<{ id: string; path: Step[] }> = [{ id: 'root', path: [] }];
  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    // родители
    edges.filter(e => e.target === id && !e.type).forEach(e => {
      const next = e.source;
      const newPath = [...path, { id: next, via: 'parent' as const }];
      if (next === nodeId) return queue.unshift({ id: next, path: newPath }); // найден
      if (!visited.has(next)) queue.push({ id: next, path: newPath });
    });
    // дети
    edges.filter(e => e.source === id && !e.type).forEach(e => {
      const next = e.target;
      const newPath = [...path, { id: next, via: 'child' as const }];
      if (next === nodeId) return queue.unshift({ id: next, path: newPath });
      if (!visited.has(next)) queue.push({ id: next, path: newPath });
    });
    // супруги
    edges.filter(e => e.type === 'spouse' && (e.source === id || e.target === id)).forEach(e => {
      const next = e.source === id ? e.target : e.source;
      const newPath = [...path, { id: next, via: 'spouse' as const }];
      if (next === nodeId) return queue.unshift({ id: next, path: newPath });
      if (!visited.has(next)) queue.push({ id: next, path: newPath });
    });
    // проверяем голову очереди после добавлений
    if (queue[0]?.id === nodeId) return queue[0].path;
  }
  return null;
}

function getGeneration(nodeId: string, edges: Edge[]): number {
  const visited = new Set<string>();
  const queue: Array<{ id: string; gen: number }> = [{ id: 'root', gen: 0 }];
  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;
    if (id === nodeId) return gen;
    if (visited.has(id)) continue;
    visited.add(id);
    edges.filter(e => e.target === id && !e.type)
      .forEach(e => { if (!visited.has(e.source)) queue.push({ id: e.source, gen: gen + 1 }); });
    edges.filter(e => e.source === id && !e.type)
      .forEach(e => { if (!visited.has(e.target)) queue.push({ id: e.target, gen: gen - 1 }); });
    edges.filter(e => e.type === 'spouse' && (e.source === id || e.target === id))
      .forEach(e => {
        const spId = e.source === id ? e.target : e.source;
        if (!visited.has(spId)) queue.push({ id: spId, gen });
      });
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

  const path = findPath(node.id, edges);
  if (!path || path.length === 0) return { label: isMale ? 'Родственник' : 'Родственница', color: c };

  const vias = path.map(s => s.via);

  // Прямые по крови (только parent/child шаги)
  const isBloodOnly = vias.every(v => v === 'parent' || v === 'child');
  const parentCount = vias.filter(v => v === 'parent').length;
  const childCount  = vias.filter(v => v === 'child').length;

  if (isBloodOnly) {
    // Только предки (все шаги — parent)
    if (childCount === 0) {
      if (parentCount === 1) return { label: isMale ? 'Отец' : 'Мать', color: c };
      if (parentCount === 2) return { label: isMale ? 'Дедушка' : 'Бабушка', color: c };
      if (parentCount === 3) return { label: isMale ? 'Прадедушка' : 'Прабабушка', color: c };
      const pra = 'Пра'.repeat(parentCount - 2);
      return { label: isMale ? `${pra}дедушка` : `${pra}бабушка`, color: c };
    }
    // Только потомки (все шаги — child)
    if (parentCount === 0) {
      if (childCount === 1) return { label: isMale ? 'Сын' : 'Дочь', color: c };
      if (childCount === 2) return { label: isMale ? 'Внук' : 'Внучка', color: c };
      if (childCount === 3) return { label: isMale ? 'Правнук' : 'Правнучка', color: c };
      const pra = 'Пра'.repeat(childCount - 2);
      return { label: isMale ? `${pra}внук` : `${pra}внучка`, color: c };
    }
    // Смешанные (боковая линия — братья, племянники и т.д.)
    if (parentCount === 1 && childCount === 1) return { label: isMale ? 'Брат' : 'Сестра', color: c };
    if (parentCount === 1 && childCount === 2) return { label: isMale ? 'Племянник' : 'Племянница', color: c };
    if (parentCount === 2 && childCount === 1) return { label: isMale ? 'Дядя' : 'Тётя', color: c };
    if (parentCount === 2 && childCount === 2) return { label: isMale ? 'Двоюродный брат' : 'Двоюродная сестра', color: c };
    return { label: isMale ? 'Родственник' : 'Родственница', color: c };
  }

  // Путь через супруга
  const firstSpouseIdx = vias.indexOf('spouse');
  const beforeSpouse = vias.slice(0, firstSpouseIdx);
  const afterSpouse  = vias.slice(firstSpouseIdx + 1);

  const beforeParents  = beforeSpouse.filter(v => v === 'parent').length;
  const beforeChildren = beforeSpouse.filter(v => v === 'child').length;
  const afterParents   = afterSpouse.filter(v => v === 'parent').length;
  const afterChildren  = afterSpouse.filter(v => v === 'child').length;

  // root → [дети] → spouse → ... (зять/невестка/супруг ребёнка)
  if (beforeChildren > 0 && beforeParents === 0 && afterSpouse.length === 0) {
    if (beforeChildren === 1) return { label: isMale ? 'Зять' : 'Невестка', color: c };
    return { label: isMale ? 'Зять' : 'Невестка', color: c };
  }

  // root → spouse → ... (супруг/а)
  if (beforeSpouse.length === 0) {
    if (afterSpouse.length === 0) return { label: isMale ? 'Муж' : 'Жена', color: c };
    // root → spouse → parent(s) → ... (тесть/тёща / свёкор/свекровь)
    if (afterChildren === 0) {
      if (afterParents === 1) return { label: isMale ? 'Тесть' : 'Тёща', color: c };
      if (afterParents === 2) return { label: isMale ? 'Дед супруга' : 'Баб. супруга', color: c };
      return { label: isMale ? 'Родств. супруга' : 'Родств. супруги', color: c };
    }
    // root → spouse → child → ... (пасынок/падчерица)
    if (afterParents === 0 && afterChildren === 1) return { label: isMale ? 'Пасынок' : 'Падчерица', color: c };
    // root → spouse → sibling-like
    if (afterParents === 1 && afterChildren === 1) return { label: isMale ? 'Шурин' : 'Свояченица', color: c };
    return { label: isMale ? 'Родств. супруга' : 'Родств. супруги', color: c };
  }

  // root → parent(s) → spouse → ... (супруг родителя)
  if (beforeChildren === 0 && beforeParents > 0 && afterSpouse.length === 0) {
    if (beforeParents === 1) return { label: isMale ? 'Отчим' : 'Мачеха', color: c };
    return { label: isMale ? 'Супруг предка' : 'Супруга предка', color: c };
  }

  return { label: isMale ? 'Родственник' : 'Родственница', color: c };
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

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (menuOpen) {
      onCloseMenu();
    } else {
      onSelect();
    }
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleMenu();
  };

  const handleMenuItemClick = (e: React.MouseEvent, type: string, gender?: 'male' | 'female') => {
    e.stopPropagation();
    onAddRelative(node.id, type, gender);
    onCloseMenu();
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: 120,
        zIndex: selected ? 50 : menuOpen ? 60 : 10,
      }}
      onClick={handleCardClick}
    >
      {/* Карточка */}
      <div
        className="flex flex-col items-center select-none cursor-pointer"
        style={{ userSelect: 'none' }}
      >
        {/* Аватар */}
        <div className="relative">
          <div className={`w-[90px] h-[90px] rounded-full ${avatarBg} ${avatarIcon} ${avatarRing} flex items-center justify-center shadow-md transition-all ${selected ? 'scale-105' : ''}`}>
            <Icon name="User" size={46} />
          </div>
          {/* Бейдж роли */}
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

      {/* Кнопка + — всегда видима */}
      <div
        style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: 6 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          title="Добавить родственника"
          style={{
            width: 24, height: 24, borderRadius: '50%',
            background: '#1a1a1a', color: '#fff',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            fontSize: 18, lineHeight: 1,
          }}
          onClick={handlePlusClick}
        >
          <Icon name="Plus" size={13} />
        </button>

        {/* Выпадающее меню */}
        {menuOpen && (
          <div
            style={{
              position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)',
              background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              border: '1px solid #e5e7eb', overflow: 'hidden', minWidth: 140, zIndex: 100,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#e5e7eb' }}>
              {node.gender === 'male' ? (
                <button className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => handleMenuItemClick(e, 'spouse', 'female')}>
                  <Icon name="Heart" size={15} className="text-pink-500" />
                  <span className="text-[10px] font-medium">Жена</span>
                </button>
              ) : (
                <button className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => handleMenuItemClick(e, 'spouse', 'male')}>
                  <Icon name="Heart" size={15} className="text-blue-500" />
                  <span className="text-[10px] font-medium">Муж</span>
                </button>
              )}
              <button className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => handleMenuItemClick(e, 'parent', 'male')}>
                <Icon name="UserRound" size={15} className="text-blue-500" />
                <span className="text-[10px] font-medium">Отец</span>
              </button>
              <button className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => handleMenuItemClick(e, 'parent', 'female')}>
                <Icon name="UserRound" size={15} className="text-pink-500" />
                <span className="text-[10px] font-medium">Мать</span>
              </button>
              <button className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => handleMenuItemClick(e, 'sibling', 'male')}>
                <Icon name="Users" size={15} className="text-blue-500" />
                <span className="text-[10px] font-medium">Брат</span>
              </button>
              <button className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => handleMenuItemClick(e, 'sibling', 'female')}>
                <Icon name="Users" size={15} className="text-pink-500" />
                <span className="text-[10px] font-medium">Сестра</span>
              </button>
              <button className="bg-white hover:bg-blue-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => handleMenuItemClick(e, 'child', 'male')}>
                <Icon name="Baby" size={15} className="text-blue-500" />
                <span className="text-[10px] font-medium">Сын</span>
              </button>
              <button className="bg-white hover:bg-pink-50 p-2 flex flex-col items-center gap-1 transition-colors" onClick={(e) => handleMenuItemClick(e, 'child', 'female')}>
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