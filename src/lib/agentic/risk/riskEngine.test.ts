/**
 * Sprint 5.2 · Risk Engine test suite.
 */
import { describe, it, expect } from 'vitest';
import { normalizeRisks, inherentRisk } from './enterpriseRiskEngine';
import { buildRegister } from './riskRegisterEngine';
import { assess, levelOf } from './riskAssessmentEngine';
import { buildHeatmap } from './riskHeatmapEngine';
import { analyzeProbability } from './riskProbabilityEngine';
import { analyzeImpact } from './riskImpactEngine';
import { computeExposure } from './riskExposureEngine';
import { recommendTreatment } from './riskTreatmentEngine';
import { planMitigation } from './mitigationPlanner';
import { computeResidual } from './residualRiskEngine';
import { computeTrend } from './riskTrendEngine';
import { forecastRisk } from './riskForecastEngine';
import { analyzePortfolio } from './riskPortfolioEngine';
import { computeExecutiveScore } from './riskScoreEngine';
import { buildRiskSummary } from './riskSummaryEngine';

const sample = [
  { id: 'R1', name: 'Data breach', category: 'SECURITY', probability: 80, impact: 90, mitigation: 60, velocity: 70, detectability: 55 },
  { id: 'R2', name: 'Cash flow', category: 'FINANCIAL', probability: 40, impact: 70, mitigation: 40, velocity: 30, detectability: 80 },
  { id: 'R3', name: 'Downtime', category: 'TECHNOLOGY', probability: 30, impact: 50, mitigation: 20, velocity: 60, detectability: 40 },
];

describe('Sprint 5.2 · Enterprise Risk Engine', () => {
  it('normalizes empty/invalid inputs', () => {
    expect(normalizeRisks(null)).toEqual([]);
    expect(normalizeRisks(undefined)).toEqual([]);
    expect(normalizeRisks([])).toEqual([]);
    const out = normalizeRisks([
      { id: 'X', probability: NaN, impact: Infinity, mitigation: -5, velocity: 200, detectability: null },
    ] as unknown as never);
    expect(out[0].probability).toBe(0);
    expect(out[0].impact).toBe(100);
    expect(out[0].mitigation).toBe(0);
    expect(out[0].velocity).toBe(100);
    expect(out[0].detectability).toBe(0);
  });

  it('computes inherent risk deterministically', () => {
    const list = normalizeRisks(sample as never);
    expect(inherentRisk(list[0])).toBe(72);
    expect(buildRegister(list)[0].id).toBe('R1');
  });

  it('assesses levels correctly across boundaries', () => {
    expect(levelOf(0)).toBe('LOW');
    expect(levelOf(24)).toBe('LOW');
    expect(levelOf(25)).toBe('MEDIUM');
    expect(levelOf(50)).toBe('HIGH');
    expect(levelOf(75)).toBe('CRITICAL');
    expect(levelOf(100)).toBe('CRITICAL');
    const list = normalizeRisks(sample as never);
    expect(assess(list)[0].level).toBe('HIGH');
  });

  it('builds a 25-cell heatmap', () => {
    const hm = buildHeatmap(normalizeRisks(sample as never));
    expect(hm.cells.length).toBe(25);
    expect(hm.max).toBeGreaterThan(0);
  });

  it('handles empty datasets across all engines', () => {
    expect(analyzeProbability([]).band).toBe('RARE');
    expect(analyzeImpact([]).severity).toBe('NEGLIGIBLE');
    expect(computeExposure([]).rating).toBe('MINIMAL');
    expect(computeResidual([]).avgBefore).toBe(0);
    expect(computeTrend([]).direction).toBe('STABLE');
    expect(forecastRisk([]).d30).toBe(0);
    expect(analyzePortfolio([]).slices).toEqual([]);
    expect(computeExecutiveScore([]).score).toBe(100);
    expect(recommendTreatment([])).toEqual([]);
    expect(planMitigation([])).toEqual([]);
    expect(buildRiskSummary([]).recommendation).toBe('PROCEED');
  });

  it('recommends treatments by score band', () => {
    const list = normalizeRisks([
      { id: 'A', probability: 90, impact: 90 },
      { id: 'B', probability: 70, impact: 80 },
      { id: 'C', probability: 50, impact: 70 },
      { id: 'D', probability: 10, impact: 10 },
    ] as never);
    const rec = recommendTreatment(list);
    const map = Object.fromEntries(rec.map((r) => [r.id, r.action]));
    expect(map.A).toBe('AVOID');
    expect(map.B).toBe('MITIGATE');
    expect(map.C).toBe('TRANSFER');
    expect(map.D).toBe('ACCEPT');
  });

  it('computes residual reduction correctly', () => {
    const list = normalizeRisks([{ id: 'R', probability: 100, impact: 100, mitigation: 50 }] as never);
    const res = computeResidual(list);
    expect(res.items[0].before).toBe(100);
    expect(res.items[0].after).toBe(50);
  });

  it('detects trend direction', () => {
    const degrading = normalizeRisks([
      { id: 'A', probability: 60, impact: 60, velocity: 95 },
    ] as never);
    expect(computeTrend(degrading).direction).toBe('DEGRADING');
    const improving = normalizeRisks([
      { id: 'A', probability: 60, impact: 60, velocity: 5 },
    ] as never);
    expect(computeTrend(improving).direction).toBe('IMPROVING');
  });

  it('forecast confidence bounded 0-100', () => {
    const f = forecastRisk(normalizeRisks(sample as never));
    expect(f.confidence).toBeGreaterThanOrEqual(0);
    expect(f.confidence).toBeLessThanOrEqual(100);
    expect(f.d30).toBeGreaterThanOrEqual(0);
    expect(f.d365).toBeLessThanOrEqual(100);
  });

  it('portfolio HHI concentration in range', () => {
    const p = analyzePortfolio(normalizeRisks(sample as never));
    expect(p.concentration).toBeGreaterThanOrEqual(0);
    expect(p.concentration).toBeLessThanOrEqual(100);
  });

  it('executive score is deterministic and bounded', () => {
    const s1 = computeExecutiveScore(normalizeRisks(sample as never));
    const s2 = computeExecutiveScore(normalizeRisks(sample as never));
    expect(s1).toEqual(s2);
    expect(s1.score).toBeGreaterThanOrEqual(0);
    expect(s1.score).toBeLessThanOrEqual(100);
  });

  it('summary escalates critical postures', () => {
    const critical = normalizeRisks([
      { id: 'X', probability: 100, impact: 100, mitigation: 0, velocity: 100 },
    ] as never);
    const sum = buildRiskSummary(critical);
    expect(sum.recommendation).toBe('ESCALATE');
    expect(sum.warnings.length).toBeGreaterThan(0);
  });

  it('handles ties deterministically (stable id ordering)', () => {
    const list = normalizeRisks([
      { id: 'B', probability: 50, impact: 50 },
      { id: 'A', probability: 50, impact: 50 },
    ] as never);
    const reg = buildRegister(list);
    expect(reg.map((r) => r.id)).toEqual(['A', 'B']);
  });
});
