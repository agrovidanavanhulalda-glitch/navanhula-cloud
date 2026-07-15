/**
 * Sprint 4.6 · Governance Engine (pure).
 */
import { normalizePlanConstraints, type PlanConstraintsInput } from './constraintEngine';

export interface GovernanceInput extends PlanConstraintsInput {
  hasAuditTrail?: boolean;
  hasVersionHistory?: boolean;
  hasApprovalRecord?: boolean;
  hasTraceability?: boolean;
}

export type GovernanceRating = 'INSUFFICIENT' | 'BASIC' | 'ADEQUATE' | 'STRONG' | 'ENTERPRISE';

export interface GovernanceReport {
  score: number;
  rating: GovernanceRating;
  dimensions: {
    auditability: number;
    versioning: number;
    history: number;
    approval: number;
    traceability: number;
    confidence: number;
  };
}

const boolScore = (b?: boolean) => (b ? 100 : 0);

export function evaluateGovernance(input: GovernanceInput | null | undefined): GovernanceReport {
  const i = input ?? {};
  const c = normalizePlanConstraints(i);
  const dimensions = {
    auditability: boolScore(i.hasAuditTrail),
    versioning: boolScore(i.hasVersionHistory),
    history: Math.max(boolScore(i.hasVersionHistory), c.knowledgeConfidence),
    approval: boolScore(i.hasApprovalRecord ?? c.approvals > 0),
    traceability: boolScore(i.hasTraceability),
    confidence: c.knowledgeConfidence,
  };
  const values = Object.values(dimensions);
  const score = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
  const rating: GovernanceRating =
    score >= 90 ? 'ENTERPRISE' :
    score >= 75 ? 'STRONG' :
    score >= 60 ? 'ADEQUATE' :
    score >= 40 ? 'BASIC' : 'INSUFFICIENT';
  return { score, rating, dimensions };
}
