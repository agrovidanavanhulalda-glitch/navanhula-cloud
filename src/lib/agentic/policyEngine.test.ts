import { describe, it, expect } from 'vitest';
import { normalizePlanConstraints } from './constraintEngine';
import { evaluatePolicies } from './policyValidator';
import { computeCompliance } from './complianceEngine';
import { evaluateGovernance } from './governanceEngine';
import { computePolicyScore, classifyPolicy } from './policyScore';
import { detectViolations, hasBlockingViolation } from './policyViolationEngine';
import { recommendApproval } from './approvalRecommendation';
import { simulatePolicies } from './policySimulator';
import { buildPolicyReport } from './policySummary';

const compliantInput = {
  risk: 20, complexity: 30, durationMinutes: 60, cost: 200,
  rollbackReadiness: 90, approvals: 2, unresolvedDependencies: 0,
  governanceScore: 85, knowledgeConfidence: 80, simulationScore: 80, decisionScore: 80,
  hasAuditTrail: true, hasVersionHistory: true, hasApprovalRecord: true, hasTraceability: true,
};

const blockedInput = {
  risk: 95, complexity: 95, durationMinutes: 900, cost: 5000,
  rollbackReadiness: 10, approvals: 0, unresolvedDependencies: 5,
  governanceScore: 20, knowledgeConfidence: 20, simulationScore: 20, decisionScore: 20,
};

describe('constraintEngine', () => {
  it('handles empty/null', () => {
    const c = normalizePlanConstraints(null);
    expect(c.risk).toBe(0);
    expect(c.durationMinutes).toBe(0);
  });
  it('sanitizes NaN/Infinity/negatives', () => {
    const c = normalizePlanConstraints({ risk: NaN, cost: -10, durationMinutes: Infinity, complexity: 250 });
    expect(c.risk).toBe(0);
    expect(c.cost).toBe(0);
    expect(c.durationMinutes).toBe(0);
    expect(c.complexity).toBe(100);
  });
});

describe('policyValidator', () => {
  it('100% compliant dataset', () => {
    const evals = evaluatePolicies(compliantInput);
    expect(evals.every((e) => e.passed)).toBe(true);
  });
  it('blocked dataset produces BLOCKED status', () => {
    const evals = evaluatePolicies(blockedInput);
    expect(evals.some((e) => e.status === 'BLOCKED')).toBe(true);
  });
});

describe('complianceEngine', () => {
  it('empty evaluations return zero score', () => {
    expect(computeCompliance([]).score).toBe(0);
  });
  it('all compliant → score 100', () => {
    const c = computeCompliance(evaluatePolicies(compliantInput));
    expect(c.score).toBe(100);
    expect(c.status).toBe('COMPLIANT');
  });
  it('blocked plan → BLOCKED status', () => {
    const c = computeCompliance(evaluatePolicies(blockedInput));
    expect(c.status).toBe('BLOCKED');
  });
});

describe('governanceEngine', () => {
  it('empty input yields insufficient rating', () => {
    expect(evaluateGovernance(null).rating).toBe('INSUFFICIENT');
  });
  it('fully instrumented plan reaches ENTERPRISE/STRONG', () => {
    const g = evaluateGovernance(compliantInput);
    expect(['STRONG', 'ENTERPRISE']).toContain(g.rating);
  });
});

describe('policyScore', () => {
  it('classifies boundaries', () => {
    expect(classifyPolicy(95)).toBe('ENTERPRISE');
    expect(classifyPolicy(80)).toBe('STRONG');
    expect(classifyPolicy(65)).toBe('GOOD');
    expect(classifyPolicy(45)).toBe('LIMITED');
    expect(classifyPolicy(10)).toBe('FAILED');
    expect(classifyPolicy(NaN)).toBe('FAILED');
  });
  it('penalizes blocked policies', () => {
    const evals = evaluatePolicies(blockedInput);
    const s = computePolicyScore(computeCompliance(evals), evaluateGovernance(blockedInput));
    expect(s.score).toBeLessThan(40);
  });
});

describe('violationEngine', () => {
  it('no violations for compliant plan', () => {
    const v = detectViolations(evaluatePolicies(compliantInput));
    expect(v.length).toBe(0);
    expect(hasBlockingViolation(v)).toBe(false);
  });
  it('detects blocking violations', () => {
    const v = detectViolations(evaluatePolicies(blockedInput));
    expect(hasBlockingViolation(v)).toBe(true);
  });
});

describe('approvalRecommendation', () => {
  it('APPROVE for compliant plan', () => {
    const evals = evaluatePolicies(compliantInput);
    const rec = recommendApproval(computeCompliance(evals), evaluateGovernance(compliantInput), computePolicyScore(computeCompliance(evals), evaluateGovernance(compliantInput)), detectViolations(evals));
    expect(rec.decision).toBe('APPROVE');
  });
  it('BLOCK for critical violations', () => {
    const evals = evaluatePolicies(blockedInput);
    const rec = recommendApproval(computeCompliance(evals), evaluateGovernance(blockedInput), computePolicyScore(computeCompliance(evals), evaluateGovernance(blockedInput)), detectViolations(evals));
    expect(rec.decision).toBe('BLOCK');
  });
});

describe('policySimulator', () => {
  it('handles empty list', () => {
    expect(simulatePolicies([])).toEqual([]);
  });
  it('runs multiple scenarios', () => {
    const results = simulatePolicies([
      { id: 'a', label: 'Compliant', input: compliantInput },
      { id: 'b', label: 'Blocked', input: blockedInput },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].recommendation.decision).toBe('APPROVE');
    expect(results[1].recommendation.decision).toBe('BLOCK');
  });
});

describe('policySummary', () => {
  it('empty input produces deterministic report', () => {
    const r = buildPolicyReport(null);
    expect(r.executiveSummary).toContain('Policy Score');
    expect(r.riskMatrix).toHaveLength(4);
  });
  it('compliant report recommends APPROVE', () => {
    const r = buildPolicyReport(compliantInput);
    expect(r.recommendation.decision).toBe('APPROVE');
    expect(r.violations.length).toBe(0);
  });
});
