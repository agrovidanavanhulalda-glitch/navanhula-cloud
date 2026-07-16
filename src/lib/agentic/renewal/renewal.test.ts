/**
 * Sprint 7.3 · Renewal Intelligence — unit tests.
 */
import { describe, it, expect } from 'vitest';
import type { RenewalContract } from './types';
import { evaluateRenewal } from './renewalEngine';
import { estimateRenewalProbability } from './renewalProbability';
import { evaluateRenewalRisk } from './renewalRisk';
import { detectRenewalOpportunity } from './renewalOpportunity';
import { evaluateContractHealth } from './contractHealth';
import { computeRenewalScore } from './renewalScore';
import { prioritizeRenewal } from './renewalPriority';
import { buildRenewalPipeline } from './renewalPipeline';
import { forecastRenewals } from './renewalForecast';
import { assessRenewalPortfolio } from './renewalAggregator';

const NOW = new Date('2026-07-16T00:00:00Z');
const iso = (offsetDays: number) =>
  new Date(NOW.getTime() + offsetDays * 86_400_000).toISOString();

const base = (over: Partial<RenewalContract> = {}): RenewalContract => ({
  id: 'k1',
  customerId: 'c1',
  customerName: 'Acme',
  planTier: 'pro',
  mrr: 1500,
  startDate: iso(-400),
  renewalDate: iso(45),
  tenureDays: 400,
  usagePct: 70,
  npsScore: 50,
  overdueInvoices: 0,
  criticalTickets: 0,
  daysSinceLastLogin: 3,
  expansionSignals: 1,
  ...over,
});

describe('renewalEngine', () => {
  it('flags EXPIRED for past renewal', () => {
    const s = evaluateRenewal(base({ renewalDate: iso(-10) }), NOW);
    expect(s.stage).toBe('EXPIRED');
    expect(s.isExpired).toBe(true);
  });
  it('maps DUE_NOW / DUE_30D / FUTURE stages', () => {
    expect(evaluateRenewal(base({ renewalDate: iso(3) }), NOW).stage).toBe('DUE_NOW');
    expect(evaluateRenewal(base({ renewalDate: iso(20) }), NOW).stage).toBe('DUE_30D');
    expect(evaluateRenewal(base({ renewalDate: iso(200) }), NOW).stage).toBe('FUTURE');
  });
  it('handles invalid renewalDate defensively', () => {
    const s = evaluateRenewal(base({ renewalDate: '' }), NOW);
    expect(s.daysToRenewal).toBe(0);
  });
});

describe('renewalProbability', () => {
  it('is bounded 0..1', () => {
    const p = estimateRenewalProbability(base());
    expect(p.probability).toBeGreaterThanOrEqual(0);
    expect(p.probability).toBeLessThanOrEqual(1);
  });
  it('drops with churn signals', () => {
    const good = estimateRenewalProbability(base());
    const bad = estimateRenewalProbability(base({
      overdueInvoices: 2, criticalTickets: 3, daysSinceLastLogin: 60, npsScore: -50, usagePct: 10,
    }));
    expect(bad.probability).toBeLessThan(good.probability);
    expect(bad.likelihood).toBe('LOW');
  });
  it('handles NaN/Infinity/undefined/null defensively', () => {
    const p = estimateRenewalProbability(base({
      usagePct: NaN, npsScore: Infinity,
      overdueInvoices: undefined as unknown as number,
      criticalTickets: null as unknown as number,
      daysSinceLastLogin: -Infinity, tenureDays: NaN,
    }));
    expect(Number.isFinite(p.probability)).toBe(true);
  });
});

describe('renewalRisk', () => {
  it('CRITICAL band on worst inputs', () => {
    const r = evaluateRenewalRisk(base({
      overdueInvoices: 5, criticalTickets: 5, daysSinceLastLogin: 90, npsScore: -100, usagePct: 0,
    }));
    expect(r.band).toBe('CRITICAL');
    expect(r.drivers.length).toBeGreaterThan(0);
  });
});

