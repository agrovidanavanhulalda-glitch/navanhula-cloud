/**
 * Sprint 4.7 · Strategy Score (pure).
 */
import type { PriorityItem } from './priorityMatrix';
import type { ResourcePlan } from './resourcePlanner';
import type { DependencyGraph } from './dependencyGraph';

export type StrategyRating = 'FAILED' | 'LIMITED' | 'GOOD' | 'STRONG' | 'ENTERPRISE';

export interface StrategyScoreResult {
  score: number;
  rating: StrategyRating;
  breakdown: {
    alignment: number;
    execution: number;
    governance: number;
    intelligence: number;
  };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

interface Signals {
  opsHealth: number;
  enterpriseScore: number;
  knowledgeScore: number;
  policyScore: number;
  simulationScore: number;
  executionReadiness: number;
}

export function classifyStrategy(score: number): StrategyRating {
  const s = clamp(score);
  if (s >= 90) return 'ENTERPRISE';
  if (s >= 75) return 'STRONG';
  if (s >= 60) return 'GOOD';
  if (s >= 40) return 'LIMITED';
  return 'FAILED';
}

export function computeStrategyScore(
  s: Signals,
  priorities: PriorityItem[],
  resources: ResourcePlan,
  graph: DependencyGraph,
): StrategyScoreResult {
  const alignment = clamp((s.enterpriseScore + s.opsHealth) / 2);
  const avgPrio = priorities.length === 0 ? 0
    : priorities.reduce((a, p) => a + p.score, 0) / priorities.length;
  const utilPenalty = resources.overloaded ? 15 : 0;
  const execution = clamp((s.executionReadiness * 0.5) + (avgPrio * 0.5) - utilPenalty);
  const cyclePenalty = graph.hasCycle ? 25 : 0;
  const governance = clamp(s.policyScore - cyclePenalty);
  const intelligence = clamp((s.knowledgeScore + s.simulationScore) / 2);
  const score = Math.round(
    alignment * 0.25 + execution * 0.3 + governance * 0.25 + intelligence * 0.2,
  );
  return {
    score,
    rating: classifyStrategy(score),
    breakdown: { alignment, execution, governance, intelligence },
  };
}
