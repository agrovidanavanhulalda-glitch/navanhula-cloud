/**
 * Sprint 4.5 · Cost Engine (pure).
 */
import type { ScenarioInput } from './simulationEngine';

export interface CostBreakdown {
  base: number;
  riskAdjusted: number;
  score: number; // 0..100, higher = cheaper
}

const safe = (n: number) => (Number.isFinite(n) && n >= 0 ? n : 0);

export function estimateCost(s: ScenarioInput): CostBreakdown {
  const base = safe(s.cost);
  const riskAdjusted = base * (1 + safe(s.risk) / 200);
  const score = Math.max(0, Math.min(100, 100 - Math.min(100, riskAdjusted / 20)));
  return {
    base: Math.round(base * 100) / 100,
    riskAdjusted: Math.round(riskAdjusted * 100) / 100,
    score: Math.round(score),
  };
}
