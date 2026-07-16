import { describe, it, expect } from 'vitest';
import { evaluateCustomerHealth, ratingOf } from './customerHealthEngine';
import { predictChurn } from './churnPredictionEngine';
import { detectExpansion } from './expansionEngine';
import { assessPortfolio } from './customerSuccessAggregator';

const healthySignals = {
  tenureDays: 180, daysSinceLastLogin: 1, onboardingCompletionPct: 100,
  featureAdoptionPct: 85, sales30d: 400, salesPrev30d: 350, fiscalDocs30d: 120,
  openTickets: 0, criticalTickets: 0, daysToRenewal: 90, hasOverdueInvoice: false, mrr: 1500,
};

const criticalSignals = {
  tenureDays: 90, daysSinceLastLogin: 45, onboardingCompletionPct: 20,
  featureAdoptionPct: 10, sales30d: 0, salesPrev30d: 50, fiscalDocs30d: 0,
  openTickets: 5, criticalTickets: 2, daysToRenewal: -3, hasOverdueInvoice: true, mrr: 750,
};

describe('customerHealthEngine', () => {
  it('ratings are ordered', () => {
    expect(ratingOf(90)).toBe('CHAMPION');
    expect(ratingOf(75)).toBe('HEALTHY');
    expect(ratingOf(60)).toBe('STABLE');
    expect(ratingOf(40)).toBe('AT_RISK');
    expect(ratingOf(10)).toBe('CRITICAL');
  });

  it('healthy signals produce high score', () => {
    const h = evaluateCustomerHealth(healthySignals);
    expect(h.score).toBeGreaterThanOrEqual(70);
    expect(['HEALTHY', 'CHAMPION']).toContain(h.rating);
  });

  it('critical signals produce low score with reasons', () => {
    const h = evaluateCustomerHealth(criticalSignals);
    expect(h.score).toBeLessThanOrEqual(40);
    expect(h.reasons.length).toBeGreaterThan(2);
  });
});

describe('churnPredictionEngine', () => {
  it('flags imminent churn for critical accounts', () => {
    const h = evaluateCustomerHealth(criticalSignals);
    const c = predictChurn(criticalSignals, h);
    expect(['HIGH', 'IMMINENT']).toContain(c.band);
    expect(c.probability30d).toBeGreaterThan(0.5);
  });

  it('flags low churn for healthy accounts', () => {
    const h = evaluateCustomerHealth(healthySignals);
    const c = predictChurn(healthySignals, h);
    expect(c.band).toBe('LOW');
  });
});

describe('expansionEngine', () => {
  it('detects upsell for high-volume starter', () => {
    const ops = detectExpansion({ ...healthySignals, sales30d: 500 }, 'starter');
    expect(ops.some((o) => o.type === 'UPSELL_PLAN')).toBe(true);
  });
});

describe('customerSuccessAggregator', () => {
  it('aggregates portfolio deterministically', () => {
    const p = assessPortfolio([
      { id: '1', name: 'A', planTier: 'pro', signals: healthySignals },
      { id: '2', name: 'B', planTier: 'starter', signals: criticalSignals },
    ]);
    expect(p.total).toBe(2);
    expect(p.totalMrr).toBe(2250);
    expect(p.topRisks[0].id).toBe('2');
    expect(p.nrr).toBeGreaterThan(0);
    expect(p.grr).toBeLessThanOrEqual(1);
  });
});
