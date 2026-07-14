/**
 * Sprint 4.0 · Agent Engine (pure orchestrator).
 * Coordinates workflow → planner → decision → policy → approval → audit.
 * ADVISORY ONLY. Never triggers real actions on POS / Fiscal / Billing / etc.
 */
import { buildPlansFromMetrics, type WorkflowMetrics } from './workflowEngine';
import { evaluatePolicy, type PolicyContext, type PolicyDecision } from './policyEngine';
import { initialApproval, type ApprovalRecord } from './approvalEngine';
import type { AgenticPlan } from './plannerEngine';

export interface AgenticProposal {
  plan: AgenticPlan;
  approval: ApprovalRecord;
  policy: PolicyDecision;
}

export function proposeAll(metrics: WorkflowMetrics, ctx: PolicyContext): AgenticProposal[] {
  const plans = buildPlansFromMetrics(metrics);
  return plans.map((plan) => ({
    plan,
    approval: initialApproval(plan),
    policy: evaluatePolicy(ctx, {
      criticality: plan.problem.severity,
      impact: plan.score.impact,
      risk: plan.score.risk,
      requiresFounder: plan.requiresFounder,
    }),
  }));
}

export interface AgenticSummary {
  total: number;
  critical: number;
  high: number;
  avgConfidence: number;
  requiresFounder: number;
  readiness: 'READY' | 'REVIEW' | 'BLOCKED';
}

export function summarize(proposals: AgenticProposal[]): AgenticSummary {
  if (proposals.length === 0) {
    return { total: 0, critical: 0, high: 0, avgConfidence: 0, requiresFounder: 0, readiness: 'READY' };
  }
  const critical = proposals.filter((p) => p.plan.problem.severity === 'CRITICAL').length;
  const high = proposals.filter((p) => p.plan.problem.severity === 'HIGH').length;
  const avgConfidence = Math.round(
    proposals.reduce((s, p) => s + p.plan.score.confidence, 0) / proposals.length,
  );
  const requiresFounder = proposals.filter((p) => p.plan.requiresFounder).length;
  const readiness: AgenticSummary['readiness'] =
    critical > 0 ? 'BLOCKED' : high > 0 ? 'REVIEW' : 'READY';
  return { total: proposals.length, critical, high, avgConfidence, requiresFounder, readiness };
}
