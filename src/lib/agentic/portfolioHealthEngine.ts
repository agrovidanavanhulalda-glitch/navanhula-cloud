/**
 * Sprint 4.8 · Portfolio Health Engine (pure).
 * ADVISORY ONLY — no side effects.
 */
export interface PortfolioHealthInput {
  activeInitiatives?: number;
  deferredInitiatives?: number;
  overloaded?: boolean;
  opsHealth?: number;
  executionReadiness?: number;
}

export type PortfolioHealthRating = 'CRITICAL' | 'AT_RISK' | 'STABLE' | 'HEALTHY' | 'OPTIMAL';

export interface PortfolioHealthReport {
  score: number;
  rating: PortfolioHealthRating;
  utilization: number;
  breakdown: { execution: number; ops: number; balance: number };
}

const clamp = (n: unknown, min = 0, max = 100): number => {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.min(max, x));
};

export function evaluatePortfolioHealth(input: PortfolioHealthInput = {}): PortfolioHealthReport {
  const active = Math.max(0, Number.isFinite(input.activeInitiatives as number) ? (input.activeInitiatives as number) : 0);
  const deferred = Math.max(0, Number.isFinite(input.deferredInitiatives as number) ? (input.deferredInitiatives as number) : 0);
  const total = active + deferred;
  const utilization = total === 0 ? 0 : Math.round((active / total) * 100);
  const balance = input.overloaded ? 30 : total === 0 ? 50 : 90;
  const ops = clamp(input.opsHealth);
  const execution = clamp(input.executionReadiness);
  const score = Math.round((execution * 0.4) + (ops * 0.3) + (balance * 0.3));
  const rating: PortfolioHealthRating =
    score >= 85 ? 'OPTIMAL' :
    score >= 70 ? 'HEALTHY' :
    score >= 55 ? 'STABLE' :
    score >= 35 ? 'AT_RISK' : 'CRITICAL';
  return { score, rating, utilization, breakdown: { execution, ops, balance } };
}
