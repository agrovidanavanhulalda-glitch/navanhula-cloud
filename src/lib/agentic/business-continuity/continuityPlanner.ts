/**
 * Sprint 5.4 · Continuity Planner — pure.
 * Prioritized action list; no execution.
 */
import type { BIARow } from './businessImpactAnalysis';
import type { DependencyImpactReport } from './dependencyImpactEngine';

export interface ContinuityAction {
  id: string;
  priority: 'P1' | 'P2' | 'P3';
  title: string;
  rationale: string;
}

export interface ContinuityPlan {
  actions: ContinuityAction[];
}

function priorityFromScore(score: number): ContinuityAction['priority'] {
  if (score >= 80) return 'P1';
  if (score >= 50) return 'P2';
  return 'P3';
}

export function buildContinuityPlan(
  bia: BIARow[],
  deps: DependencyImpactReport,
): ContinuityPlan {
  const actions: ContinuityAction[] = [];
  for (const row of bia) {
    actions.push({
      id: `bcm-proc-${row.id}`,
      priority: priorityFromScore(row.impactScore),
      title: `Reforçar continuidade de ${row.name}`,
      rationale: `Impacto ${row.impactScore}/100 · tier ${row.tier}`,
    });
  }
  for (const dep of deps.rows) {
    if (dep.risk >= 40) {
      actions.push({
        id: `bcm-dep-${dep.id}`,
        priority: priorityFromScore(dep.risk),
        title: `Mitigar risco de dependência ${dep.name}`,
        rationale: `Risco ${dep.risk}/100 · ${dep.type}`,
      });
    }
  }
  const rank: Record<ContinuityAction['priority'], number> = { P1: 0, P2: 1, P3: 2 };
  actions.sort((a, b) => (rank[a.priority] - rank[b.priority]) || a.id.localeCompare(b.id));
  return { actions };
}
