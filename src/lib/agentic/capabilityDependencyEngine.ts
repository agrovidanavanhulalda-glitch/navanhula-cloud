/**
 * Sprint 5.0 · Capability Dependency Engine (pure).
 * Detects cycles deterministically.
 */
import type { Capability } from './businessCapabilityEngine';

export interface DependencyReport {
  nodes: string[];
  edges: Array<{ from: string; to: string }>;
  hasCycle: boolean;
  cycles: string[][];
  topoOrder: string[];
  bottlenecks: Array<{ id: string; dependents: number }>;
}

export function analyzeDependencies(list: Capability[]): DependencyReport {
  const nodes = list.map((c) => c.id);
  const nodeSet = new Set(nodes);
  const adj = new Map<string, string[]>();
  const reverseCount = new Map<string, number>();
  nodes.forEach((n) => {
    adj.set(n, []);
    reverseCount.set(n, 0);
  });
  const edges: Array<{ from: string; to: string }> = [];
  for (const c of list) {
    for (const dep of c.dependsOn) {
      if (!nodeSet.has(dep)) continue;
      edges.push({ from: dep, to: c.id });
      adj.get(dep)!.push(c.id);
      reverseCount.set(dep, (reverseCount.get(dep) ?? 0) + 1);
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
    for (const v of (adj.get(u) ?? []).slice().sort()) {
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
  for (const n of nodes.slice().sort()) if (color.get(n) === WHITE) dfs(n);

  const hasCycle = cycles.length > 0;
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

  const bottlenecks = Array.from(reverseCount.entries())
    .map(([id, dependents]) => ({ id, dependents }))
    .filter((b) => b.dependents >= 2)
    .sort((a, b) => b.dependents - a.dependents || a.id.localeCompare(b.id));

  return { nodes, edges, hasCycle, cycles, topoOrder, bottlenecks };
}
