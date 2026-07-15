import { describe, it, expect } from 'vitest';
import { normalizeTransformations, type TransformationInput } from './transformationEngine';
import { computeValueScore } from './valueEngine';
import { evaluateRealization } from './valueRealizationEngine';
import { rankInitiatives } from './initiativeValueEngine';
import { evaluateOutcomes } from './businessOutcomeEngine';
import { evaluateAlignment } from './kpiAlignmentEngine';
import { analyzePortfolioValue } from './portfolioValueEngine';
import { assessRisks } from './transformationRiskEngine';
import { buildRoadmap } from './transformationRoadmapEngine';
import { forecastValue } from './valueForecastEngine';
import { computeTransformationScore } from './transformationScoreEngine';
import { buildTransformationSummary } from './transformationSummaryEngine';

const S: TransformationInput[] = [
  { id: 'T1', name: 'Cloud Migration', pillar: 'TECHNOLOGY', progress: 60, investment: 1000, value: 3000, risk: 30, alignment: 85, maturity: 4 },
  { id: 'T2', name: 'Data Platform', pillar: 'DATA', progress: 40, investment: 800, value: 2000, risk: 45, alignment: 75, maturity: 3 },
  { id: 'T3', name: 'Governance', pillar: 'GOVERNANCE', progress: 20, investment: 500, value: 900, risk: 65, alignment: 60, maturity: 2 },
];

describe('Sprint 5.1 · Transformation', () => {
  it('handles empty', () => {
    expect(normalizeTransformations([])).toEqual([]);
    expect(computeValueScore([]).score).toBe(0);
    expect(evaluateRealization([]).realizationRate).toBe(0);
    expect(rankInitiatives([])).toEqual([]);
    expect(evaluateOutcomes([])).toEqual([]);
    expect(evaluateAlignment([]).rating).toBe('MISALIGNED');
    expect(forecastValue([]).confidence).toBe(0);
    expect(computeTransformationScore([]).score).toBe(0);
  });

  it('handles single', () => {
    const list = normalizeTransformations([S[0]]);
    expect(list).toHaveLength(1);
    expect(computeTransformationScore(list).score).toBeGreaterThan(0);
  });

  it('handles multiple deterministically', () => {
    const a = buildTransformationSummary(normalizeTransformations(S));
    const b = buildTransformationSummary(normalizeTransformations(S));
    expect(a).toEqual(b);
  });

  it('sanitizes NaN, Infinity, undefined, null', () => {
    const bad = [
      { id: 'X', progress: NaN, investment: Infinity, value: -50, risk: 999, alignment: NaN, maturity: -9 },
      null,
      { id: undefined },
      undefined,
    ] as unknown as TransformationInput[];
    const list = normalizeTransformations(bad);
    expect(list).toHaveLength(1);
    expect(list[0].progress).toBe(0);
    expect(list[0].investment).toBe(0);
    expect(list[0].value).toBe(0);
    expect(list[0].risk).toBe(100);
    expect(list[0].alignment).toBe(0);
    expect(list[0].maturity).toBe(0);
  });

  it('score bounded 0-100', () => {
    const s = computeTransformationScore(normalizeTransformations(S));
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
  });

  it('minimum score all zeros', () => {
    const list = normalizeTransformations([{ id: 'z', value: 0, investment: 0, alignment: 0, risk: 100, progress: 0 }]);
    const s = computeTransformationScore(list);
    expect(s.score).toBeLessThanOrEqual(20);
  });

  it('maximum score pristine', () => {
    const list = normalizeTransformations([
      { id: 'p1', value: 1000, investment: 100, alignment: 100, risk: 0, progress: 100 },
      { id: 'p2', value: 800, investment: 80, alignment: 100, risk: 0, progress: 100 },
    ]);
    expect(computeTransformationScore(list).rating).toMatch(/A/);
  });

  it('extreme risk classified critical', () => {
    const list = normalizeTransformations([{ id: 'r', risk: 100 }]);
    expect(assessRisks(list).items[0].level).toBe('CRITICAL');
  });

  it('full alignment', () => {
    const list = normalizeTransformations([{ id: 'a', alignment: 100 }, { id: 'b', alignment: 95 }]);
    expect(evaluateAlignment(list).rating).toBe('FULLY_ALIGNED');
  });

  it('misalignment', () => {
    const list = normalizeTransformations([{ id: 'a', alignment: 10 }, { id: 'b', alignment: 5 }]);
    expect(evaluateAlignment(list).rating).toBe('MISALIGNED');
  });

  it('extreme value ROI capped', () => {
    const list = normalizeTransformations([{ id: 'x', value: 1e12, investment: 1 }]);
    const p = analyzePortfolioValue(list);
    expect(p.roi).toBeLessThanOrEqual(500);
  });

  it('zero value handled', () => {
    const list = normalizeTransformations([{ id: 'z', value: 0, investment: 100 }]);
    expect(analyzePortfolioValue(list).netValue).toBe(-100);
  });

  it('roadmap deterministic', () => {
    const r1 = buildRoadmap(normalizeTransformations(S));
    const r2 = buildRoadmap(normalizeTransformations(S));
    expect(r1).toEqual(r2);
  });

  it('outcomes group by pillar', () => {
    const outcomes = evaluateOutcomes(normalizeTransformations(S));
    expect(outcomes).toHaveLength(3);
    outcomes.forEach((o) => expect(['BEHIND', 'PROGRESSING', 'ACHIEVED']).toContain(o.status));
  });

  it('forecast increases with horizon', () => {
    const f = forecastValue(normalizeTransformations(S));
    expect(f.projected12m).toBeGreaterThanOrEqual(f.projected6m);
    expect(f.projected6m).toBeGreaterThanOrEqual(f.projected3m);
  });

  it('summary stable', () => {
    const a = buildTransformationSummary(normalizeTransformations(S));
    expect(a.totals.initiatives).toBe(3);
    expect(a.highlights.length).toBeGreaterThan(0);
    expect(['ACCELERATE', 'MAINTAIN', 'REBALANCE', 'STABILIZE']).toContain(a.recommendation);
  });
});
