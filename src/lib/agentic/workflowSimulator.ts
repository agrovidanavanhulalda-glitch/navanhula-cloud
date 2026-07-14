/**
 * Sprint 4.2 · Workflow Simulator (pure).
 * Predicts outcome distribution — no side effects.
 */
import type { ExecutionEstimate } from './executionEstimator';
import type { ValidationReport } from './executionValidator';

export type SimulationOutcome = 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' | 'CANCELLED' | 'BLOCKED' | 'TIMEOUT';

export interface SimulationResult {
  outcome: SimulationOutcome;
  probabilities: Record<SimulationOutcome, number>;
  timeoutMinutes: number;
  notes: string[];
}

const clamp = (n: number, lo = 0, hi = 100) => (Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo);

export function simulateWorkflow(est: ExecutionEstimate, validation: ValidationReport): SimulationResult {
  const notes: string[] = [];
  const success = clamp(est.successProbability);
  const failed = clamp(100 - success);
  const blocks = validation.issues.filter((i) => i.severity === 'BLOCK').length;
  const warns = validation.issues.filter((i) => i.severity === 'WARN').length;

  let probabilities: Record<SimulationOutcome, number> = {
    SUCCESS: success * 0.7,
    PARTIAL_SUCCESS: success * 0.2,
    FAILED: failed * 0.5,
    CANCELLED: 5,
    BLOCKED: blocks * 15,
    TIMEOUT: failed * 0.2 + warns * 2,
  };
  const total = Object.values(probabilities).reduce((s, v) => s + v, 0) || 1;
  probabilities = Object.fromEntries(
    Object.entries(probabilities).map(([k, v]) => [k, Math.round((v / total) * 100)]),
  ) as Record<SimulationOutcome, number>;

  const outcome = (Object.entries(probabilities) as [SimulationOutcome, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  if (blocks > 0) notes.push('Bloqueios de validação presentes.');
  if (est.complexity === 'EXTREME') notes.push('Complexidade extrema.');
  return { outcome, probabilities, timeoutMinutes: Math.round(est.maxMinutes * 1.25), notes };
}
