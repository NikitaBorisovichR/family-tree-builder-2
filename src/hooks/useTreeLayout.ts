import { useMemo } from 'react';
import { FamilyNode, Edge } from '@/components/TreeCanvas';

const NODE_W = 120;
const NODE_H = 190;
const GAP_X = 40;
const GAP_Y = 80;
const COL_W = NODE_W + GAP_X; // 160
const ROW_H = NODE_H + GAP_Y; // 270

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
}

export function useTreeLayout(nodes: FamilyNode[], edges: Edge[]): LayoutNode[] {
  return useMemo(() => {
    if (!nodes.length) return [];

    const nodeIds = new Set(nodes.map(n => n.id));

    const parentEdges = edges.filter(e => !e.type && nodeIds.has(e.source) && nodeIds.has(e.target));
    const spouseEdges = edges.filter(e => e.type === 'spouse' && nodeIds.has(e.source) && nodeIds.has(e.target));

    // Строим: parent → children, child → parents
    const childrenOf = new Map<string, string[]>();
    const parentsOf  = new Map<string, string[]>();
    nodes.forEach(n => { childrenOf.set(n.id, []); parentsOf.set(n.id, []); });

    parentEdges.forEach(e => {
      if (!childrenOf.get(e.source)!.includes(e.target)) childrenOf.get(e.source)!.push(e.target);
      if (!parentsOf.get(e.target)!.includes(e.source))  parentsOf.get(e.target)!.push(e.source);
    });

    // Супруги
    const spouseOf = new Map<string, string[]>();
    nodes.forEach(n => spouseOf.set(n.id, []));
    spouseEdges.forEach(e => {
      if (!spouseOf.get(e.source)!.includes(e.target)) spouseOf.get(e.source)!.push(e.target);
      if (!spouseOf.get(e.target)!.includes(e.source)) spouseOf.get(e.target)!.push(e.source);
    });

    // BFS от root — определяем поколение каждого узла
    const generation = new Map<string, number>();
    const bfsQueue: Array<{ id: string; gen: number }> = [{ id: 'root', gen: 0 }];
    const bfsVisited = new Set<string>();

    while (bfsQueue.length > 0) {
      const { id, gen } = bfsQueue.shift()!;
      if (bfsVisited.has(id)) continue;
      bfsVisited.add(id);
      generation.set(id, gen);

      (parentsOf.get(id) || []).forEach(pid => {
        if (!bfsVisited.has(pid)) bfsQueue.push({ id: pid, gen: gen + 1 });
      });
      (childrenOf.get(id) || []).forEach(cid => {
        if (!bfsVisited.has(cid)) bfsQueue.push({ id: cid, gen: gen - 1 });
      });
      (spouseOf.get(id) || []).forEach(sid => {
        if (!bfsVisited.has(sid)) bfsQueue.push({ id: sid, gen });
      });
    }

    // Sibling-edges без общих родителей
    edges.filter(e => e.type === 'sibling' && nodeIds.has(e.source) && nodeIds.has(e.target)).forEach(e => {
      const gS = generation.get(e.source);
      const gT = generation.get(e.target);
      if (gS !== undefined && gT === undefined) generation.set(e.target, gS);
      if (gT !== undefined && gS === undefined) generation.set(e.source, gT);
    });

    nodes.forEach(n => { if (!generation.has(n.id)) generation.set(n.id, 0); });

    // Группируем по поколениям
    const byGen = new Map<number, string[]>();
    nodes.forEach(n => {
      const g = generation.get(n.id) ?? 0;
      if (!byGen.has(g)) byGen.set(g, []);
      byGen.get(g)!.push(n.id);
    });

    const gens = Array.from(byGen.keys()).sort((a, b) => b - a);
    const maxGen = gens.length ? gens[0] : 0;

    // Вычисляем позиции снизу вверх (от потомков к предкам)
    // Ключ идеи: X узла определяется центром над его детьми.
    // Алгоритм Reingold–Tilford (упрощённый):
    // 1. Сначала расставляем самое нижнее поколение слева направо
    // 2. Для каждого вышестоящего поколения центрируем пару/родителя над средним X детей

    const posX = new Map<string, number>();

    // Рабочий курсор для расстановки без перекрытий
    const cursor = 0;

    // Обрабатываем поколения от нижнего к верхнему
    const sortedGens = [...gens].sort((a, b) => a - b); // от самого младшего к старшему

    // Определяем «группы»: пара (или одиночка) + их дети
    // Для каждого поколения строим упорядоченный список «семейных блоков»

    const placed = new Set<string>(); // уже размещённые узлы

    // Шаг 1: размещаем корневое поколение (gen=0) и спускаемся вниз, потом поднимаемся вверх

    // Собираем все поколения по возрастанию gen (предки имеют большой gen)
    // Начнём с листьев (самое маленькое поколение) и пойдём вверх

    const minGen = sortedGens[0]; // самое младшее

    // --- Строим «семейные пары» для каждого поколения ---
    // Пара = [member1, member2(spouse)?] и список их детей
    interface FamilyUnit {
      members: string[]; // 1 или 2 (пара)
      children: string[]; // дети этой пары
      centerX?: number;  // вычисленный центр
    }

    // Строим units для каждого поколения (кроме самого нижнего)
    const unitsByGen = new Map<number, FamilyUnit[]>();

    gens.forEach(g => {
      const ids = byGen.get(g)!;
      const pairedInGen = new Set<string>();
      const units: FamilyUnit[] = [];

      ids.forEach(id => {
        if (pairedInGen.has(id)) return;
        const unit: FamilyUnit = { members: [id], children: [] };
        pairedInGen.add(id);

        // Ищем супруга в том же поколении
        const spouseInGen = (spouseOf.get(id) || []).find(sid => ids.includes(sid) && !pairedInGen.has(sid));
        if (spouseInGen) {
          unit.members.push(spouseInGen);
          pairedInGen.add(spouseInGen);
        }

        // Дети unit — объединение детей всех members
        const childSet = new Set<string>();
        unit.members.forEach(m => (childrenOf.get(m) || []).forEach(c => childSet.add(c)));
        unit.children = Array.from(childSet).filter(c => nodeIds.has(c));

        units.push(unit);
      });

      unitsByGen.set(g, units);
    });

    // --- Размещаем снизу вверх ---
    // Начинаем с самого нижнего поколения: равномерно слева направо

    // Для каждого поколения — итоговый порядок узлов
    const orderByGen = new Map<number, string[]>();

    // Нижнее поколение — просто в порядке как есть (пары рядом)
    {
      const g = minGen;
      const units = unitsByGen.get(g)!;
      const order: string[] = [];
      units.forEach(unit => unit.members.forEach(m => order.push(m)));
      orderByGen.set(g, order);

      let x = 0;
      units.forEach(unit => {
        // центр unit
        const w = unit.members.length * COL_W - GAP_X;
        const startX = x;
        unit.members.forEach((m, i) => { posX.set(m, startX + i * COL_W); placed.add(m); });
        unit.centerX = startX + (w - NODE_W) / 2; // центр между членами
        x += unit.members.length * COL_W + GAP_X * 2; // дополнительный отступ между семьями
      });
    }

    // Идём от minGen+1 вверх до maxGen
    const ascGens = [...gens].sort((a, b) => a - b); // minGen ... maxGen
    for (let gi = 1; gi < ascGens.length; gi++) {
      const g = ascGens[gi];
      const units = unitsByGen.get(g)!;
      const order: string[] = [];

      // Для каждого unit вычисляем желаемый centerX на основе детей
      units.forEach(unit => {
        const children = unit.children.filter(c => placed.has(c));
        if (children.length > 0) {
          const xs = children.map(c => posX.get(c)! + NODE_W / 2);
          const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
          const halfW = (unit.members.length * COL_W - GAP_X) / 2;
          unit.centerX = avg - halfW;
        }
        unit.members.forEach(m => order.push(m));
      });

      orderByGen.set(g, order);

      // Размещаем units слева направо, не допуская перекрытий
      // Сортируем units по желаемому centerX (те у кого нет детей — в конец)
      const withCenter = units.filter(u => u.centerX !== undefined);
      const withoutCenter = units.filter(u => u.centerX === undefined);

      withCenter.sort((a, b) => a.centerX! - b.centerX!);

      const allUnitsOrdered = [...withCenter, ...withoutCenter];

      let curX = 0;
      allUnitsOrdered.forEach(unit => {
        const desired = unit.centerX ?? curX;
        const startX = Math.max(curX, desired);
        unit.members.forEach((m, i) => { posX.set(m, startX + i * COL_W); placed.add(m); });
        const w = unit.members.length * COL_W;
        unit.centerX = startX + (w - NODE_W) / 2;
        curX = startX + w + GAP_X * 2;
      });
    }

    // Любые узлы без позиции
    nodes.forEach((n, i) => { if (!posX.has(n.id)) { posX.set(n.id, i * COL_W); } });

    // Строим итоговый layout
    const layout = new Map<string, LayoutNode>();
    nodes.forEach(n => {
      const g = generation.get(n.id) ?? 0;
      const rowY = (maxGen - g) * ROW_H;
      layout.set(n.id, { id: n.id, x: posX.get(n.id)!, y: rowY });
    });

    return Array.from(layout.values());
  }, [nodes, edges]);
}
