/**
 * Sprint 4.6 · Policy Violation Engine (pure).
 */
import type { PolicyEvaluation } from './policyValidator';
import type { PolicySeverity } from './policyCatalog';

export interface PolicyViolation {
  policyId: string;
  label: string;
  severity: PolicySeverity;
  status: PolicyEvaluation['status'];
  value: number;
  threshold: number;
  reason: string;
  recommendation: string;
}

const SEVERITY_ORDER: Record<PolicySeverity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export function detectViolations(evaluations: PolicyEvaluation[]): PolicyViolation[] {
  return (evaluations ?? [])
    .filter((e) => !e.passed)
    .map((e) => ({
      policyId: e.policy.id,
      label: e.policy.label,
      severity: e.policy.severity,
      status: e.status,
      value: e.value,
      threshold: e.policy.threshold,
      reason: e.reason,
      recommendation: e.recommendation,
    }))
    .sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);
}

export function hasBlockingViolation(violations: PolicyViolation[]): boolean {
  return (violations ?? []).some((v) => v.status === 'BLOCKED');
}
