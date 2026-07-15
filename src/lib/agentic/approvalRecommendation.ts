/**
 * Sprint 4.6 · Approval Recommendation (pure).
 */
import type { ComplianceBreakdown } from './complianceEngine';
import type { PolicyScoreResult } from './policyScore';
import type { PolicyViolation } from './policyViolationEngine';
import type { GovernanceReport } from './governanceEngine';

export type ApprovalDecision =
  | 'APPROVE'
  | 'APPROVE_WITH_CONDITIONS'
  | 'REQUEST_REVIEW'
  | 'REJECT'
  | 'BLOCK';

export interface ApprovalRecommendation {
  decision: ApprovalDecision;
  justification: string;
  conditions: string[];
}

export function recommendApproval(
  compliance: ComplianceBreakdown,
  governance: GovernanceReport,
  policyScore: PolicyScoreResult,
  violations: PolicyViolation[],
): ApprovalRecommendation {
  const blocked = violations.filter((v) => v.status === 'BLOCKED');
  const nonCompliant = violations.filter((v) => v.status === 'NON_COMPLIANT');
  const warnings = violations.filter((v) => v.status === 'WARNING');
  const conditions = violations.slice(0, 5).map((v) => v.recommendation);

  if (blocked.length > 0) {
    return {
      decision: 'BLOCK',
      justification: `Plano bloqueado por ${blocked.length} política(s) crítica(s): ${blocked.map((b) => b.label).join(', ')}.`,
      conditions,
    };
  }
  if (policyScore.rating === 'FAILED' || nonCompliant.length >= 3) {
    return {
      decision: 'REJECT',
      justification: `Policy score ${policyScore.score}/100 (${policyScore.rating}) e ${nonCompliant.length} violação(ões) severa(s).`,
      conditions,
    };
  }
  if (nonCompliant.length > 0 || governance.rating === 'INSUFFICIENT') {
    return {
      decision: 'REQUEST_REVIEW',
      justification: `Revisão humana requerida: ${nonCompliant.length} não-conformidade(s), governança ${governance.rating}.`,
      conditions,
    };
  }
  if (warnings.length > 0 || policyScore.rating === 'LIMITED') {
    return {
      decision: 'APPROVE_WITH_CONDITIONS',
      justification: `Aprovado sob condições. ${warnings.length} alerta(s) e compliance ${compliance.score}/100.`,
      conditions,
    };
  }
  return {
    decision: 'APPROVE',
    justification: `Compliance ${compliance.score}/100, Governance ${governance.score}/100, Policy ${policyScore.score}/100.`,
    conditions: [],
  };
}
