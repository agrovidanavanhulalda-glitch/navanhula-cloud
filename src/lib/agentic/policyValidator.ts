/**
 * Sprint 4.6 · Policy Validator (pure).
 * Evaluates every policy in the catalog against normalized plan constraints.
 */
import { POLICY_CATALOG, type PolicyDefinition, type PolicyId } from './policyCatalog';
import { normalizePlanConstraints, type PlanConstraints, type PlanConstraintsInput } from './constraintEngine';

export type PolicyStatus = 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT' | 'BLOCKED';

export interface PolicyEvaluation {
  policy: PolicyDefinition;
  value: number;
  status: PolicyStatus;
  passed: boolean;
  reason: string;
  evidence: string;
  impact: string;
  recommendation: string;
}

const VALUE_MAP: Record<PolicyId, (c: PlanConstraints) => number> = {
  RISK_THRESHOLD: (c) => c.risk,
  MAX_COMPLEXITY: (c) => c.complexity,
  MAX_DURATION: (c) => c.durationMinutes,
  MAX_COST: (c) => c.cost,
  ROLLBACK_READINESS: (c) => c.rollbackReadiness,
  REQUIRED_APPROVALS: (c) => c.approvals,
  DEPENDENCY_VALIDATION: (c) => c.unresolvedDependencies,
  GOVERNANCE_RULES: (c) => c.governanceScore,
  KNOWLEDGE_CONFIDENCE: (c) => c.knowledgeConfidence,
  SIMULATION_SCORE: (c) => c.simulationScore,
  DECISION_SCORE: (c) => c.decisionScore,
};

function classify(policy: PolicyDefinition, value: number): { status: PolicyStatus; passed: boolean } {
  const { operator, threshold, severity } = policy;
  const passed = operator === 'lte' ? value <= threshold : value >= threshold;
  if (passed) return { status: 'COMPLIANT', passed };
  // Failed → severity drives status.
  const distance = operator === 'lte' ? value - threshold : threshold - value;
  const relative = threshold === 0 ? distance : Math.abs(distance / Math.max(1, threshold));
  if (severity === 'CRITICAL') return { status: 'BLOCKED', passed };
  if (severity === 'HIGH') return { status: 'NON_COMPLIANT', passed };
  if (relative > 0.25) return { status: 'NON_COMPLIANT', passed };
  return { status: 'WARNING', passed };
}

export function evaluatePolicies(input: PlanConstraintsInput | null | undefined): PolicyEvaluation[] {
  const constraints = normalizePlanConstraints(input);
  return POLICY_CATALOG.map((policy) => {
    const value = VALUE_MAP[policy.id](constraints);
    const { status, passed } = classify(policy, value);
    const op = policy.operator === 'lte' ? '≤' : '≥';
    const reason = passed
      ? `${policy.label} dentro do limite (${value} ${op} ${policy.threshold}).`
      : `${policy.label} fora do limite (${value} ${op} ${policy.threshold} esperado).`;
    return {
      policy,
      value,
      status,
      passed,
      reason,
      evidence: `Valor observado=${value}, threshold=${policy.threshold}, severidade=${policy.severity}.`,
      impact: passed ? 'Sem impacto.' : `Impacto ${policy.severity} — revisar antes da aprovação.`,
      recommendation: passed
        ? 'Manter monitoramento.'
        : policy.operator === 'lte'
          ? `Reduzir ${policy.label.toLowerCase()} para ≤ ${policy.threshold}.`
          : `Elevar ${policy.label.toLowerCase()} para ≥ ${policy.threshold}.`,
    };
  });
}
