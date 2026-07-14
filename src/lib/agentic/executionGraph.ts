/**
 * Sprint 4.2 · Execution Graph (pure).
 * Builds START → tasks → END graph with critical path and parallel groups.
 */
import type { AgenticTask, TaskBundle } from './taskEngine';
import { analyzeDependencies, type DependencyReport } from './dependencyEngine';

export interface GraphNode {
  id: string;
  label: string;
  kind: 'START' | 'END' | 'CHECK' | 'ACTION' | 'VALIDATE' | 'ROLLBACK' | 'GATE';
  estimatedMinutes: number;
}
export interface GraphEdge { from: string; to: string; }

export interface ExecutionGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  criticalPath: string[];
  parallelGroups: string[][];
  totalMinutes: number;
  rollbackPoints: string[];
  validationGates: string[];
  dependency: DependencyReport;
}

export function buildExecutionGraph(bundle: TaskBundle): ExecutionGraph {
  const dep = analyzeDependencies(bundle);
  const nodes: GraphNode[] = [
    { id: 'START', label: 'Início', kind: 'START', estimatedMinutes: 0 },
    ...dep.nodes.map<GraphNode>((t: AgenticTask) => ({
      id: t.id,
      label: t.title,
      kind: t.category,
      estimatedMinutes: Number.isFinite(t.estimatedMinutes) ? t.estimatedMinutes : 0,
    })),
    { id: 'END', label: 'Fim', kind: 'END', estimatedMinutes: 0 },
  ];
  const edges: GraphEdge[] = [...dep.edges];
  const firstId = dep.order[0];
  const lastId = dep.order.at(-1);
  if (firstId) edges.unshift({ from: 'START', to: firstId });
  if (lastId) edges.push({ from: lastId, to: 'END' });

  const criticalPath = ['START', ...dep.order, 'END'];
  const parallelGroups: string[][] = [
    bundle.checklist.map((t) => t.id),
    bundle.validation.map((t) => t.id),
  ].filter((g) => g.length > 1);

  const totalMinutes = dep.nodes.reduce(
    (s, t) => s + (Number.isFinite(t.estimatedMinutes) ? t.estimatedMinutes : 0),
    0,
  );
  const rollbackPoints = bundle.rollback.map((t) => t.id);
  const validationGates = bundle.validation.map((t) => t.id);

  return { nodes, edges, criticalPath, parallelGroups, totalMinutes, rollbackPoints, validationGates, dependency: dep };
}
