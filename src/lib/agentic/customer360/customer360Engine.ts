import type { Customer360Input } from './types';
import { computeHealthIndex, type HealthIndex } from './customerHealthIndex';
import { computeValue, type CustomerValue } from './customerValueEngine';
import { computeRisk, type RiskIndex } from './customerRiskIndex';
import { detectOpportunity, type Opportunity } from './customerOpportunityEngine';
import { computeMaturity, type Maturity } from './customerMaturityEngine';
import { computeLifecycle360, type Lifecycle360 } from './customerLifecycle360';
import { computeCustomer360Score, type Customer360ScoreResult } from './customer360Score';
import { computeExecutiveScore, type ExecutiveScore } from './customerExecutiveScore';
import { summarizeCustomer, type ExecutiveSummary } from './customerExecutiveSummary';

export interface Customer360Assessment {
  readonly id: string;
  readonly name: string;
  readonly planTier: Customer360Input['planTier'];
  readonly mrr: number;
  readonly health: HealthIndex;
  readonly value: CustomerValue;
  readonly risk: RiskIndex;
  readonly opportunity: Opportunity;
  readonly maturity: Maturity;
  readonly lifecycle: Lifecycle360;
  readonly score: Customer360ScoreResult;
  readonly executive: ExecutiveScore;
  readonly summary: ExecutiveSummary;
}

export function evaluateCustomer360(c: Customer360Input): Customer360Assessment {
  return {
    id: c.id,
    name: c.name,
    planTier: c.planTier,
    mrr: typeof c.mrr === 'number' && Number.isFinite(c.mrr) ? c.mrr : 0,
    health: computeHealthIndex(c),
    value: computeValue(c),
    risk: computeRisk(c),
    opportunity: detectOpportunity(c),
    maturity: computeMaturity(c),
    lifecycle: computeLifecycle360(c),
    score: computeCustomer360Score(c),
    executive: computeExecutiveScore(c),
    summary: summarizeCustomer(c),
  };
}
