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

    // Только parent-child рёбра (без spouse, без sibling)
    const parentEdges = edges.filter(e => !e.type && nodeIds.has(e.source) && nodeIds.has(e.target));
    const spouseEdges = edges.filter(e => e.type === 'spouse' && nodeIds.has(e.source) && nodeIds.has(e.target));

    // Строим: parent → children, child → parents
    const childrenOf = new Map<string, string[]>();
    const parentsOf  = new Map<string, string[]>();
    nodes.forEach(n => { childrenOf.set(n.id, []); parentsOf.set(n.id, []); });

    parentEdges.forEach(e => {
      childrenOf.get(e.source)!.push(e.target);
      parentsOf.get(e.target)!.push(e.source);
    });

    // BFS от root — определяем поколение каждого узла
    // gen > 0 = предки, gen < 0 = потомки
    const generation = new Map<string, number>();
    const queue: Array<{ id: string; gen: number }> = [{ id: 'root', gen: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, gen } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      generation.set(id, gen);

      // идём к родителям (gen+1)
      (parentsOf.get(id) || []).forEach(pid => {
        if (!visited.has(pid)) queue.push({ id: pid, gen: gen + 1 });
      });
      // идём к детям (gen-1)
      (childrenOf.get(id) || []).forEach(cid => {
        if (!visited.has(cid)) queue.push({ id: cid, gen: gen - 1 });
      });
    }

    // Sibling-edges без общих родителей — то же поколение что у source
    edges.filter(e => e.type === 'sibling' && nodeIds.has(e.source) && nodeIds.has(e.target)).forEach(e => {
      const gS = generation.get(e.source);
      const gT = generation.get(e.target);
      if (gS !== undefined && gT === undefined) generation.set(e.target, gS);
      if (gT !== undefined && gS === undefined) generation.set(e.source, gT);
    });

    // Оставшиеся без поколения — ставим 0
    nodes.forEach(n => {
      if (!generation.has(n.id)) generation.set(n.id, 0);
    });

    // Супруги — то же поколение что и партнёр (несколько проходов для цепочек)
    for (let pass = 0; pass < 3; pass++) {
      spouseEdges.forEach(e => {
        const gS = generation.get(e.source);
        const gT = generation.get(e.target);
        if (gS !== undefined && gT === undefined) generation.set(e.target, gS);
        if (gT !== undefined && gS === undefined) generation.set(e.source, gT);
        if (gS !== undefined && gT !== undefined && gS !== gT) {
          // Если расходятся — берём поколение того у кого есть parent-edges
          const sHasParents = (parentsOf.get(e.source) || []).length > 0 || (childrenOf.get(e.source) || []).length > 0;
          const tHasParents = (parentsOf.get(e.target) || []).length > 0 || (childrenOf.get(e.target) || []).length > 0;
          if (sHasParents && !tHasParents) generation.set(e.target, gS!);
          if (tHasParents && !sHasParents) generation.set(e.source, gT!);
        }
      });
    }

    // Группируем по поколениям
    const byGen = new Map<number, string[]>();
    nodes.forEach(n => {
      const g = generation.get(n.id) ?? 0;
      if (!byGen.has(g)) byGen.set(g, []);
      byGen.get(g)!.push(n.id);
    });

    const gens = Array.from(byGen.keys()).sort((a, b) => b - a); // от старших к младшим
    const maxGen = gens.length ? gens[0] : 0;

    // Сортируем узлы внутри поколения: пары рядом
    const sortedByGen = new Map<number, string[]>();
    gens.forEach(g => {
      const ids = byGen.get(g)!;
      const paired = new Set<string>();
      const order: string[] = [];

      ids.forEach(id => {
        if (paired.has(id)) return;
        order.push(id);
        paired.add(id);
        const spouseEdge = spouseEdges.find(e =>
          (e.source === id && ids.includes(e.target) && !paired.has(e.target)) ||
          (e.target === id && ids.includes(e.source) && !paired.has(e.source))
        );
        if (spouseEdge) {
          const spouseId = spouseEdge.source === id ? spouseEdge.target : spouseEdge.source;
          order.push(spouseId);
          paired.add(spouseId);
        }
      });

      sortedByGen.set(g, order);
    });

    // Вычисляем ширину каждого поколения и общую ширину
    const genWidths = new Map<number, number>();
    gens.forEach(g => {
      genWidths.set(g, sortedByGen.get(g)!.length * COL_W - GAP_X);
    });
    const maxWidth = Math.max(...Array.from(genWidths.values()), COL_W);
    const centerX = maxWidth / 2;

    // Назначаем координаты
    const layout = new Map<string, LayoutNode>();
    gens.forEach(g => {
      const ids = sortedByGen.get(g)!;
      const rowY = (maxGen - g) * ROW_H; // самое старшее поколение сверху (y=0)
      const rowW = ids.length * COL_W - GAP_X;
      const startX = centerX - rowW / 2;

      ids.forEach((id, i) => {
        layout.set(id, { id, x: startX + i * COL_W, y: rowY });
      });
    });

    // Узлы не попавшие в layout (не должно быть, но на всякий)
    nodes.forEach((n, i) => {
      if (!layout.has(n.id)) {
        layout.set(n.id, { id: n.id, x: i * COL_W, y: 0 });
      }
    });

    return Array.from(layout.values());
  }, [nodes, edges]);
}