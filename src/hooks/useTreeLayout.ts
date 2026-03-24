/**
 * useTreeLayout — алгоритм расположения семейного дерева.
 *
 * Правила:
 * 1. Каждое поколение — отдельная горизонтальная строка.
 * 2. Супруги всегда стоят рядом (пара = единый блок).
 * 3. Дети центрируются под своими родителями.
 * 4. Узлы НИКОГДА не перекрываются — при конфликте правый блок сдвигается вправо.
 * 5. После расстановки всех поколений делаем центрирующий проход снизу вверх.
 *
 * Алгоритм (упрощённый Reingold–Tilford):
 *   Шаг 1: Расставляем листья (поколение без детей) равномерно слева направо.
 *   Шаг 2: Для каждого поколения выше — вычисляем X = center(children) - halfWidth.
 *   Шаг 3: Разрешаем конфликты (перекрытия) сдвигом вправо.
 *   Шаг 4: Центрируем родителей над детьми (снизу вверх, без нарушения порядка).
 */

import { useMemo } from 'react';
import { FamilyNode, Edge } from '@/components/TreeCanvas';

// ── Константы ────────────────────────────────────────────────────────────────
const NODE_W     = 120;   // ширина карточки
const NODE_H     = 190;   // высота карточки
const H_GAP      = 40;    // минимальный зазор между узлами по горизонтали
const COUPLE_GAP = 32;    // зазор между супругами (меньше, они пара)
const V_GAP      = 80;    // вертикальный зазор между строками
const SLOT       = NODE_W + H_GAP;  // размер «слота» одной персоны

export const ROW_H = NODE_H + V_GAP;

export interface LayoutNode {
  id: string;
  x: number; // левый край карточки
  y: number; // верхний край карточки
}

// ── Вспомогательные структуры ────────────────────────────────────────────────
interface Unit {
  id: string;          // уникальный ключ юнита (joined member ids)
  members: string[];   // [id] или [male_id, female_id]
  children: string[];  // ids детей
  x: number;          // левый край блока (вычисляется)
  width: number;       // ширина блока
}

