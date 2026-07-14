/**
 * Sprint 4.0 · Planner Engine (pure).
 * Turns detected problems into structured, non-executable action plans.
 */
import { buildTaskBundle, type TaskBundle } from './taskEngine';
import { scoreDecision, type DecisionScore } from './decisionEngine';

export type PlanKind = 'STORAGE' | 'WORKER' | 'DLQ' | 'RPC' | 'GENERIC';

export interface DetectedProblem {
  id: string;
  kind: PlanKind;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidence: string[];
  timeSensitivityHours?: number;
}

export interface AgenticPlan {
  id: string;
  problem: DetectedProblem;
  goal: string;
  strategy: string;
  score: DecisionScore;
  tasks: TaskBundle;
  createdAt: string;
  estimatedMinutes: number;
  requiresFounder: boolean;
}

export function buildPlan(problem: DetectedProblem, dataQuality: number): AgenticPlan {
  const score = scoreDecision({
    severity: problem.severity,
    evidenceCount: problem.evidence.length,
    dataQuality,
    timeSensitivityHours: problem.timeSensitivityHours,
  });
  const tasks = buildTaskBundle(problem.kind);
  const estimatedMinutes = [...tasks.checklist, ...tasks.runbook, ...tasks.rollback, ...tasks.validation]
    .reduce((s, t) => s + t.estimatedMinutes, 0);
  return {
    id: `plan-${problem.id}-${Date.now().toString(36)}`,
    problem,
    goal: `Mitigar ${problem.title.toLowerCase()} preservando disponibilidade.`,
    strategy: `Executar runbook em ${tasks.runbook.length} passos com validação e rollback preparados.`,
    score,
    tasks,
    createdAt: new Date().toISOString(),
    estimatedMinutes,
    requiresFounder: problem.severity === 'CRITICAL' || score.risk >= 70,
  };
}
