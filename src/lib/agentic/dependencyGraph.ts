/**
 * Sprint 4.7 · Dependency Graph (pure).
 * Detects cycles deterministically. Topological order when acyclic.
 */
import type { Initiative } from './initiativeEngine';

export interface DependencyGraph {
  nodes: string[];
  edges: Array<{ from: string; to: string }>;
  hasCycle: boolean;
  cycles: string[][];
  topoOrder: string[]; // empty when cyclic
}

export function buildDependencyGraph(initiatives: Initiative[]): DependencyGraph {
  const nodes = initiatives.map((i) => i.id);
  const nodeSet = new Set(nodes);
  const edges: Array<{ from: string; to: string }> = [];
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => adj.set(n, []));
  for (const i of initiatives) {
    for (const dep of i.dependsOn ?? []) {
      if (!nodeSet.has(dep)) continue;
      edges.push({ from: dep, to: i.id });
      adj.get(dep)!.push(i.id);
    }
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  nodes.forEach((n) => color.set(n, WHITE));
  const cycles: string[][] = [];
  const stack: string[] = [];

  const dfs = (u: string): void => {
    color.set(u, GRAY);
    stack.push(u);
    for (const v of adj.get(u) ?? []) {
      if (color.get(v) === GRAY) {
        const idx = stack.indexOf(v);
        cycles.push(stack.slice(idx).concat(v));
      } else if (color.get(v) === WHITE) {
        dfs(v);
      }
    }
    stack.pop();
    color.set(u, BLACK);
  };
  for (const n of nodes) if (color.get(n) === WHITE) dfs(n);

  const hasCycle = cycles.length > 0;

  // Kahn topological sort
  const topoOrder: string[] = [];
  if (!hasCycle) {
    const indeg = new Map<string, number>();
    nodes.forEach((n) => indeg.set(n, 0));
    edges.forEach((e) => indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1));
    const queue = nodes.filter((n) => (indeg.get(n) ?? 0) === 0).sort();
    while (queue.length) {
      const u = queue.shift()!;
      topoOrder.push(u);
      for (const v of (adj.get(u) ?? []).slice().sort()) {
        indeg.set(v, (indeg.get(v) ?? 0) - 1);
        if (indeg.get(v) === 0) queue.push(v);
      }
      queue.sort();
    }
  }
  return { nodes, edges, hasCycle, cycles, topoOrder };
}
