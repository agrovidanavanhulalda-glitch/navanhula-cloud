/**
 * Sprint 4.5 · Probability Engine (pure).
 */
import type { ScenarioInput } from './simulationEngine';

export interface ProbabilityBreakdown {
  success: number;
  delay: number;
  rollback: number;
  review: number;
  approval: number;
  confidence: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

export function estimateProbability(s: ScenarioInput): ProbabilityBreakdown {
  const success = clamp(s.confidence * 0.6 + (100 - s.risk) * 0.4);
  const delay = clamp(s.complexity * 0.5 + s.risk * 0.3);
  const rollback = clamp(s.rollbackDifficulty * 0.5 + s.risk * 0.4);
  const review = clamp(s.risk * 0.4 + s.complexity * 0.3);
  const approval = clamp(s.confidence * 0.5 + (100 - s.risk) * 0.3 + s.benefit * 0.2);
  return { success, delay, rollback, review, approval, confidence: clamp(s.confidence) };
}
