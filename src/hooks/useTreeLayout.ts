import { useMemo } from 'react';
import { FamilyNode, Edge } from '@/components/TreeCanvas';

const NODE_W = 120;
const NODE_H = 190;
const GAP_X = 40;   // горизонтальный зазор между узлами
const GAP_Y = 80;   // вертикальный зазор между поколениями
const COL_W = NODE_W + GAP_X; // шаг колонки = 160
const ROW_H = NODE_H + GAP_Y; // шаг строки = 270

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
}

export function useTreeLayout(nodes: FamilyNode[], edges: Edge[]): LayoutNode[] {
  return useMemo(() => {
    if (!nodes.length) return [];

    // 1. Строим граф родства (без spouse)
    const parentOf = new Map<string, string[]>(); // child → [parents]
    const childOf = new Map<string, string[]>();   // parent → [children]

    edges.forEach(e => {
      if (e.type === 'spouse' || e.type === 'sibling') return;
      // source = родитель, target = ребёнок
      if (!childOf.has(e.source)) childOf.set(e.source, []);
      childOf.get(e.source)!.push(e.target);
      if (!parentOf.has(e.target)) parentOf.set(e.target, []);
      parentOf.get(e.target)!.push(e.source);
    });

    // 2. BFS от root для определения поколения каждого узла
    const generation = new Map<string, number>();
    const queue: Array<{ id: string; gen: number }> = [{ id: 'root', gen: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, gen } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      generation.set(id, gen);

      // родители (выше)
      (parentOf.get(id) || []).forEach(pid => {
        if (!visited.has(pid)) queue.push({ id: pid, gen: gen + 1 });
      });
      // дети (ниже)
      (childOf.get(id) || []).forEach(cid => {
        if (!visited.has(cid)) queue.push({ id: cid, gen: gen - 1 });
      });
    }

    // Узлы не найденные BFS — ставим в поколение 0
    nodes.forEach(n => {
      if (!generation.has(n.id)) generation.set(n.id, 0);
    });

    // 3. Для супругов — ставим в то же поколение что и партнёр
    edges.forEach(e => {
      if (e.type !== 'spouse') return;
      const gS = generation.get(e.source);
      const gT = generation.get(e.target);
      if (gS !== undefined && gT === undefined) generation.set(e.target, gS);
      if (gT !== undefined && gS === undefined) generation.set(e.source, gT);
    });

    // 4. Группируем узлы по поколениям
    const byGen = new Map<number, string[]>();
    nodes.forEach(n => {
      const g = generation.get(n.id) ?? 0;
      if (!byGen.has(g)) byGen.set(g, []);
      byGen.get(g)!.push(n.id);
    });

    // 5. Сортируем поколения (от самого старшего к самому младшему)
    const gens = Array.from(byGen.keys()).sort((a, b) => b - a);
    const maxGen = gens[0] ?? 0;

    // 6. Для каждого поколения сортируем узлы: супруги рядом, потом по связям с детьми
    const sortedByGen = new Map<number, string[]>();
    gens.forEach(g => {
      const ids = byGen.get(g)!;

      // Группируем супружеские пары
      const paired = new Set<string>();
      const order: string[] = [];

      ids.forEach(id => {
        if (paired.has(id)) return;
        order.push(id);
        paired.add(id);
        // Ищем супруга в том же поколении
        const spouseEdge = edges.find(e =>
          e.type === 'spouse' &&
          ((e.source === id && ids.includes(e.target)) ||
           (e.target === id && ids.includes(e.source)))
        );
        if (spouseEdge) {
          const spouseId = spouseEdge.source === id ? spouseEdge.target : spouseEdge.source;
          if (!paired.has(spouseId)) {
            order.push(spouseId);
            paired.add(spouseId);
          }
        }
      });

      sortedByGen.set(g, order);
    });

    // 7. Присваиваем X координаты
    // Находим максимальную ширину среди поколений
    const genWidths = new Map<number, number>();
    gens.forEach(g => {
      genWidths.set(g, (sortedByGen.get(g)!.length) * COL_W - GAP_X);
    });
    const maxWidth = Math.max(...Array.from(genWidths.values()), COL_W);
    const centerX = maxWidth / 2;

    const layout = new Map<string, LayoutNode>();

    gens.forEach(g => {
      const ids = sortedByGen.get(g)!;
      const rowY = (maxGen - g) * ROW_H;
      const rowW = ids.length * COL_W - GAP_X;
      const startX = centerX - rowW / 2;

      ids.forEach((id, i) => {
        layout.set(id, {
          id,
          x: startX + i * COL_W,
          y: rowY
        });
      });
    });

    return Array.from(layout.values());
  }, [nodes, edges]);
}
