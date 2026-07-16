/**
 * Sprint 7.1 · Customer Journey — unit tests.
 */
import { describe, it, expect } from 'vitest';
import type { CustomerSignals } from '../customer-success/customerHealthEngine';
import type { CustomerRecord } from '../customer-success/customerSuccessAggregator';
import { classifyJourneyStage, nextStage, JOURNEY_STAGES } from './journeyStageEngine';
import { evaluateActivation } from './activationEngine';
import { evaluateAdoption } from './adoptionEngine';
import { evaluateEngagement } from './engagementEngine';
import { evaluateRetention } from './retentionEngine';
import { evaluateMilestones } from './milestoneEngine';
import { evaluateJourneyScore } from './journeyScoreEngine';
import { buildJourneyTimeline } from './journeyTimelineEngine';
import { lifecycleOf } from './customerLifecycleEngine';
import { assessJourney, assessJourneyPortfolio } from './customerJourneyAggregator';

const base: CustomerSignals = {
  tenureDays: 100, daysSinceLastLogin: 1, onboardingCompletionPct: 100,
  featureAdoptionPct: 80, sales30d: 100, salesPrev30d: 80, fiscalDocs30d: 50,
  openTickets: 0, criticalTickets: 0, daysToRenewal: 60, hasOverdueInvoice: false, mrr: 1500,
};

const dirty: CustomerSignals = {
  tenureDays: NaN, daysSinceLastLogin: Infinity, onboardingCompletionPct: -50,
  featureAdoptionPct: 500, sales30d: NaN, salesPrev30d: -1, fiscalDocs30d: Infinity,
  openTickets: NaN, criticalTickets: NaN, daysToRenewal: NaN,
  hasOverdueInvoice: false, mrr: NaN,
};

describe('journeyStageEngine', () => {
  it('classifies lead when tenure is 0', () => {
    expect(classifyJourneyStage({ ...base, tenureDays: 0 })).toBe('LEAD');
  });
  it('classifies AT_RISK when idle >= 30 and tenure > 30', () => {
    expect(classifyJourneyStage({ ...base, daysSinceLastLogin: 45 })).toBe('AT_RISK');
  });
  it('classifies CHAMPION for deep adoption', () => {
    expect(classifyJourneyStage({ ...base, featureAdoptionPct: 90, sales30d: 200, salesPrev30d: 100 })).toBe('CHAMPION');
  });
  it('handles dirty inputs deterministically', () => {
    expect(() => classifyJourneyStage(dirty)).not.toThrow();
    const a = classifyJourneyStage(dirty);
    const b = classifyJourneyStage(dirty);
    expect(a).toBe(b);
  });
  it('nextStage returns null for terminal', () => {
    expect(nextStage('CHAMPION')).toBeNull();
    expect(nextStage('LEAD')).toBe('TRIAL');
  });
});

describe('activation/adoption/engagement/retention engines', () => {
  it('activation reaches high with sales + fiscal + onboarding', () => {
    const r = evaluateActivation(base);
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.activated).toBe(true);
  });
  it('adoption clamps 0..100 on dirty', () => {
    const r = evaluateAdoption(dirty);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
  it('engagement dormant when idle >= 30', () => {
    const r = evaluateEngagement({ ...base, daysSinceLastLogin: 60, sales30d: 0, fiscalDocs30d: 0 });
    expect(r.band === 'DORMANT' || r.band === 'LOW').toBe(true);
  });
  it('retention drops with overdue + no login', () => {
    const r = evaluateRetention({ ...base, hasOverdueInvoice: true, daysSinceLastLogin: 60, daysToRenewal: -10 });
    expect(r.score).toBeLessThan(40);
  });
});

describe('milestones', () => {
  it('detects reached milestones', () => {
    const r = evaluateMilestones(base);
    expect(r.reachedCount).toBeGreaterThan(4);
  });
  it('handles empty signals', () => {
    const empty: CustomerSignals = {
      tenureDays: 0, daysSinceLastLogin: 0, onboardingCompletionPct: 0,
      featureAdoptionPct: 0, sales30d: 0, salesPrev30d: 0, fiscalDocs30d: 0,
      openTickets: 0, criticalTickets: 0, daysToRenewal: 0, hasOverdueInvoice: false, mrr: 0,
    };
    const r = evaluateMilestones(empty);
    expect(r.reachedCount).toBe(0);
    expect(r.nextMilestone?.id).toBe('account_created');
  });
});

describe('journeyScore', () => {
  it('score in 0..100 for base and dirty', () => {
    for (const s of [base, dirty]) {
      const r = evaluateJourneyScore(s);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });
  it('deterministic', () => {
    expect(evaluateJourneyScore(base)).toEqual(evaluateJourneyScore(base));
  });
});

describe('timeline + lifecycle', () => {
  it('marks current stage', () => {
    const t = buildJourneyTimeline('ACTIVE');
    expect(t.find((s) => s.current)?.stage).toBe('ACTIVE');
    expect(t[0].reached).toBe(true);
  });
  it('AT_RISK has no reached stages in timeline', () => {
    const t = buildJourneyTimeline('AT_RISK');
    expect(t.every((s) => !s.reached && !s.current)).toBe(true);
    expect(t.length).toBe(JOURNEY_STAGES.length);
  });
  it('lifecycle maps every stage', () => {
    for (const s of [...JOURNEY_STAGES, 'AT_RISK' as const]) {
      expect(typeof lifecycleOf(s)).toBe('string');
    }
  });
});

describe('portfolio aggregator', () => {
  it('handles empty dataset', () => {
    const p = assessJourneyPortfolio([]);
    expect(p.total).toBe(0);
    expect(p.avgJourneyScore).toBe(0);
    expect(p.atRiskCustomers).toEqual([]);
  });
  it('single customer', () => {
    const c: CustomerRecord = { id: 'a', name: 'A', planTier: 'pro', signals: base };
    const p = assessJourneyPortfolio([c]);
    expect(p.total).toBe(1);
    expect(p.customers[0].id).toBe('a');
  });
  it('multiple customers + at-risk detection', () => {
    const records: CustomerRecord[] = [
      { id: '1', name: 'One', planTier: 'pro', signals: base },
      { id: '2', name: 'Two', planTier: 'starter', signals: { ...base, daysSinceLastLogin: 60 } },
    ];
    const p = assessJourneyPortfolio(records);
    expect(p.total).toBe(2);
    expect(p.atRiskCustomers.length).toBeGreaterThanOrEqual(1);
  });
  it('assessJourney determinism', () => {
    const c: CustomerRecord = { id: 'x', name: 'X', planTier: 'pro', signals: base };
    expect(assessJourney(c)).toEqual(assessJourney(c));
  });
});
