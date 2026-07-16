import type { Customer360Input } from './types';
import { computeExecutiveScore } from './customerExecutiveScore';
import { computeRisk } from './customerRiskIndex';

export interface RankedCustomer {
  readonly id: string;
  readonly name: string;
  readonly score: number;
  readonly tier: ReturnType<typeof computeExecutiveScore>['tier'];
  readonly risk: number;
}

export function rankCustomers(customers: readonly Customer360Input[]): RankedCustomer[] {
  return customers
    .map((c) => {
      const exec = computeExecutiveScore(c);
      return {
        id: c.id,
        name: c.name,
        score: exec.score,
        tier: exec.tier,
        risk: computeRisk(c).score,
      };
    })
    .sort((a, b) => b.score - a.score || a.risk - b.risk);
}
