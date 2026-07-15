/**
 * Sprint 4.6 · Policy Summary (pure).
 * Produces executive-level report combining every policy engine output.
 */
import { evaluatePolicies, type PolicyEvaluation } from './policyValidator';
import { computeCompliance, type ComplianceBreakdown } from './complianceEngine';
import { evaluateGovernance, type GovernanceInput, type GovernanceReport } from './governanceEngine';
import { computePolicyScore, type PolicyScoreResult } from './policyScore';
import { detectViolations, type PolicyViolation } from './policyViolationEngine';
import { recommendApproval, type ApprovalRecommendation } from './approvalRecommendation';

export interface PolicyExecutiveReport {
  evaluations: PolicyEvaluation[];
  compliance: ComplianceBreakdown;
  governance: GovernanceReport;
  policyScore: PolicyScoreResult;
  violations: PolicyViolation[];
  recommendation: ApprovalRecommendation;
  riskMatrix: { severity: string; count: number }[];
  executiveSummary: string;
}

export function buildPolicyReport(input: GovernanceInput | null | undefined): PolicyExecutiveReport {
  const evaluations = evaluatePolicies(input);
  const compliance = computeCompliance(evaluations);
  const governance = evaluateGovernance(input);
  const policyScore = computePolicyScore(compliance, governance);
  const violations = detectViolations(evaluations);
  const recommendation = recommendApproval(compliance, governance, policyScore, violations);

  const bucket = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<string, number>;
  for (const v of violations) bucket[v.severity]++;
  const riskMatrix = Object.entries(bucket).map(([severity, count]) => ({ severity, count }));

  const executiveSummary =
    `Policy Score ${policyScore.score}/100 (${policyScore.rating}) · ` +
    `Compliance ${compliance.score}/100 (${compliance.status}) · ` +
    `Governance ${governance.score}/100 (${governance.rating}) · ` +
    `${violations.length} violação(ões). Decisão recomendada: ${recommendation.decision}.`;

  return { evaluations, compliance, governance, policyScore, violations, recommendation, riskMatrix, executiveSummary };
}
