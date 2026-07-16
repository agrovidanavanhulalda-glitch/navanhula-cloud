import type { Customer360Input, Customer360Buckets } from './types';
import { computeHealthIndex } from './customerHealthIndex';

export interface PortfolioBreakdown {
  readonly byHealth: Customer360Buckets;
  readonly byJourney: Record<Customer360Input['lifecycleStage'], number>;
  readonly totalMrr: number;
  readonly total: number;
}

export function buildPortfolio(customers: readonly Customer360Input[]): PortfolioBreakdown {
  const byHealth: Customer360Buckets = { CRITICAL: 0, AT_RISK: 0, STABLE: 0, HEALTHY: 0, CHAMPION: 0 };
  const byJourney: Record<Customer360Input['lifecycleStage'], number> = {
    onboarding: 0, adoption: 0, retention: 0, expansion: 0, renewal: 0, churn: 0,
  };
  let totalMrr = 0;
  for (const c of customers) {
    byHealth[computeHealthIndex(c).band]++;
    const stage = c.lifecycleStage ?? 'onboarding';
    if (stage in byJourney) byJourney[stage]++;
    totalMrr += typeof c.mrr === 'number' && Number.isFinite(c.mrr) ? c.mrr : 0;
  }
  return { byHealth, byJourney, totalMrr: Math.round(totalMrr), total: customers.length };
}
