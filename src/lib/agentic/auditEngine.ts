/**
 * Sprint 4.0 · Audit Engine (pure, in-memory).
 * Records every agentic decision as an immutable append-only log.
 */
import type { AgenticPlan } from './plannerEngine';
import type { ApprovalRecord } from './approvalEngine';

export interface AuditEntry {
  id: string;
  planId: string;
  timestamp: string;
  actor: string;
  action: string;
  reason: string;
  evidence: string[];
  confidence: number;
  impact: number;
  risk: number;
  rollbackAvailable: boolean;
}

export function buildAuditEntry(
  plan: AgenticPlan,
  approval: ApprovalRecord,
  actor: string,
  action: string,
  reason: string,
): AuditEntry {
  return {
    id: `audit-${plan.id}-${Date.now().toString(36)}`,
    planId: plan.id,
    timestamp: new Date().toISOString(),
    actor,
    action,
    reason,
    evidence: plan.problem.evidence,
    confidence: plan.score.confidence,
    impact: plan.score.impact,
    risk: plan.score.risk,
    rollbackAvailable: plan.tasks.rollback.length > 0,
  };
}
