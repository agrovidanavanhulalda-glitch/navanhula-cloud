/**
 * Sprint 4.6 · Constraint Engine (pure).
 * Normalizes plan metrics to safe numeric values.
 */

export interface PlanConstraintsInput {
  risk?: number;
  complexity?: number;
  durationMinutes?: number;
  cost?: number;
  rollbackReadiness?: number;
  approvals?: number;
  unresolvedDependencies?: number;
  governanceScore?: number;
  knowledgeConfidence?: number;
  simulationScore?: number;
  decisionScore?: number;
}

export interface PlanConstraints {
  risk: number;
  complexity: number;
  durationMinutes: number;
  cost: number;
  rollbackReadiness: number;
  approvals: number;
  unresolvedDependencies: number;
  governanceScore: number;
  knowledgeConfidence: number;
  simulationScore: number;
  decisionScore: number;
}

const clamp01to100 = (n: unknown, fallback = 0): number => {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(100, v));
};

const safeNonNeg = (n: unknown, fallback = 0): number => {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v) || v < 0) return fallback;
  return v;
};

export function normalizePlanConstraints(input: PlanConstraintsInput | null | undefined): PlanConstraints {
  const i = input ?? {};
  return {
    risk: clamp01to100(i.risk),
    complexity: clamp01to100(i.complexity),
    durationMinutes: safeNonNeg(i.durationMinutes),
    cost: safeNonNeg(i.cost),
    rollbackReadiness: clamp01to100(i.rollbackReadiness),
    approvals: Math.max(0, Math.floor(safeNonNeg(i.approvals))),
    unresolvedDependencies: Math.max(0, Math.floor(safeNonNeg(i.unresolvedDependencies))),
    governanceScore: clamp01to100(i.governanceScore),
    knowledgeConfidence: clamp01to100(i.knowledgeConfidence),
    simulationScore: clamp01to100(i.simulationScore),
    decisionScore: clamp01to100(i.decisionScore),
  };
}