export function useTreeLayout(nodes: FamilyNode[], edges: Edge[]): LayoutNode[] {
  return useMemo(() => {
    if (!nodes.length) return [];

    const nodeIds = new Set(nodes.map(n => n.id));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // ── Граф ─────────────────────────────────────────────────────────────────
    const parentEdges = edges.filter(e => !e.type && nodeIds.has(e.source) && nodeIds.has(e.target));
    const spouseEdges = edges.filter(e => e.type === 'spouse' && nodeIds.has(e.source) && nodeIds.has(e.target));

    // childrenOf[p] = дети p
    // parentsOf[c]  = родители c
    // spouseOf[a]   = супруги a
    const childrenOf = new Map<string, string[]>();
    const parentsOf  = new Map<string, string[]>();
    const spouseOf   = new Map<string, string[]>();
    nodes.forEach(n => { childrenOf.set(n.id, []); parentsOf.set(n.id, []); spouseOf.set(n.id, []); });

    parentEdges.forEach(e => {
      childrenOf.get(e.source)!.push(e.target);
      parentsOf.get(e.target)!.push(e.source);
    });
    spouseEdges.forEach(e => {
      if (!spouseOf.get(e.source)!.includes(e.target)) spouseOf.get(e.source)!.push(e.target);
      if (!spouseOf.get(e.target)!.includes(e.source)) spouseOf.get(e.target)!.push(e.source);
    });

    // ── Поколение каждого узла (BFS от root) ─────────────────────────────────
    // gen > 0 = предок, gen = 0 = root, gen < 0 = потомок
    const gen = new Map<string, number>();
    {
      const q: Array<{ id: string; g: number }> = [{ id: 'root', g: 0 }];
      const vis = new Set<string>();
      while (q.length) {
        const { id, g } = q.shift()!;
        if (vis.has(id)) continue;
        vis.add(id); gen.set(id, g);
        parentsOf.get(id)!.forEach(p => { if (!vis.has(p)) q.push({ id: p, g: g + 1 }); });
        childrenOf.get(id)!.forEach(c => { if (!vis.has(c)) q.push({ id: c, g: g - 1 }); });
        spouseOf.get(id)!.forEach(s => { if (!vis.has(s)) q.push({ id: s, g }); });
      }
    }
    // Sibling-edges (редко): то же поколение что и source
    edges.filter(e => e.type === 'sibling' && nodeIds.has(e.source) && nodeIds.has(e.target)).forEach(e => {
      if (gen.has(e.source) && !gen.has(e.target)) gen.set(e.target, gen.get(e.source)!);
      if (gen.has(e.target) && !gen.has(e.source)) gen.set(e.source, gen.get(e.target)!);
    });
    nodes.forEach(n => { if (!gen.has(n.id)) gen.set(n.id, 0); });

    // ── Группируем узлы по поколениям ────────────────────────────────────────
    const byGen = new Map<number, string[]>();
    nodes.forEach(n => {
      const g = gen.get(n.id)!;
      if (!byGen.has(g)) byGen.set(g, []);
      byGen.get(g)!.push(n.id);
    });

    // Поколения от старшего (большой номер) к младшему
    const sortedGens = [...byGen.keys()].sort((a, b) => b - a);
    const maxGen = sortedGens[0] ?? 0;

    // ── Строим юниты для каждого поколения ───────────────────────────────────
    // Юнит = одиночка или пара супругов
    function buildUnits(genIds: string[]): Unit[] {
      const used = new Set<string>();
      const result: Unit[] = [];

      // Сначала обрабатываем тех, у кого есть дети (они задают порядок)
      // Порядок: сортируем по количеству детей desc, затем по id для стабильности
      const sorted = [...genIds].sort((a, b) => {
        const ac = childrenOf.get(a)!.filter(c => nodeIds.has(c)).length;
        const bc = childrenOf.get(b)!.filter(c => nodeIds.has(c)).length;
        return bc - ac || a.localeCompare(b);
      });

      sorted.forEach(id => {
        if (used.has(id)) return;
        used.add(id);

        // Находим супруга в том же поколении
        const spouseInGen = spouseOf.get(id)!.find(s => genIds.includes(s) && !used.has(s));

        let members: string[];
        if (spouseInGen) {
          used.add(spouseInGen);
          const nodeA = nodeMap.get(id)!;
          const nodeB = nodeMap.get(spouseInGen)!;
          // Мужчина — левее
          members = nodeA.gender === 'male' ? [id, spouseInGen] : [spouseInGen, id];
        } else {
          members = [id];
        }

        // Дети юнита = объединение детей всех участников
        const childSet = new Set<string>();
        members.forEach(m => childrenOf.get(m)!.forEach(c => { if (nodeIds.has(c)) childSet.add(c); }));

        const width = members.length === 1
          ? NODE_W
          : NODE_W * 2 + COUPLE_GAP;

        result.push({
          id: members.join('+'),
          members,
          children: [...childSet],
          x: 0,
          width,
        });
      });

      return result;
    }

    const unitsByGen = new Map<number, Unit[]>();
    sortedGens.forEach(g => unitsByGen.set(g, buildUnits(byGen.get(g)!)));

    // ── Позиции узлов ─────────────────────────────────────────────────────────
    const posX = new Map<string, number>();

    function setUnitX(unit: Unit, left: number) {
      unit.x = left;
      // Члены пары: мужчина левее, потом COUPLE_GAP, потом женщина
      unit.members.forEach((m, i) => {
        posX.set(m, left + i * (NODE_W + COUPLE_GAP));
      });
    }

    // Центр блока
    function blockCenter(unit: Unit) { return unit.x + unit.width / 2; }

    // Центр Х детей (уже размещённых)
    function childrenCenter(unit: Unit): number | null {
      const placed = unit.children.filter(c => posX.has(c));
      if (!placed.length) return null;
      const lefts = placed.map(c => posX.get(c)!);
      const minL = Math.min(...lefts);
      const maxL = Math.max(...lefts);
      return (minL + maxL + NODE_W) / 2;
    }

    // Разрешаем конфликты (перекрытия) в массиве юнитов — сдвиг вправо
    function resolveOverlaps(units: Unit[]) {
      for (let i = 1; i < units.length; i++) {
        const prev = units[i - 1];
        const curr = units[i];
        const minLeft = prev.x + prev.width + H_GAP;
        if (curr.x < minLeft) {
          const delta = minLeft - curr.x;
          // Сдвигаем curr и всех правее
          for (let j = i; j < units.length; j++) {
            units[j].x += delta;
            units[j].members.forEach(m => posX.set(m, (posX.get(m) ?? 0) + delta));
          }
        }
      }
    }

    // ── Шаг 1: Расставляем самое нижнее поколение (листья) ───────────────────
    // Все юниты равномерно слева направо начиная с 0
    const leafGen = sortedGens[sortedGens.length - 1];
    {
      let cursor = 0;
      unitsByGen.get(leafGen)!.forEach(unit => {
        setUnitX(unit, cursor);
        cursor += unit.width + H_GAP;
      });
    }

    // ── Шаг 2: Для каждого поколения выше листьев — ставим над детьми ────────
    // Идём от листьев вверх (ascending gen number = восходящий к предкам)
    const ascendingGens = [...sortedGens].reverse(); // от младшего к старшему

    for (let gi = 1; gi < ascendingGens.length; gi++) {
      const g = ascendingGens[gi];
      const units = unitsByGen.get(g)!;

      // Вычисляем желаемый X для каждого юнита
      units.forEach(unit => {
        const cc = childrenCenter(unit);
        if (cc !== null) {
          unit.x = cc - unit.width / 2;
          unit.members.forEach((m, i) => posX.set(m, unit.x + i * (NODE_W + COUPLE_GAP)));
        } else {
          // Нет детей — ставим правее последнего
          const prevUnit = units[units.indexOf(unit) - 1];
          unit.x = prevUnit ? prevUnit.x + prevUnit.width + H_GAP : 0;
          unit.members.forEach((m, i) => posX.set(m, unit.x + i * (NODE_W + COUPLE_GAP)));
        }
      });

      // Сортируем юниты по x (некоторые без детей могут быть не в порядке)
      units.sort((a, b) => a.x - b.x);

      // Разрешаем перекрытия
      resolveOverlaps(units);
    }

    // ── Шаг 3: Центрируем родителей над детьми (снизу вверх) ─────────────────
    // Делаем несколько проходов для стабилизации
    for (let pass = 0; pass < 3; pass++) {
      for (let gi = 1; gi < ascendingGens.length; gi++) {
        const g = ascendingGens[gi];
        const units = unitsByGen.get(g)!;

        units.forEach((unit, ui) => {
          const cc = childrenCenter(unit);
          if (cc === null) return;

          const desired = cc - unit.width / 2;
          const prevUnit = units[ui - 1];
          const nextUnit = units[ui + 1];
          const minX = prevUnit ? prevUnit.x + prevUnit.width + H_GAP : -Infinity;
          const maxX = nextUnit ? nextUnit.x - unit.width - H_GAP : Infinity;

          const clamped = Math.max(minX, Math.min(maxX, desired));
          if (Math.abs(clamped - unit.x) > 0.5) {
            setUnitX(unit, clamped);
          }
        });
      }
    }

    // ── Шаг 4: Нормализация — сдвигаем всё так чтобы минимальный X = 40 ──────
    const allX = [...posX.values()];
    if (!allX.length) return [];
    const minX = Math.min(...allX);
    const shift = 40 - minX;
    nodes.forEach(n => {
      if (posX.has(n.id)) posX.set(n.id, posX.get(n.id)! + shift);
    });
    // Обновляем unit.x тоже (для корректности childrenCenter в будущих вызовах)
    unitsByGen.forEach(units => units.forEach(u => { u.x += shift; }));

    // ── Итоговый layout ───────────────────────────────────────────────────────
    return nodes.map(n => ({
      id: n.id,
      x: posX.get(n.id) ?? 40,
      y: (maxGen - (gen.get(n.id) ?? 0)) * ROW_H + 40,
    }));
  }, [nodes, edges]);
}
