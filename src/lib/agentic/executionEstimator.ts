/**
 * Sprint 4.2 · Execution Estimator (pure).
 * Calculates min/max/avg time, complexity, success probability, confidence.
 */
import type { AgenticPlan } from './plannerEngine';

export interface ExecutionEstimate {
  minMinutes: number;
  maxMinutes: number;
  avgMinutes: number;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  successProbability: number; // 0..100
  confidence: number; // 0..100
}

const clamp = (n: number, lo: number, hi: number) =>
  Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;

export function estimateExecution(plan: AgenticPlan | null | undefined): ExecutionEstimate {
  if (!plan) {
    return { minMinutes: 0, maxMinutes: 0, avgMinutes: 0, complexity: 'LOW', successProbability: 0, confidence: 0 };
  }
  const all = [
    ...plan.tasks.checklist,
    ...plan.tasks.runbook,
    ...plan.tasks.rollback,
    ...plan.tasks.validation,
  ];
  const avg = all.reduce((s, t) => s + (Number.isFinite(t.estimatedMinutes) ? t.estimatedMinutes : 0), 0);
  const min = Math.round(avg * 0.7);
  const max = Math.round(avg * 1.5);
  const count = all.length;
  const complexity: ExecutionEstimate['complexity'] =
    count > 20 ? 'EXTREME' : count > 12 ? 'HIGH' : count > 6 ? 'MEDIUM' : 'LOW';
  const risk = clamp(plan.score.risk, 0, 100);
  const successProbability = clamp(100 - risk * 0.6, 5, 99);
  const confidence = clamp(plan.score.confidence, 0, 100);
  return { minMinutes: min, maxMinutes: max, avgMinutes: avg, complexity, successProbability, confidence };
}
