import { useMemo } from 'react';
import { FamilyNode, Edge } from '@/components/TreeCanvas';

const NODE_W = 120;
const NODE_H = 190;
const GAP_X = 40;   // между узлами одного поколения
const GAP_Y = 80;   // между поколениями
const COL_W = NODE_W + GAP_X;   // 160
export const ROW_H = NODE_H + GAP_Y;  // 270
const FAMILY_GAP = GAP_X * 2;   // доп. зазор между разными семейными блоками

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
}

interface FamilyUnit {
  members: string[];   // [person] или [person, spouse]
  children: string[];  // id детей этой пары
  desiredCenterX: number | null;
  assignedLeft: number; // левый край после размещения
}

export function useTreeLayout(nodes: FamilyNode[], edges: Edge[]): LayoutNode[] {
  return useMemo(() => {
    if (!nodes.length) return [];

    const nodeIds = new Set(nodes.map(n => n.id));

    const parentEdges = edges.filter(e => !e.type && nodeIds.has(e.source) && nodeIds.has(e.target));
    const spouseEdges = edges.filter(e => e.type === 'spouse' && nodeIds.has(e.source) && nodeIds.has(e.target));

    // Граф
    const childrenOf = new Map<string, string[]>();
    const parentsOf = new Map<string, string[]>();
    const spouseOf = new Map<string, string[]>();
    nodes.forEach(n => { childrenOf.set(n.id, []); parentsOf.set(n.id, []); spouseOf.set(n.id, []); });

    parentEdges.forEach(e => {
      if (!childrenOf.get(e.source)!.includes(e.target)) childrenOf.get(e.source)!.push(e.target);
      if (!parentsOf.get(e.target)!.includes(e.source)) parentsOf.get(e.target)!.push(e.source);
    });
    spouseEdges.forEach(e => {
      if (!spouseOf.get(e.source)!.includes(e.target)) spouseOf.get(e.source)!.push(e.target);
      if (!spouseOf.get(e.target)!.includes(e.source)) spouseOf.get(e.target)!.push(e.source);
    });

    // BFS — определяем поколение (gen=0 root, gen>0 предки, gen<0 потомки)
    const generation = new Map<string, number>();
    {
      const q: Array<{ id: string; gen: number }> = [{ id: 'root', gen: 0 }];
      const vis = new Set<string>();
      while (q.length) {
        const { id, gen } = q.shift()!;
        if (vis.has(id)) continue;
        vis.add(id); generation.set(id, gen);
        (parentsOf.get(id) || []).forEach(p => { if (!vis.has(p)) q.push({ id: p, gen: gen + 1 }); });
        (childrenOf.get(id) || []).forEach(c => { if (!vis.has(c)) q.push({ id: c, gen: gen - 1 }); });
        (spouseOf.get(id) || []).forEach(s => { if (!vis.has(s)) q.push({ id: s, gen }); });
      }
    }
    // sibling-edges
    edges.filter(e => e.type === 'sibling' && nodeIds.has(e.source) && nodeIds.has(e.target)).forEach(e => {
      const gS = generation.get(e.source), gT = generation.get(e.target);
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

    const gens = Array.from(byGen.keys()).sort((a, b) => b - a); // от старшего к младшему
    const maxGen = gens[0] ?? 0;
    const minGen = gens[gens.length - 1] ?? 0;

    // Строим FamilyUnit для каждого поколения
    const unitsByGen = new Map<number, FamilyUnit[]>();
    gens.forEach(g => {
      const ids = byGen.get(g)!;
      const paired = new Set<string>();
      const units: FamilyUnit[] = [];
      ids.forEach(id => {
        if (paired.has(id)) return;
        paired.add(id);
        const members = [id];
        const sp = (spouseOf.get(id) || []).find(sid => ids.includes(sid) && !paired.has(sid));
        if (sp) { members.push(sp); paired.add(sp); }
        const childSet = new Set<string>();
        members.forEach(m => (childrenOf.get(m) || []).forEach(c => { if (nodeIds.has(c)) childSet.add(c); }));
        units.push({ members, children: Array.from(childSet), desiredCenterX: null, assignedLeft: 0 });
      });
      unitsByGen.set(g, units);
    });

    // Позиция левого края узла
    const posX = new Map<string, number>();

    // Центр пары (или одиночки) по заданному leftX
    function unitCenterX(unit: FamilyUnit, leftX: number): number {
      // для пары: центр между двумя узлами = leftX + NODE_W/2 + COL_W/2
      // для одного: leftX + NODE_W/2
      if (unit.members.length === 1) return leftX + NODE_W / 2;
      return leftX + NODE_W + GAP_X / 2; // середина зазора между двумя
    }

    // Ширина unit в пикселях
    function unitWidth(unit: FamilyUnit): number {
      return unit.members.length === 1 ? NODE_W : NODE_W * 2 + GAP_X;
    }

    // --- Алгоритм: расставляем поколения снизу вверх ---
    // 1) Нижнее поколение — левее направо без смещения
    // 2) Каждое следующее (выше) поколение — желаемый X вычисляется как средний X детей,
    //    затем пачки сдвигаются вправо если перекрываются

    const ascGens = [...gens].sort((a, b) => a - b); // от младшего к старшему

    // Нижнее поколение (minGen)
    {
      const units = unitsByGen.get(minGen)!;
      let cursor = 0;
      units.forEach(unit => {
        unit.assignedLeft = cursor;
        unit.members.forEach((m, i) => posX.set(m, cursor + i * COL_W));
        cursor += unitWidth(unit) + FAMILY_GAP;
      });
    }

    // Идём снизу вверх
    for (let gi = 1; gi < ascGens.length; gi++) {
      const g = ascGens[gi];
      const units = unitsByGen.get(g)!;

      // Вычисляем желаемый centerX для каждого unit по уже размещённым детям
      units.forEach(unit => {
        const placedChildren = unit.children.filter(c => posX.has(c));
        if (placedChildren.length > 0) {
          const xs = placedChildren.map(c => posX.get(c)! + NODE_W / 2);
          const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
          unit.desiredCenterX = avg;
        } else {
          unit.desiredCenterX = null;
        }
      });

      // Сортируем по желаемому X (без желания — в конец)
      const withDesire = units.filter(u => u.desiredCenterX !== null).sort((a, b) => a.desiredCenterX! - b.desiredCenterX!);
      const withoutDesire = units.filter(u => u.desiredCenterX === null);
      const ordered = [...withDesire, ...withoutDesire];

      // Размещаем слева направо, не допуская перекрытий
      let cursor = 0;
      ordered.forEach(unit => {
        const hw = unitWidth(unit) / 2;
        let leftX = unit.desiredCenterX !== null
          ? unit.desiredCenterX - hw
          : cursor;
        leftX = Math.max(cursor, leftX);

        unit.assignedLeft = leftX;
        unit.members.forEach((m, i) => posX.set(m, leftX + i * COL_W));
        cursor = leftX + unitWidth(unit) + FAMILY_GAP;
      });
    }

    // Узлы без позиции — запасной вариант
    nodes.forEach((n, i) => { if (!posX.has(n.id)) posX.set(n.id, i * COL_W); });

    // Сдвигаем всё так чтобы минимальный X был 0
    const minX = Math.min(...nodes.map(n => posX.get(n.id)!));
    if (minX < 0) nodes.forEach(n => posX.set(n.id, posX.get(n.id)! - minX));

    return nodes.map(n => ({
      id: n.id,
      x: posX.get(n.id)!,
      y: (maxGen - (generation.get(n.id) ?? 0)) * ROW_H,
    }));
  }, [nodes, edges]);
}
