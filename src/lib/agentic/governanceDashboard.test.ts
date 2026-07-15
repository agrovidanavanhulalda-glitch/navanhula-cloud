/**
 * Sprint 4.8 · Governance Dashboard tests.
 */
import { describe, it, expect } from 'vitest';
import { buildGovernanceDashboard } from './governanceDashboardEngine';
import { evaluatePortfolioHealth } from './portfolioHealthEngine';
import { computeGovernanceScore } from './governanceScoreEngine';
import { evaluateAlignment } from './strategicAlignmentEngine';
import { computeBusinessValue, aggregateBusinessValue } from './businessValueEngine';
import { analyzeInvestment } from './investmentEngine';
import { evaluateBenefits } from './benefitRealizationEngine';
import { computeRiskExposure } from './riskExposureEngine';
import { rankInitiatives } from './initiativeRankingEngine';
import { evaluateCapacity } from './portfolioCapacityEngine';

describe('governanceDashboard', () => {
  it('handles empty input', () => {
    const r = buildGovernanceDashboard();
    expect(r.summary.overallScore).toBeGreaterThanOrEqual(0);
    expect(r.summary.overallScore).toBeLessThanOrEqual(100);
    expect(r.ranking).toEqual([]);
    expect(r.heatmap.length).toBe(6);
  });

  it('handles NaN/Infinity/null/undefined safely', () => {
    const r = buildGovernanceDashboard({
      opsHealth: NaN, executionReadiness: Infinity,
      policyScore: -50, approvalCoverage: 200,
      auditCoverage: undefined as unknown as number,
      knowledgeScore: null as unknown as number,
      totalCapacity: NaN, usedCapacity: Infinity,
      initiatives: [{ id: 'a', impact: NaN, confidence: Infinity, cost: -1, effort: NaN } as any],
      investments: [{ id: 'x', cost: NaN, benefit: Infinity }],
      benefits: [{ id: 'y', expected: NaN, realized: -5 }],
      risks: [{ id: 'z', probability: NaN, impact: Infinity }],
    });
    expect(r.summary.overallScore).toBeGreaterThanOrEqual(0);
    expect(r.summary.overallScore).toBeLessThanOrEqual(100);
  });

  it('is deterministic for identical input', () => {
    const input = {
      opsHealth: 80, executionReadiness: 75, policyScore: 90,
      initiatives: [{ id: 'a', impact: 8, confidence: 70, cost: 100, effort: 3 }],
    };
    const a = buildGovernanceDashboard(input);
    const b = buildGovernanceDashboard(input);
    expect(a).toEqual(b);
  });

  it('reaches minimum score with zero signals', () => {
    const r = buildGovernanceDashboard({
      opsHealth: 0, executionReadiness: 0, policyScore: 0,
      approvalCoverage: 0, auditCoverage: 0, knowledgeScore: 0, complianceScore: 0,
    });
    expect(r.summary.overallScore).toBeLessThan(70);
  });

  it('reaches high score with max signals', () => {
    const r = buildGovernanceDashboard({
      opsHealth: 100, executionReadiness: 100, policyScore: 100,
      approvalCoverage: 100, auditCoverage: 100, knowledgeScore: 100, complianceScore: 100,
      totalCapacity: 100, usedCapacity: 50,
      initiatives: [{ id: 'a', impact: 10, confidence: 100, cost: 100, effort: 1 }],
      investments: [{ id: 'i', cost: 100, benefit: 500 }],
      benefits: [{ id: 'b', expected: 100, realized: 100 }],
    });
    expect(r.summary.overallScore).toBeGreaterThanOrEqual(70);
  });
});

describe('portfolioHealthEngine', () => {
  it('empty gives low-medium score', () => {
    const r = evaluatePortfolioHealth();
    expect(r.rating).toBeDefined();
  });
  it('overloaded lowers balance', () => {
    const a = evaluatePortfolioHealth({ activeInitiatives: 5, overloaded: true, opsHealth: 100, executionReadiness: 100 });
    const b = evaluatePortfolioHealth({ activeInitiatives: 5, overloaded: false, opsHealth: 100, executionReadiness: 100 });
    expect(a.score).toBeLessThan(b.score);
  });
});

