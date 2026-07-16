import { describe, it, expect } from 'vitest';
import type { Customer360Input } from './types';
import { evaluateCustomer360 } from './customer360Engine';
import { assessCustomer360Portfolio } from './customer360Aggregator';
import { computeCustomer360Score } from './customer360Score';
import { computeHealthIndex, bandOf } from './customerHealthIndex';
import { computeRisk } from './customerRiskIndex';
import { detectOpportunity } from './customerOpportunityEngine';
import { computeValue } from './customerValueEngine';
import { computeMaturity } from './customerMaturityEngine';
import { computeExecutiveScore } from './customerExecutiveScore';
import { rankCustomers } from './customerRankingEngine';
import { computeBenchmark } from './customerBenchmarkEngine';
import { buildPortfolio } from './customerPortfolioEngine';
import { generateInsights } from './customerInsightsEngine';

const make = (over: Partial<Customer360Input> = {}): Customer360Input => ({
  id: 'c1', name: 'Cliente', planTier: 'pro', mrr: 1000, tenureDays: 200,
  healthScore: 75, journeyScore: 70, nps: 40, csat: 80,
  supportScore: 80, renewalScore: 78, renewalProbability: 0.8,
  churnProbability: 0.1, expansionMrr: 0, openTickets: 1, criticalTickets: 0,
  feedbackCount: 3, lifecycleStage: 'retention',
  ...over,
});

describe('Customer 360°', () => {
  it('handles empty dataset', () => {
    const p = assessCustomer360Portfolio([]);
    expect(p.total).toBe(0);
    expect(p.totalMrr).toBe(0);
    expect(p.avgScore).toBe(0);
    expect(p.ranking).toEqual([]);
    expect(p.insights).toEqual([]);
  });

  it('assesses single customer', () => {
    const p = assessCustomer360Portfolio([make()]);
    expect(p.total).toBe(1);
    expect(p.assessments[0].score.score).toBeGreaterThan(0);
  });

  it('assesses multiple customers', () => {
    const p = assessCustomer360Portfolio([make({ id: 'a' }), make({ id: 'b' }), make({ id: 'c' })]);
    expect(p.total).toBe(3);
    expect(p.ranking.length).toBe(3);
  });

  it('identifies premium customer', () => {
    const exec = computeExecutiveScore(make({ healthScore: 95, journeyScore: 95, supportScore: 95, renewalScore: 95, nps: 80, csat: 95, mrr: 5000, churnProbability: 0.02 }));
    expect(['PLATINUM', 'GOLD']).toContain(exec.tier);
  });

  it('flags churn customer', () => {
    const risk = computeRisk(make({ healthScore: 20, renewalScore: 20, churnProbability: 0.9, criticalTickets: 3 }));
    expect(risk.band).toBe('CRITICAL');
  });

  it('handles new customer', () => {
    const m = computeMaturity(make({ tenureDays: 10 }));
    expect(m.stage).toBe('NEW');
  });

  it('detects expansion opportunity', () => {
    const opp = detectOpportunity(make({ expansionMrr: 500, healthScore: 80 }));
    expect(opp.hasOpportunity).toBe(true);
  });

  it('handles no tickets', () => {
    const r = evaluateCustomer360(make({ openTickets: 0, criticalTickets: 0 }));
    expect(r.risk.reasons).not.toContain('tickets críticos');
  });

  it('handles many tickets', () => {
    const r = computeRisk(make({ criticalTickets: 10 }));
    expect(r.reasons.some((x) => x.includes('críticos'))).toBe(true);
  });

  it('handles no feedback', () => {
    const s = computeCustomer360Score(make({ feedbackCount: 0 }));
    expect(s.score).toBeGreaterThan(0);
  });

  it('handles positive feedback', () => {
    const s = computeCustomer360Score(make({ nps: 90, csat: 95 }));
    expect(s.grade).toMatch(/A|B/);
  });

  it('handles negative feedback', () => {
    const s = computeCustomer360Score(make({ nps: -80, csat: 20, healthScore: 30, renewalScore: 30, supportScore: 30, journeyScore: 30 }));
    expect(s.grade).toMatch(/D|F/);
  });

  it('handles high renewal', () => {
    const s = computeCustomer360Score(make({ renewalScore: 100 }));
    expect(s.score).toBeGreaterThan(60);
  });

  it('handles low renewal', () => {
    const r = computeRisk(make({ renewalScore: 10 }));
    expect(r.reasons.some((x) => x.includes('Renovação'))).toBe(true);
  });

  it('is defensive against null', () => {
    // deliberately unsafe cast to check defensive numerics
    const c = make({ mrr: null as unknown as number, healthScore: null as unknown as number });
    expect(() => evaluateCustomer360(c)).not.toThrow();
  });

  it('is defensive against undefined', () => {
    const c = make({ mrr: undefined as unknown as number });
    expect(computeValue(c).mrr).toBe(0);
  });

  it('is defensive against NaN', () => {
    expect(computeCustomer360Score(make({ healthScore: NaN, nps: NaN })).score).toBeGreaterThanOrEqual(0);
  });

  it('is defensive against Infinity', () => {
    expect(computeValue(make({ mrr: Infinity, churnProbability: Infinity })).mrr).toBe(0);
  });

  it('clamps to minimum score', () => {
    const s = computeCustomer360Score(make({ healthScore: 0, journeyScore: 0, supportScore: 0, renewalScore: 0, nps: -100, csat: 0 }));
    expect(s.score).toBe(0);
  });

  it('clamps to maximum score', () => {
    const s = computeCustomer360Score(make({ healthScore: 100, journeyScore: 100, supportScore: 100, renewalScore: 100, nps: 100, csat: 100 }));
    expect(s.score).toBe(100);
  });

  it('ranks customers deterministically', () => {
    const a = make({ id: 'a', healthScore: 90, renewalScore: 90 });
    const b = make({ id: 'b', healthScore: 40, renewalScore: 40 });
    const r = rankCustomers([b, a]);
    expect(r[0].id).toBe('a');
  });

  it('computes benchmark', () => {
    const bench = computeBenchmark([make({ mrr: 100 }), make({ mrr: 300 })]);
    expect(bench.avgMrr).toBe(200);
  });

  it('is deterministic', () => {
    const c = make();
    expect(evaluateCustomer360(c)).toEqual(evaluateCustomer360(c));
  });

  it('aggregates portfolio', () => {
    const p = assessCustomer360Portfolio([make({ id: 'a', mrr: 100 }), make({ id: 'b', mrr: 200 })]);
    expect(p.totalMrr).toBe(300);
    expect(p.portfolio.total).toBe(2);
  });

  it('classifies health bands', () => {
    expect(bandOf(90)).toBe('CHAMPION');
    expect(bandOf(0)).toBe('CRITICAL');
    expect(computeHealthIndex(make({ healthScore: 90, journeyScore: 90, supportScore: 90 })).band).toBe('CHAMPION');
  });

  it('builds portfolio buckets', () => {
    const b = buildPortfolio([make({ healthScore: 90, journeyScore: 90, supportScore: 90 }), make({ healthScore: 10, journeyScore: 10, supportScore: 10 })]);
    expect(b.byHealth.CHAMPION + b.byHealth.CRITICAL).toBe(2);
  });

  it('generates insights', () => {
    const ins = generateInsights([make({ churnProbability: 0.9, healthScore: 10, renewalScore: 10 })]);
    expect(ins.length).toBeGreaterThan(0);
  });
});
