/**
 * Sprint 4.3 · Review Engine (pure).
 * Produces a review verdict for an ExecutionPlan (advisory).
 */
import type { ExecutionPlan } from './executionPlanner';

export type ReviewVerdict = 'APPROVE' | 'REVIEW' | 'REJECT';

export interface ReviewReport {
  verdict: ReviewVerdict;
  score: number;
  reasons: string[];
  blockers: string[];
}

export function reviewPlan(plan: ExecutionPlan | null): ReviewReport {
  if (!plan) {
    return { verdict: 'REJECT', score: 0, reasons: [], blockers: ['Plano ausente'] };
  }
  const reasons: string[] = [];
  const blockers: string[] = [];

  if (plan.readiness === 'BLOCKED') blockers.push('Execution readiness BLOCKED');
  if (plan.rollback.readiness === 'MISSING') blockers.push('Rollback ausente');
  if (plan.risk.level === 'CRITICAL') blockers.push('Risco CRITICAL');
  if (!plan.validation.ok) blockers.push('Validação falhou');

  if (plan.risk.level === 'HIGH') reasons.push('Risco alto — revisar impacto');
  if (plan.readiness === 'REVIEW') reasons.push('Readiness em REVIEW');
  if (plan.estimate.confidence < 60) reasons.push('Confiança baixa (<60%)');

  const readinessWeight = plan.readiness === 'READY' ? 40 : plan.readiness === 'REVIEW' ? 22 : 0;
  const riskWeight = plan.risk.level === 'LOW' ? 25 : plan.risk.level === 'MEDIUM' ? 18 : plan.risk.level === 'HIGH' ? 8 : 0;
  const rollbackWeight = plan.rollback.readiness === 'READY' ? 20 : plan.rollback.readiness === 'PARTIAL' ? 10 : 0;
  const confWeight = Math.round((Number.isFinite(plan.estimate.confidence) ? plan.estimate.confidence : 0) * 0.15);
  const score = Math.max(0, Math.min(100, readinessWeight + riskWeight + rollbackWeight + confWeight));

  const verdict: ReviewVerdict = blockers.length > 0 ? 'REJECT' : score >= 75 ? 'APPROVE' : 'REVIEW';
  return { verdict, score, reasons, blockers };
}
