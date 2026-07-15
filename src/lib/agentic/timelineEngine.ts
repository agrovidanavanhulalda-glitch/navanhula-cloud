/**
 * Sprint 4.5 · Timeline Engine (pure).
 */
import type { ScenarioInput } from './simulationEngine';

export interface TimelineEstimate {
  minMinutes: number;
  expectedMinutes: number;
  maxMinutes: number;
  score: number; // 0..100 (higher = faster)
}

const safe = (n: number) => (Number.isFinite(n) && n >= 0 ? n : 0);

export function estimateTimeline(s: ScenarioInput): TimelineEstimate {
  const expected = safe(s.minutes);
  const complexityFactor = 1 + safe(s.complexity) / 200;
  const riskFactor = 1 + safe(s.risk) / 300;
  const min = expected * 0.8;
  const max = expected * complexityFactor * riskFactor * 1.3;
  const score = Math.max(0, Math.min(100, 100 - Math.min(100, expected / 6)));
  return {
    minMinutes: Math.round(min),
    expectedMinutes: Math.round(expected),
    maxMinutes: Math.round(max),
    score: Math.round(score),
  };
}