describe('governanceScoreEngine', () => {
  it('rates enterprise at max', () => {
    const r = computeGovernanceScore({ policyScore: 100, approvalCoverage: 100, auditCoverage: 100, knowledgeScore: 100, complianceScore: 100 });
    expect(r.rating).toBe('ENTERPRISE');
  });
  it('rates insufficient at zero', () => {
    expect(computeGovernanceScore().rating).toBe('INSUFFICIENT');
  });
});

describe('strategicAlignmentEngine', () => {
  it('perfect alignment', () => {
    const r = evaluateAlignment(
      [{ id: 'a', objectiveId: 'o1', impact: 9, confidence: 90 }],
      ['o1'],
    );
    expect(r.aligned).toBe(1);
    expect(r.coverage).toBe(100);
  });
  it('total misalignment', () => {
    const r = evaluateAlignment(
      [{ id: 'a', objectiveId: 'orphan', impact: 1, confidence: 10 }],
      ['o1', 'o2'],
    );
    expect(r.misaligned).toBe(1);
    expect(r.coverage).toBe(0);
  });
  it('handles empty', () => {
    expect(evaluateAlignment().score).toBe(0);
  });
});

describe('businessValueEngine', () => {
  it('strategic tier at max', () => {
    expect(computeBusinessValue({ impact: 10, confidence: 100, strategicWeight: 10, risk: 0 }).tier).toBe('STRATEGIC');
  });
  it('low tier at zero', () => {
    expect(computeBusinessValue().tier).toBe('LOW');
  });
  it('aggregates empty', () => {
    expect(aggregateBusinessValue()).toEqual({ avg: 0, total: 0, count: 0 });
  });
});

describe('investmentEngine', () => {
  it('handles zero investment', () => {
    const r = analyzeInvestment([]);
    expect(r.totalCost).toBe(0);
    expect(r.rating).toBe('BREAK_EVEN');
  });
  it('detects loss', () => {
    const r = analyzeInvestment([{ id: 'a', cost: 100, benefit: 10 }]);
    expect(r.rating).toBe('LOSS');
  });
  it('detects excellent ROI', () => {
    const r = analyzeInvestment([{ id: 'a', cost: 100, benefit: 500 }]);
    expect(r.rating).toBe('EXCELLENT');
  });
});

describe('benefitRealizationEngine', () => {
  it('handles zero benefit', () => {
    expect(evaluateBenefits([]).rating).toBe('FAILING');
  });
  it('exceeding', () => {
    expect(evaluateBenefits([{ id: 'a', expected: 100, realized: 150 }]).rating).toBe('EXCEEDING');
  });
});

describe('riskExposureEngine', () => {
  it('extreme risk', () => {
    const r = computeRiskExposure([{ id: 'a', probability: 100, impact: 10 }]);
    expect(r.rating).toBe('EXTREME');
  });
  it('mitigation reduces exposure', () => {
    const a = computeRiskExposure([{ id: 'x', probability: 100, impact: 10, mitigated: true }]);
    const b = computeRiskExposure([{ id: 'x', probability: 100, impact: 10, mitigated: false }]);
    expect(a.exposure).toBeLessThan(b.exposure);
  });
  it('empty gives minimal', () => {
    expect(computeRiskExposure().rating).toBe('MINIMAL');
  });
});

describe('initiativeRankingEngine', () => {
  it('breaks ties by id', () => {
    const r = rankInitiatives([
      { id: 'b', impact: 5, confidence: 50, strategicWeight: 5, risk: 0, cost: 0, effort: 0 },
      { id: 'a', impact: 5, confidence: 50, strategicWeight: 5, risk: 0, cost: 0, effort: 0 },
    ]);
    expect(r[0].id).toBe('a');
  });
  it('large dataset stable', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: `i${i}`, impact: i % 10, confidence: (i * 3) % 100, cost: i, effort: i % 5 }));
    const r = rankInitiatives(items);
    expect(r.length).toBe(100);
    expect(r[0].rank).toBe(1);
  });
});

describe('portfolioCapacityEngine', () => {
  it('idle when unused', () => {
    expect(evaluateCapacity({ totalCapacity: 100, usedCapacity: 0 }).rating).toBe('IDLE');
  });
  it('overloaded when deferred', () => {
    expect(evaluateCapacity({ totalCapacity: 100, usedCapacity: 90, deferredInitiatives: 5 }).overloaded).toBe(true);
  });
  it('max capacity', () => {
    const r = evaluateCapacity({ totalCapacity: 100, usedCapacity: 100 });
    expect(r.utilization).toBe(100);
  });
});
