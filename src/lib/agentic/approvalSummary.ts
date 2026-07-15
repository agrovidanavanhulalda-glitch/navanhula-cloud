/**
 * Sprint 4.3 · Approval Summary (pure).
 * Executive summary for a workflow submission.
 */
import type { ExecutionPlan } from './executionPlanner';
import { reviewPlan, type ReviewReport } from './reviewEngine';

export interface ApprovalSummary {
  headline: string;
  reasons: string[];
  risks: string[];
  impact: string;
  complexity: string;
  rollback: string;
  confidence: string;
  recommendation: string;
  review: ReviewReport;
}

export function summarizeApproval(plan: ExecutionPlan): ApprovalSummary {
  const review = reviewPlan(plan);
  const headline = `${plan.source.problem.title} — Recomendação: ${review.verdict}`;
  const reasons = [
    `Readiness: ${plan.readiness}`,
    `Risco: ${plan.risk.level} (${plan.risk.score}/100)`,
    `Confiança: ${plan.estimate.confidence}%`,
  ];
  const risks = plan.risk.reasons.slice(0, 4);
  const impact = `Impacto ${plan.source.score.impact}/100 · severidade ${plan.source.problem.severity}`;
  const complexity = `${plan.estimate.complexity} · ${plan.graph.nodes.length - 2} tarefas · ${plan.estimate.avgMinutes} min`;
  const rollback = `${plan.rollback.readiness} · ${plan.rollback.steps.length} passos`;
  const confidence = `${plan.estimate.confidence}% (score revisão ${review.score}/100)`;
  const recommendation =
    review.verdict === 'APPROVE'
      ? 'Recomenda-se aprovação do Founder.'
      : review.verdict === 'REVIEW'
        ? 'Recomenda-se revisão adicional antes da aprovação.'
        : 'Recomenda-se rejeição — corrigir bloqueadores antes de nova submissão.';
  return { headline, reasons, risks, impact, complexity, rollback, confidence, recommendation, review };
}