describe('renewalOpportunity', () => {
  it('none when no signals', () => {
    const o = detectRenewalOpportunity(base({ expansionSignals: 0, usagePct: 20, npsScore: 0 }));
    expect(o.hasOpportunity).toBe(false);
    expect(o.estimatedMrrLift).toBe(0);
  });
  it('lift proportional on positive signals', () => {
    const o = detectRenewalOpportunity(base({ expansionSignals: 3, usagePct: 90, npsScore: 80 }));
    expect(o.hasOpportunity).toBe(true);
    expect(o.estimatedMrrLift).toBeGreaterThan(0);
  });
});

describe('contractHealth & renewalScore', () => {
  it('score bounded 0..100', () => {
    const s = computeRenewalScore(base());
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
  });
  it('champion at max health', () => {
    const s = computeRenewalScore(base({
      usagePct: 100, npsScore: 100, overdueInvoices: 0, criticalTickets: 0, daysSinceLastLogin: 0, tenureDays: 1000,
    }));
    expect(s.rating === 'CHAMPION' || s.rating === 'HEALTHY').toBe(true);
  });
  it('critical at min health', () => {
    const s = evaluateContractHealth(base({
      usagePct: 0, npsScore: -100, overdueInvoices: 5, criticalTickets: 5, daysSinceLastLogin: 120,
    }));
    expect(s.score).toBeLessThanOrEqual(30);
  });
});

describe('renewalPriority', () => {
  it('P1 for expired', () => {
    expect(prioritizeRenewal(base({ renewalDate: iso(-5) }), NOW).priority).toBe('P1');
  });
  it('P4 for stable long-horizon', () => {
    expect(prioritizeRenewal(base({ renewalDate: iso(200), overdueInvoices: 0 }), NOW).priority).toBe('P4');
  });
});

describe('pipeline & forecast', () => {
  const contracts: RenewalContract[] = [
    base({ id: 'a', renewalDate: iso(-5), mrr: 1000 }),
    base({ id: 'b', renewalDate: iso(10), mrr: 2000 }),
    base({ id: 'c', renewalDate: iso(45), mrr: 1500 }),
    base({ id: 'd', renewalDate: iso(200), mrr: 500 }),
  ];
  it('pipeline sums total mrr and orders stages', () => {
    const p = buildRenewalPipeline(contracts, NOW);
    expect(p.totalContracts).toBe(4);
    expect(p.totalMrr).toBe(5000);
    expect(p.buckets[0].stage).toBe('EXPIRED');
  });
  it('forecast is monotonic in window size', () => {
    const f30 = forecastRenewals(contracts, 30, NOW);
    const f90 = forecastRenewals(contracts, 90, NOW);
    expect(f90.grossMrrAtRisk).toBeGreaterThanOrEqual(f30.grossMrrAtRisk);
  });
  it('empty dataset returns zeros', () => {
    const f = forecastRenewals([], 30, NOW);
    expect(f.grossMrrAtRisk).toBe(0);
    expect(f.netForecastMrr).toBe(0);
  });
});

describe('aggregator', () => {
  it('handles empty portfolio', () => {
    const p = assessRenewalPortfolio([], NOW);
    expect(p.total).toBe(0);
    expect(p.totalMrr).toBe(0);
    expect(p.avgScore).toBe(0);
    expect(p.summary.highlights).toEqual([]);
  });
  it('single customer', () => {
    const p = assessRenewalPortfolio([base()], NOW);
    expect(p.total).toBe(1);
    expect(p.assessments[0].customerName).toBe('Acme');
  });
  it('multiple customers with deterministic ordering', () => {
    const p1 = assessRenewalPortfolio([
      base({ id: 'a', overdueInvoices: 3 }),
      base({ id: 'b' }),
      base({ id: 'c', overdueInvoices: 5, criticalTickets: 3 }),
    ], NOW);
    const p2 = assessRenewalPortfolio([
      base({ id: 'a', overdueInvoices: 3 }),
      base({ id: 'b' }),
      base({ id: 'c', overdueInvoices: 5, criticalTickets: 3 }),
    ], NOW);
    expect(p1.topRisks.map((r) => r.id)).toEqual(p2.topRisks.map((r) => r.id));
    expect(p1.topRisks[0].id).toBe('c');
  });
});
