/**
 * Sprint 4.6 · Policy Simulator (pure).
 * Runs the full policy pipeline against alternative constraint sets.
 */
import { evaluatePolicies } from './policyValidator';
import { computeCompliance, type ComplianceBreakdown } from './complianceEngine';
import { evaluateGovernance, type GovernanceInput, type GovernanceReport } from './governanceEngine';
import { computePolicyScore, type PolicyScoreResult } from './policyScore';
import { detectViolations, type PolicyViolation } from './policyViolationEngine';
import { recommendApproval, type ApprovalRecommendation } from './approvalRecommendation';

export interface PolicySimulationInput {
  id: string;
  label: string;
  input: GovernanceInput;
}

export interface PolicySimulationResult {
  id: string;
  label: string;
  compliance: ComplianceBreakdown;
  governance: GovernanceReport;
  policyScore: PolicyScoreResult;
  violations: PolicyViolation[];
  recommendation: ApprovalRecommendation;
}

export function simulatePolicy(sim: PolicySimulationInput): PolicySimulationResult {
  const evaluations = evaluatePolicies(sim.input);
  const compliance = computeCompliance(evaluations);
  const governance = evaluateGovernance(sim.input);
  const policyScore = computePolicyScore(compliance, governance);
  const violations = detectViolations(evaluations);
  const recommendation = recommendApproval(compliance, governance, policyScore, violations);
  return { id: sim.id, label: sim.label, compliance, governance, policyScore, violations, recommendation };
}

export function simulatePolicies(sims: PolicySimulationInput[]): PolicySimulationResult[] {
  return (sims ?? []).map(simulatePolicy);
}
