import type { Customer360Input } from './types';
import { clamp, round } from './_utils';

export type HealthBand = 'CRITICAL' | 'AT_RISK' | 'STABLE' | 'HEALTHY' | 'CHAMPION';

export interface HealthIndex {
  readonly score: number;
  readonly band: HealthBand;
}

export function bandOf(score: number): HealthBand {
  const s = clamp(score);
  if (s >= 85) return 'CHAMPION';
  if (s >= 70) return 'HEALTHY';
  if (s >= 55) return 'STABLE';
  if (s >= 35) return 'AT_RISK';
  return 'CRITICAL';
}

export function computeHealthIndex(c: Customer360Input): HealthIndex {
  const health = clamp(c.healthScore);
  const journey = clamp(c.journeyScore);
  const support = clamp(c.supportScore);
  const score = round(health * 0.5 + journey * 0.3 + support * 0.2);
  return { score, band: bandOf(score) };
}
