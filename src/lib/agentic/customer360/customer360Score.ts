import type { Customer360Input } from './types';
import { clamp, round } from './_utils';

export interface Customer360ScoreResult {
  readonly score: number;
  readonly grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export function computeCustomer360Score(c: Customer360Input): Customer360ScoreResult {
  const health = clamp(c.healthScore);
  const journey = clamp(c.journeyScore);
  const support = clamp(c.supportScore);
  const renewal = clamp(c.renewalScore);
  // NPS -100..100 → 0..100
  const npsNorm = clamp(((c.nps ?? 0) + 100) / 2);
  const csat = clamp(c.csat);

  const score = round(
    health * 0.25 +
    journey * 0.15 +
    support * 0.15 +
    renewal * 0.20 +
    npsNorm * 0.15 +
    csat * 0.10,
  );

  const grade =
    score >= 85 ? 'A' :
    score >= 70 ? 'B' :
    score >= 55 ? 'C' :
    score >= 35 ? 'D' : 'F';

  return { score, grade };
}
