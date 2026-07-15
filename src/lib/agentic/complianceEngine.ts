/**
 * Sprint 4.6 · Compliance Engine (pure).
 */
import type { PolicyEvaluation, PolicyStatus } from './policyValidator';

export interface ComplianceBreakdown {
  compliant: number;
  warning: number;
  nonCompliant: number;
  blocked: number;
  total: number;
  score: number; // 0..100
  status: PolicyStatus;
}

const WEIGHT: Record<PolicyStatus, number> = {
  COMPLIANT: 1,
  WARNING: 0.7,
  NON_COMPLIANT: 0.3,
  BLOCKED: 0,
};

export function computeCompliance(evaluations: PolicyEvaluation[]): ComplianceBreakdown {
  const list = evaluations ?? [];
  const total = list.length;
  if (total === 0) {
    return { compliant: 0, warning: 0, nonCompliant: 0, blocked: 0, total: 0, score: 0, status: 'NON_COMPLIANT' };
  }
  let compliant = 0, warning = 0, nonCompliant = 0, blocked = 0, weighted = 0;
  for (const e of list) {
    weighted += WEIGHT[e.status];
    if (e.status === 'COMPLIANT') compliant++;
    else if (e.status === 'WARNING') warning++;
    else if (e.status === 'NON_COMPLIANT') nonCompliant++;
    else blocked++;
  }
  const score = Math.round((weighted / total) * 100);
  const status: PolicyStatus =
    blocked > 0 ? 'BLOCKED' : nonCompliant > 0 ? 'NON_COMPLIANT' : warning > 0 ? 'WARNING' : 'COMPLIANT';
  return { compliant, warning, nonCompliant, blocked, total, score, status };
}
