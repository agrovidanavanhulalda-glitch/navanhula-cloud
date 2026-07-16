import type { Customer360Input } from './types';
import { computeCustomer360Score } from './customer360Score';
import { computeRisk } from './customerRiskIndex';
import { computeValue } from './customerValueEngine';
import { clamp, round } from './_utils';

export interface ExecutiveScore {
  readonly score: number;
  readonly tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'AT_RISK';
}

export function computeExecutiveScore(c: Customer360Input): ExecutiveScore {
  const base = computeCustomer360Score(c).score;
  const risk = computeRisk(c).score;
  const value = computeValue(c);
  // Weight value logarithmically so MRR contributes without dominating.
  const valueBoost = clamp(Math.log10(1 + value.ltv) * 5, 0, 25);
  const score = round(clamp(base - risk * 0.25 + valueBoost));
  const tier: ExecutiveScore['tier'] =
    score >= 85 ? 'PLATINUM' :
    score >= 70 ? 'GOLD' :
    score >= 55 ? 'SILVER' :
    score >= 35 ? 'BRONZE' : 'AT_RISK';
  return { score, tier };
}
