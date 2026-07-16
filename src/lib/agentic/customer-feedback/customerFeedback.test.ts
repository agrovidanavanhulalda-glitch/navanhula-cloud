import { describe, it, expect } from 'vitest';
import { computeNps } from './npsEngine';
import { computeSatisfaction } from './satisfactionEngine';
import { aggregateSentiment, sentimentOf } from './sentimentEngine';
import { computeLoyalty } from './loyaltyEngine';
import { breakdownByCategory } from './feedbackCategoryEngine';
import { monthlyTrend } from './feedbackTrendEngine';
import { extractCustomerVoice } from './customerVoiceEngine';
import { identifyOpportunities } from './improvementOpportunityEngine';
import { computeFeedbackScore } from './feedbackScoreEngine';
import { assessFeedbackPortfolio } from './customerFeedbackAggregator';
import type { FeedbackEntry, FeedbackCategory } from './types';

const mk = (o: Partial<FeedbackEntry> & { id: string; rating: number }): FeedbackEntry => ({
  customerId: 'c1', category: 'usability' as FeedbackCategory,
  createdAt: '2026-01-15', ...o,
});

describe('customer-feedback engines', () => {
  it('empty dataset', () => {
    const p = assessFeedbackPortfolio([]);
    expect(p.nps.nps).toBe(0);
    expect(p.satisfaction.csat).toBe(0);
    expect(p.score.score).toBe(0);
    expect(p.categories).toEqual([]);
    expect(p.trend).toEqual([]);
  });

  it('single customer', () => {
    const p = assessFeedbackPortfolio([mk({ id: '1', rating: 10 })]);
    expect(p.nps.nps).toBe(100);
    expect(p.satisfaction.avgRating).toBe(10);
  });

  it('only promoters', () => {
    const r = computeNps([mk({ id: 'a', rating: 9 }), mk({ id: 'b', rating: 10, customerId: 'c2' })]);
    expect(r.nps).toBe(100);
    expect(r.promoters).toBe(2);
  });

  it('only detractors', () => {
    const r = computeNps([mk({ id: 'a', rating: 0 }), mk({ id: 'b', rating: 6 })]);
    expect(r.nps).toBe(-100);
  });

  it('only passives', () => {
    const r = computeNps([mk({ id: 'a', rating: 7 }), mk({ id: 'b', rating: 8 })]);
    expect(r.nps).toBe(0);
    expect(r.passives).toBe(2);
  });

  it('mixed', () => {
    const r = computeNps([
      mk({ id: 'a', rating: 10 }), mk({ id: 'b', rating: 8 }),
      mk({ id: 'c', rating: 3 }), mk({ id: 'd', rating: 9 }),
    ]);
    expect(r.promoters).toBe(2);
    expect(r.passives).toBe(1);
    expect(r.detractors).toBe(1);
    expect(r.nps).toBe(25);
  });

  it('handles null/undefined/NaN/Infinity ratings', () => {
    const entries = [
      mk({ id: 'a', rating: NaN }),
      mk({ id: 'b', rating: Infinity }),
      mk({ id: 'c', rating: -50 }),
      mk({ id: 'd', rating: 999 }),
    ];
    const r = computeNps(entries);
    // NaN→0, Infinity→0, -50→0 (all detractors); 999→10 (promoter)
    expect(r.promoters).toBe(1);
    expect(r.detractors).toBe(3);
    expect(r.nps).toBe(-50);
  });

  it('min and max scores', () => {
    expect(computeSatisfaction([mk({ id: 'a', rating: 0 })]).csat).toBe(0);
    expect(computeSatisfaction([mk({ id: 'a', rating: 10 })]).csat).toBe(100);
  });

  it('sentiment from comment overrides rating', () => {
    expect(sentimentOf(mk({ id: 'a', rating: 5, comment: 'excelente serviço' }))).toBe('positive');
    expect(sentimentOf(mk({ id: 'a', rating: 10, comment: 'péssimo bug' }))).toBe('negative');
    expect(sentimentOf(mk({ id: 'a', rating: 8 }))).toBe('neutral');
  });

  it('sentiment aggregation empty', () => {
    expect(aggregateSentiment([]).score).toBe(0);
  });

  it('loyalty repeat detection', () => {
    const l = computeLoyalty([
      mk({ id: 'a', customerId: 'c1', rating: 10 }),
      mk({ id: 'b', customerId: 'c1', rating: 9 }),
      mk({ id: 'c', customerId: 'c2', rating: 8 }),
    ]);
    expect(l.uniqueCustomers).toBe(2);
    expect(l.repeatCustomers).toBe(1);
  });

  it('category breakdown counts only present categories', () => {
    const b = breakdownByCategory([
      mk({ id: 'a', category: 'pricing', rating: 4 }),
      mk({ id: 'b', category: 'pricing', rating: 6 }),
      mk({ id: 'c', category: 'support', rating: 9 }),
    ]);
    expect(b).toHaveLength(2);
    expect(b.find((x) => x.category === 'pricing')!.avgRating).toBe(5);
  });

  it('monthly trend sorts by month', () => {
    const t = monthlyTrend([
      mk({ id: 'a', createdAt: '2026-02-01', rating: 10 }),
      mk({ id: 'b', createdAt: '2026-01-15', rating: 3 }),
      mk({ id: 'c', createdAt: '2026-02-20', rating: 9 }),
    ]);
    expect(t.map((p) => p.month)).toEqual(['2026-01', '2026-02']);
    expect(t[1].nps).toBe(100);
  });

  it('customer voice extracts complaints and praises', () => {
    const v = extractCustomerVoice([
      mk({ id: 'a', rating: 10, comment: 'adoro' }),
      mk({ id: 'b', rating: 2, comment: 'bug crítico' }),
      mk({ id: 'c', rating: 8 }),
    ]);
    expect(v.topPraises).toHaveLength(1);
    expect(v.topComplaints).toHaveLength(1);
  });

  it('opportunities prioritize low-rated categories with volume', () => {
    const ops = identifyOpportunities([
      mk({ id: 'a', category: 'performance', rating: 2 }),
      mk({ id: 'b', category: 'performance', rating: 3 }),
      mk({ id: 'c', category: 'performance', rating: 4 }),
      mk({ id: 'd', category: 'usability', rating: 9 }),
    ]);
    expect(ops[0].category).toBe('performance');
    expect(ops[0].priority).toBe('P1');
  });

  it('feedback score composite is deterministic', () => {
    const entries = [
      mk({ id: 'a', rating: 10 }), mk({ id: 'b', rating: 9 }),
      mk({ id: 'c', rating: 6 }),
    ];
    const a = computeFeedbackScore(entries);
    const b = computeFeedbackScore(entries);
    expect(a).toEqual(b);
    expect(a.score).toBeGreaterThan(0);
    expect(a.score).toBeLessThanOrEqual(100);
  });

  it('aggregator produces summary and rating', () => {
    const p = assessFeedbackPortfolio([
      mk({ id: 'a', rating: 10, comment: 'ótimo' }),
      mk({ id: 'b', rating: 9, customerId: 'c2' }),
    ]);
    expect(['CHAMPION','HEALTHY','STABLE','AT_RISK','CRITICAL']).toContain(p.summary.rating);
    expect(p.summary.headline.length).toBeGreaterThan(0);
  });

  it('trend handles invalid createdAt', () => {
    const t = monthlyTrend([mk({ id: 'a', createdAt: '', rating: 5 })]);
    expect(t).toHaveLength(1);
  });
});
