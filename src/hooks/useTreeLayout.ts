import { useMemo } from 'react';
import { FamilyNode, Edge } from '@/components/TreeCanvas';

// Размеры карточки
const NODE_W = 120;
const NODE_H = 190;
const GAP_X = 48;          // горизонтальный зазор между узлами
const GAP_Y = 90;          // вертикальный зазор между поколениями
const COL_W = NODE_W + GAP_X;         // 168
const ROW_H = NODE_H + GAP_Y;         // 280
const COUPLE_GAP = GAP_X;             // зазор внутри пары
const FAMILY_GAP = GAP_X * 2;         // зазор между семейными блоками

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
}

export function useTreeLayout(nodes: FamilyNode[], edges: Edge[]): LayoutNode[] {
  return useMemo(() => {
    if (!nodes.length) return [];

    const nodeIds = new Set(nodes.map(n => n.id));

    // ── Строим граф ──────────────────────────────────────────────────────────
    // parent-edge: source=родитель, target=ребёнок
    const parentEdges = edges.filter(e => !e.type && nodeIds.has(e.source) && nodeIds.has(e.target));
    const spouseEdges = edges.filter(e => e.type === 'spouse' && nodeIds.has(e.source) && nodeIds.has(e.target));

    const childrenOf = new Map<string, Set<string>>();
    const parentsOf  = new Map<string, Set<string>>();
    const spouseOf   = new Map<string, Set<string>>();
    nodes.forEach(n => {
      childrenOf.set(n.id, new Set());
      parentsOf.set(n.id, new Set());
      spouseOf.set(n.id, new Set());
    });

    parentEdges.forEach(e => {
      childrenOf.get(e.source)!.add(e.target);
      parentsOf.get(e.target)!.add(e.source);
    });
    spouseEdges.forEach(e => {
      spouseOf.get(e.source)!.add(e.target);
      spouseOf.get(e.target)!.add(e.source);
    });

    // ── BFS: определяем поколение (gen=0 root, >0 предки, <0 потомки) ────────
    const generation = new Map<string, number>();
    {
      const q: Array<{ id: string; gen: number }> = [{ id: 'root', gen: 0 }];
      const vis = new Set<string>();
      while (q.length) {
        const { id, gen } = q.shift()!;
        if (vis.has(id)) continue;
        vis.add(id);
        generation.set(id, gen);
        parentsOf.get(id)!.forEach(p => { if (!vis.has(p)) q.push({ id: p, gen: gen + 1 }); });
        childrenOf.get(id)!.forEach(c => { if (!vis.has(c)) q.push({ id: c, gen: gen - 1 }); });
        spouseOf.get(id)!.forEach(s => { if (!vis.has(s)) q.push({ id: s, gen }); });
      }
    }
    // Sibling-edges (без общих родителей) — то же поколение
    edges.filter(e => e.type === 'sibling' && nodeIds.has(e.source) && nodeIds.has(e.target)).forEach(e => {
      const gS = generation.get(e.source), gT = generation.get(e.target);
      if (gS !== undefined && gT === undefined) generation.set(e.target, gS);
      if (gT !== undefined && gS === undefined) generation.set(e.source, gT);
    });
    nodes.forEach(n => { if (!generation.has(n.id)) generation.set(n.id, 0); });

    // ── Группируем по поколениям ──────────────────────────────────────────────
    const byGen = new Map<number, string[]>();
    nodes.forEach(n => {
      const g = generation.get(n.id) ?? 0;
      if (!byGen.has(g)) byGen.set(g, []);
      byGen.get(g)!.push(n.id);
    });

    const gens = Array.from(byGen.keys()).sort((a, b) => b - a); // от старшего (большой) к младшему
    const maxGen = gens[0] ?? 0;

    // ── Строим «семейные юниты» для каждого поколения ────────────────────────
    // Юнит = [персона] или [персона, супруг] + список их детей
    interface Unit {
      members: string[];   // упорядоченный список (male первым если есть)
      children: string[];  // дети этой пары
      left: number;        // назначенный X левого члена
      width: number;       // NODE_W или NODE_W*2+COUPLE_GAP
    }

    function makeUnits(genIds: string[]): Unit[] {
      const used = new Set<string>();
      const units: Unit[] = [];
      genIds.forEach(id => {
        if (used.has(id)) return;
        used.add(id);
        // Ищем супруга в том же поколении
        const sp = [...spouseOf.get(id)!].find(sid => genIds.includes(sid) && !used.has(sid));
        let members: string[];
        if (sp) {
          used.add(sp);
          // Мужчина левее
          const node = nodes.find(n => n.id === id)!;
          const spNode = nodes.find(n => n.id === sp)!;
          members = node.gender === 'male' ? [id, sp] : [sp, id];
        } else {
          members = [id];
        }
        // Дети — объединение детей всех членов
        const childSet = new Set<string>();
        members.forEach(m => childrenOf.get(m)!.forEach(c => childSet.add(c)));
        const children = [...childSet].filter(c => nodeIds.has(c));
        const width = members.length === 1
          ? NODE_W
          : NODE_W * 2 + COUPLE_GAP;
        units.push({ members, children, left: 0, width });
      });
      return units;
    }

    const unitsByGen = new Map<number, Unit[]>();
    gens.forEach(g => unitsByGen.set(g, makeUnits(byGen.get(g)!)));

    // ── Размещаем поколения СВЕРХУ ВНИЗ ──────────────────────────────────────
    // Алгоритм:
    // 1. Верхнее поколение — центрируем в 0 (потом сдвинем всё вправо)
    // 2. Каждое следующее (ниже) поколение:
    //    a. Для каждого юнита вычисляем desired_left = центр его детей − halfWidth
    //    b. Расставляем юниты слева направо без перекрытий
    //    c. Если у юнита нет детей — приклеиваем к предыдущему с FAMILY_GAP

    const posX = new Map<string, number>(); // левый X каждого узла

    function placeUnit(unit: Unit, leftX: number) {
      unit.left = leftX;
      unit.members.forEach((m, i) => posX.set(m, leftX + i * (NODE_W + COUPLE_GAP)));
    }

    function unitCenter(unit: Unit): number {
      // Середина между членами (или центр одиночки)
      return unit.left + unit.width / 2;
    }

    // Возвращает средний X детей (уже размещённых)
    function childrenCenterX(unit: Unit): number | null {
      const placed = unit.children.filter(c => posX.has(c));
      if (!placed.length) return null;
      const xs = placed.map(c => posX.get(c)! + NODE_W / 2);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    }

    // Верхнее поколение: просто в ряд начиная с 0
    {
      const topUnits = unitsByGen.get(maxGen)!;
      let cursor = 0;
      topUnits.forEach(unit => {
        placeUnit(unit, cursor);
        cursor += unit.width + FAMILY_GAP;
      });
    }

    // Идём от второго сверху поколения вниз
    const descendingGens = [...gens]; // уже отсортированы от старшего к младшему

    for (let gi = 1; gi < descendingGens.length; gi++) {
      const g = descendingGens[gi];
      const units = unitsByGen.get(g)!;

      // Для каждого юнита вычисляем desired_left через родителей (уже размещены выше)
      // desired_left = centerX_родителей − unit.width/2
      units.forEach(unit => {
        // Родители данных детей (reverse: дети этого юнита → кто их родители)
        // Но нам нужно: кто является родителем членов юнита?
        const parentIds = new Set<string>();
        unit.members.forEach(m => parentsOf.get(m)!.forEach(p => parentIds.add(p)));

        if (parentIds.size > 0) {
          const placedParents = [...parentIds].filter(p => posX.has(p));
          if (placedParents.length > 0) {
            const xs = placedParents.map(p => posX.get(p)! + NODE_W / 2);
            const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
            (unit as { desiredLeft?: number }).desiredLeft = avg - unit.width / 2;
          }
        }
      });

      // Сортируем юниты по desiredLeft
      const withDesired = units
        .filter(u => (u as { desiredLeft?: number }).desiredLeft !== undefined)
        .sort((a, b) => (a as { desiredLeft?: number }).desiredLeft! - (b as { desiredLeft?: number }).desiredLeft!);
      const noDesired = units.filter(u => (u as { desiredLeft?: number }).desiredLeft === undefined);

      // Расставляем без перекрытий
      let cursor = 0;
      const ordered = [...withDesired, ...noDesired];
      ordered.forEach(unit => {
        const desired = (unit as { desiredLeft?: number }).desiredLeft ?? cursor;
        const leftX = Math.max(cursor, desired);
        placeUnit(unit, leftX);
        cursor = leftX + unit.width + FAMILY_GAP;
      });
    }

    // ── Второй проход: корректируем предков под детей (снизу вверх) ──────────
    // Родители которые уже размещены могут оказаться не над детьми.
    // Пересчитываем: для каждого поколения от предпоследнего вверх
    // если у юнита есть размещённые дети → смещаем к центру детей (не нарушая соседей)
    const ascGens = [...gens].sort((a, b) => a - b); // от младшего к старшему
    for (let gi = 0; gi < ascGens.length - 1; gi++) {
      const g = ascGens[gi + 1]; // поколение выше
      const units = unitsByGen.get(g)!;

      units.forEach((unit, ui) => {
        const cx = childrenCenterX(unit);
        if (cx === null) return;
        const desired = cx - unit.width / 2;
        // Проверяем что не перекрываем соседей
        const prevUnit = units[ui - 1];
        const nextUnit = units[ui + 1];
        const minLeft = prevUnit ? prevUnit.left + prevUnit.width + FAMILY_GAP : -Infinity;
        const maxLeft = nextUnit ? nextUnit.left - unit.width - FAMILY_GAP : Infinity;
        const clamped = Math.max(minLeft, Math.min(maxLeft, desired));
        if (Math.abs(clamped - unit.left) > 1) {
          placeUnit(unit, clamped);
        }
      });
    }

    // ── Сдвигаем всё чтобы минимальный X = 40 ────────────────────────────────
    const allX = nodes.map(n => posX.get(n.id) ?? 0);
    const minX = Math.min(...allX);
    const shift = 40 - minX;
    nodes.forEach(n => posX.set(n.id, (posX.get(n.id) ?? 0) + shift));

    // ── Собираем результат ────────────────────────────────────────────────────
    return nodes.map(n => ({
      id: n.id,
      x: posX.get(n.id) ?? 0,
      y: (maxGen - (generation.get(n.id) ?? 0)) * ROW_H + 40,
    }));
  }, [nodes, edges]);
}
