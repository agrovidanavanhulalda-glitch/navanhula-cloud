/**
 * Sprint 7.3 · Renewal Forecast — projected recurring revenue.
 */
import type { RenewalContract } from './types';
import { num, round } from './_utils';
import { estimateRenewalProbability } from './renewalProbability';
import { detectRenewalOpportunity } from './renewalOpportunity';
import { evaluateRenewal } from './renewalEngine';

export interface RenewalForecast {
  readonly windowDays: number;
  readonly grossMrrAtRisk: number;
  readonly expectedRenewedMrr: number;
  readonly expectedChurnedMrr: number;
  readonly expectedExpansionMrr: number;
  readonly netForecastMrr: number;
}

export function forecastRenewals(
  contracts: readonly RenewalContract[],
  windowDays: number,
  now: Date = new Date(),
): RenewalForecast {
  let gross = 0;
  let renewed = 0;
  let expansion = 0;
  for (const c of contracts) {
    const { daysToRenewal } = evaluateRenewal(c, now);
    if (daysToRenewal > windowDays) continue;
    const mrr = num(c.mrr);
    gross += mrr;
    const { probability } = estimateRenewalProbability(c);
    renewed += mrr * probability;
    const op = detectRenewalOpportunity(c);
    if (op.hasOpportunity) expansion += op.estimatedMrrLift * probability;
  }
  const churned = Math.max(0, gross - renewed);
  return {
    windowDays,
    grossMrrAtRisk: round(gross),
    expectedRenewedMrr: round(renewed),
    expectedChurnedMrr: round(churned),
    expectedExpansionMrr: round(expansion),
    netForecastMrr: round(renewed + expansion),
  };
}
