import type { Customer360Input } from './types';
import { num, round, clamp01 } from './_utils';

export interface CustomerValue {
  readonly mrr: number;
  readonly arr: number;
  readonly ltv: number;
  readonly expansionMrr: number;
}

export function computeValue(c: Customer360Input): CustomerValue {
  const mrr = Math.max(0, num(c.mrr));
  const churn = clamp01(c.churnProbability);
  // Expected lifetime months = 1 / max(churn, 0.02); capped at 60 months.
  const lifetimeMonths = Math.min(60, 1 / Math.max(churn, 0.02));
  const ltv = mrr * lifetimeMonths;
  return {
    mrr: round(mrr),
    arr: round(mrr * 12),
    ltv: round(ltv),
    expansionMrr: round(Math.max(0, num(c.expansionMrr))),
  };
}
