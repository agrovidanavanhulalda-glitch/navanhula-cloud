/**
 * Sprint 4.9 · Decision Intelligence — full suite.
 */
import { describe, it, expect } from 'vitest';
import { normalizeDecisions, type DecisionCandidateInput } from './decisionIntelligenceEngine';
import { scoreDecisions, gradeOf } from './decisionScoreEngine';
import { prioritizeDecisions, topDecisions } from './decisionPriorityEngine';
import { estimateAllImpacts } from './decisionImpactEngine';
import { evaluateConfidence, levelOf } from './decisionConfidenceEngine';
import { assessRisks, riskLevelOf } from './decisionRiskEngine';
import { computeConsensus, verdictOf } from './decisionConsensusEngine';
import { estimateTimelines } from './decisionTimelineEngine';
import { analyzePortfolio } from './decisionPortfolioEngine';
import { evaluateHealth } from './decisionHealthEngine';
import { generateExecutiveDecisions } from './executiveDecisionEngine';
import { buildDecisionSummary } from './decisionSummaryEngine';

const mk = (id: string, o: Partial<DecisionCandidateInput> = {}): DecisionCandidateInput => ({
  id, title: id, impact: 50, confidence: 60, risk: 30, cost: 40, urgency: 50, benefit: 50, ...o,
});

describe('decisionIntelligence — normalize', () => {
  it('empty list', () => expect(normalizeDecisions([])).toEqual([]));
  it('single', () => expect(normalizeDecisions([mk('a')])).toHaveLength(1));
  it('multiple sorted by id', () => {
    const r = normalizeDecisions([mk('b'), mk('a')]);
    expect(r.map(x => x.id)).toEqual(['a','b']);
  });
  it('undefined/null tolerant', () => {
    // @ts-expect-error
    expect(normalizeDecisions(undefined)).toEqual([]);
    // @ts-expect-error
    expect(normalizeDecisions(null)).toEqual([]);
  });
  it('NaN/Infinity clamped', () => {
    const r = normalizeDecisions([mk('a', { impact: NaN, risk: Infinity, cost: -50 })]);
    expect(r[0].impact).toBe(0);
    expect(r[0].risk).toBe(100);
    expect(r[0].cost).toBe(0);
  });
  it('skips invalid ids', () => {
    // @ts-expect-error
    expect(normalizeDecisions([{ id: '' }, { id: null }, mk('ok')])).toHaveLength(1);
  });
});

describe('decisionIntelligence — score & priority', () => {
  const list = normalizeDecisions([mk('a', { impact: 90, confidence: 90, risk: 10, urgency: 90 }), mk('b', { impact: 10, confidence: 10 })]);
  it('scores deterministic and sorted', () => {
    const s1 = scoreDecisions(list);
    const s2 = scoreDecisions(list);
    expect(s1).toEqual(s2);
    expect(s1[0].id).toBe('a');
  });
  it('grades cover extremes', () => {
    expect(gradeOf(100)).toBe('A+');
    expect(gradeOf(0)).toBe('F');
    expect(gradeOf(NaN)).toBe('F');
  });
  it('priorities and top10', () => {
    const p = prioritizeDecisions(list);
    expect(p[0].band).toBe('P0');
    expect(topDecisions(list, 1)).toHaveLength(1);
    expect(topDecisions(list, 0)).toHaveLength(0);
  });
  it('tie-break stable by id', () => {
    const tied = normalizeDecisions([mk('z'), mk('a')]);
    const p = prioritizeDecisions(tied);
    expect(p[0].id).toBe('a');
  });
});

describe('decisionIntelligence — impact/confidence/risk/consensus/timeline', () => {
  const list = normalizeDecisions([mk('a', { impact: 100, benefit: 100 }), mk('b', { risk: 100, confidence: 0 })]);
  it('impact bounded', () => {
    const r = estimateAllImpacts(list);
    r.forEach(x => expect(x.overall).toBeGreaterThanOrEqual(0));
  });
  it('confidence levels', () => {
    expect(levelOf(95)).toBe('VERY_HIGH');
    expect(levelOf(0)).toBe('VERY_LOW');
    expect(evaluateConfidence(list)).toHaveLength(2);
  });
  it('risk extremes', () => {
    expect(riskLevelOf(100)).toBe('EXTREME');
    expect(riskLevelOf(0)).toBe('MINIMAL');
    const r = assessRisks(list);
    expect(r[0].id).toBe('b');
  });
  it('consensus verdicts', () => {
    expect(verdictOf(100)).toBe('STRONG');
    expect(verdictOf(0)).toBe('DIVERGENT');
    expect(computeConsensus(list)).toHaveLength(2);
  });
  it('timelines banded', () => {
    const t = estimateTimelines(normalizeDecisions([mk('a', { effortHours: 4 }), mk('b', { effortHours: 200 })]));
    expect(t[0].band).toBe('IMMEDIATE');
    expect(t[t.length - 1].band).toBe('LONG');
  });
});

describe('decisionIntelligence — portfolio/health/executive/summary', () => {
  it('empty portfolio', () => {
    const p = analyzePortfolio([]);
    expect(p.total).toBe(0);
    expect(p.balance).toBe('UNDERWEIGHT');
  });
  it('portfolio balanced', () => {
    const l = normalizeDecisions([mk('a'), mk('b'), mk('c'), mk('d')]);
    expect(analyzePortfolio(l).balance).toBe('BALANCED');
  });
  it('health degrades with risk', () => {
    const risky = normalizeDecisions(Array.from({ length: 5 }, (_, i) => mk(`r${i}`, { risk: 90, confidence: 20 })));
    expect(evaluateHealth(risky).rating === 'CRITICAL' || evaluateHealth(risky).rating === 'AT_RISK').toBe(true);
  });
  it('executive recommendations cover spectrum', () => {
    const l = normalizeDecisions([
      mk('reject', { risk: 90, confidence: 10 }),
      mk('fast', { impact: 95, confidence: 95, risk: 5, urgency: 95, benefit: 95, cost: 5 }),
      mk('def', { impact: 5, confidence: 40, urgency: 5, benefit: 5 }),
    ]);
    const ex = generateExecutiveDecisions(l);
    const recs = ex.map(e => e.recommendation);
    expect(recs).toContain('REJECT');
    expect(recs).toContain('FAST_TRACK');
  });
  it('summary deterministic', () => {
    const l = normalizeDecisions([mk('a'), mk('b')]);
    const s1 = buildDecisionSummary(l);
    const s2 = buildDecisionSummary(l);
    expect(s1).toEqual(s2);
    expect(s1.total).toBe(2);
  });
});
