/**
 * Sprint 4.5 · Decision Simulation Lab — unit tests.
 */
import { describe, it, expect } from 'vitest';
import { normalizeScenario, normalizeScenarios, type ScenarioInput } from '@/lib/agentic/simulationEngine';
import { buildDefaultScenarios } from '@/lib/agentic/scenarioEngine';
import { estimateImpact } from '@/lib/agentic/impactEngine';
import { estimateProbability } from '@/lib/agentic/probabilityEngine';
import { estimateCost } from '@/lib/agentic/costEngine';
import { estimateTimeline } from '@/lib/agentic/timelineEngine';
import { computeDecisionScore, classifyDecision } from '@/lib/agentic/decisionScore';
import { evaluateAll, buildComparisonMatrix } from '@/lib/agentic/comparisonEngine';
import { rankScenarios } from '@/lib/agentic/scenarioRanking';
import { buildSimulationReport } from '@/lib/agentic/simulationSummary';

const mk = (over: Partial<ScenarioInput> = {}): ScenarioInput => ({
  id: 's',
  kind: 'CURRENT',
  label: 'S',
  risk: 40,
  complexity: 40,
  benefit: 60,
  minutes: 60,
  cost: 100,
  rollbackDifficulty: 30,
  confidence: 70,
  ...over,
});

describe('simulationEngine.normalize', () => {
  it('clamps invalid values (NaN / Infinity / negative)', () => {
    const s = normalizeScenario(mk({ risk: NaN, benefit: Infinity, minutes: -10, cost: -5, confidence: 250 }));
    expect(s.risk).toBe(0);
    expect(s.benefit).toBe(100);
    expect(s.minutes).toBe(0);
    expect(s.cost).toBe(0);
    expect(s.confidence).toBe(100);
  });
  it('normalizes null/undefined list', () => {
    expect(normalizeScenarios(null as unknown as ScenarioInput[])).toEqual([]);
  });
});

describe('scenarioEngine.buildDefaultScenarios', () => {
  it('produces 4 scenarios', () => {
    expect(buildDefaultScenarios({ id: 'p1' })).toHaveLength(4);
  });
  it('uses defaults for missing values', () => {
    const list = buildDefaultScenarios({});
    expect(list.every((s) => Number.isFinite(s.risk))).toBe(true);
  });
});

describe('impact/probability/cost/timeline', () => {
  it('impact overall is 0..100', () => {
    const i = estimateImpact(mk());
    expect(i.overall).toBeGreaterThanOrEqual(0);
    expect(i.overall).toBeLessThanOrEqual(100);
  });
  it('probability handles extreme risk', () => {
    const p = estimateProbability(mk({ risk: 100, confidence: 0 }));
    expect(p.success).toBeLessThanOrEqual(100);
    expect(p.rollback).toBeGreaterThanOrEqual(0);
  });
  it('cost handles zero cost', () => {
    const c = estimateCost(mk({ cost: 0 }));
    expect(c.base).toBe(0);
    expect(c.score).toBe(100);
  });
  it('timeline handles zero minutes', () => {
    const t = estimateTimeline(mk({ minutes: 0 }));
    expect(t.expectedMinutes).toBe(0);
    expect(t.score).toBe(100);
  });
});

describe('decisionScore', () => {
  it('classifies extremes', () => {
    expect(classifyDecision(90)).toBe('OPTIMAL');
    expect(classifyDecision(72)).toBe('STRONG');
    expect(classifyDecision(60)).toBe('GOOD');
    expect(classifyDecision(40)).toBe('WEAK');
    expect(classifyDecision(10)).toBe('REJECT');
    expect(classifyDecision(NaN)).toBe('REJECT');
  });
  it('computes bounded score', () => {
    const r = computeDecisionScore({
      impactOverall: 80, successProbability: 80, confidence: 80, risk: 20, costScore: 80, timelineScore: 80,
    });
    expect(r.score).toBeGreaterThan(70);
    expect(r.rating === 'STRONG' || r.rating === 'OPTIMAL').toBe(true);
  });
});

describe('ranking + comparison', () => {
  it('empty list → all nulls', () => {
    const r = rankScenarios([]);
    expect(r.best).toBeNull();
    expect(r.balanced).toBeNull();
  });
  it('single scenario wins every category', () => {
    const evals = evaluateAll([mk({ id: 'only' })]);
    const r = rankScenarios(evals);
    expect(r.best?.scenario.id).toBe('only');
    expect(r.lowestRisk?.scenario.id).toBe('only');
    expect(r.balanced?.scenario.id).toBe('only');
  });
  it('multiple scenarios pick expected extremes and break ties by id', () => {
    const evals = evaluateAll([
      mk({ id: 'a', risk: 20, cost: 50, benefit: 60, confidence: 60 }),
      mk({ id: 'b', risk: 20, cost: 50, benefit: 90, confidence: 90 }),
      mk({ id: 'c', risk: 80, cost: 200, benefit: 40, confidence: 40 }),
    ]);
    const r = rankScenarios(evals);
    expect(r.highestBenefit?.scenario.id).toBe('b');
    expect(r.highestConfidence?.scenario.id).toBe('b');
    // tie between a and b on lowest risk → id 'a' wins
    expect(r.lowestRisk?.scenario.id).toBe('a');
    expect(buildComparisonMatrix(evals)).toHaveLength(3);
  });
});

describe('simulationSummary.buildSimulationReport', () => {
  it('empty dataset yields no recommendation', () => {
    const rep = buildSimulationReport([]);
    expect(rep.evaluations).toHaveLength(0);
    expect(rep.summary.bestScenarioId).toBeNull();
  });
  it('produces a report from default scenarios', () => {
    const rep = buildSimulationReport(buildDefaultScenarios({ id: 'plan' }));
    expect(rep.evaluations).toHaveLength(4);
    expect(rep.matrix).toHaveLength(4);
    expect(rep.summary.bestScenarioId).not.toBeNull();
  });
  it('surfaces risks for extreme-risk scenarios', () => {
    const rep = buildSimulationReport([mk({ id: 'x', risk: 95, benefit: 20, confidence: 20 })]);
    expect(rep.summary.risks.length).toBeGreaterThan(0);
  });
});
