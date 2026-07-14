/**
 * Sprint 4.2 · Dependency Engine (pure).
 * Detects order, cycles, orphans, blockers between agentic tasks.
 */
import type { AgenticTask, TaskBundle } from './taskEngine';

export interface DependencyEdge { from: string; to: string; }
export interface DependencyReport {
  nodes: AgenticTask[];
  edges: DependencyEdge[];
  order: string[];
  cycles: string[][];
  orphans: string[];
  duplicates: string[];
  blockers: string[];
}

function flatten(b: TaskBundle): AgenticTask[] {
  // Enforce lifecycle: CHECK → ACTION → VALIDATE → ROLLBACK (rollback reserved).
  return [...b.checklist, ...b.runbook, ...b.validation, ...b.rollback];
}

export function analyzeDependencies(bundle: TaskBundle): DependencyReport {
  const nodes = flatten(bundle);
  const edges: DependencyEdge[] = [];
  const byCat: Record<string, AgenticTask[]> = { CHECK: [], ACTION: [], VALIDATE: [], ROLLBACK: [] };
  for (const t of nodes) byCat[t.category]?.push(t);
  // Chain within each category by `order`
  (['CHECK', 'ACTION', 'VALIDATE', 'ROLLBACK'] as const).forEach((cat) => {
    const list = [...byCat[cat]].sort((a, b) => a.order - b.order);
    for (let i = 1; i < list.length; i++) edges.push({ from: list[i - 1].id, to: list[i].id });
  });
  // Cross-category: last CHECK → first ACTION → first VALIDATE
  const lastCheck = [...byCat.CHECK].sort((a, b) => a.order - b.order).at(-1);
  const firstAction = [...byCat.ACTION].sort((a, b) => a.order - b.order)[0];
  const lastAction = [...byCat.ACTION].sort((a, b) => a.order - b.order).at(-1);
  const firstValid = [...byCat.VALIDATE].sort((a, b) => a.order - b.order)[0];
  if (lastCheck && firstAction) edges.push({ from: lastCheck.id, to: firstAction.id });
  if (lastAction && firstValid) edges.push({ from: lastAction.id, to: firstValid.id });

  // Topological order (Kahn)
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => { indeg.set(n.id, 0); adj.set(n.id, []); });
  edges.forEach((e) => {
    adj.get(e.from)?.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  });
  const queue = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      indeg.set(next, (indeg.get(next) ?? 0) - 1);
      if (indeg.get(next) === 0) queue.push(next);
    }
  }
  const cycles: string[][] = order.length !== nodes.length
    ? [nodes.filter((n) => !order.includes(n.id)).map((n) => n.id)]
    : [];

  const referenced = new Set<string>();
  edges.forEach((e) => { referenced.add(e.from); referenced.add(e.to); });
  const orphans = nodes.length > 1 ? nodes.filter((n) => !referenced.has(n.id)).map((n) => n.id) : [];

  const seen = new Set<string>();
  const duplicates: string[] = [];
  nodes.forEach((n) => {
    const key = `${n.category}|${n.title}`;
    if (seen.has(key)) duplicates.push(n.id);
    else seen.add(key);
  });

  const blockers: string[] = [];
  if (byCat.ACTION.length === 0) blockers.push('nenhum passo de ação definido');
  if (byCat.ROLLBACK.length === 0) blockers.push('nenhum passo de rollback definido');

  return { nodes, edges, order, cycles, orphans, duplicates, blockers };
}
