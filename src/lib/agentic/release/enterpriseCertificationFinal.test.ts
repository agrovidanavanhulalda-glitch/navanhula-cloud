/**
 * Sprint 5.6.4 · Enterprise Certification Final — deterministic tests.
 */
import { describe, it, expect } from 'vitest';
import { generateCertificationReport } from './enterpriseCertificationReport';
import { aggregateEvidence } from './evidenceAggregatorFinal';
import { validateEvidence } from './releaseEvidenceValidator';
import { buildQualityGateMatrix } from './qualityGateMatrix';
import { decideGaFinalState } from './gaDecisionEngineFinal';

const perfectSignals = {
  typecheck: { ok: true },
  vitest: { passed: 420, total: 420 },
  coverage: 100,
  security: 100, architecture: 100, observability: 100, performance: 100,
  scalability: 100, governance: 100, compliance: 100, agentic: 100,
  businessContinuity: 100, digitalTwin: 100, operations: 100, transformation: 100,
  strategy: 100, knowledge: 100, decision: 100, simulation: 100, documentation: 100,
  releaseChecklist: { passed: 8, total: 8 }, qualityGates: { passed: 10, total: 10 },
};

describe('Sprint 5.6.4 · Enterprise Certification Final', () => {
  it('returns NOT_READY on empty signals', () => {
    const r = generateCertificationReport({});
    expect(r.decision.state).toBe('NOT_READY');
    expect(r.decision.deployment).toBe('NO_GO');
    expect(r.decision.label).toContain('NOT READY');
  });

  it('returns GA when all signals are maximum', () => {
    const r = generateCertificationReport(perfectSignals);
    expect(r.decision.state).toBe('GA');
    expect(r.decision.deployment).toBe('GO');
    expect(r.aggregate.completeness).toBe(100);
    expect(r.matrix.failCount).toBe(0);
    expect(r.validation.failCount).toBe(0);
  });

  it('returns RC on strong-but-not-perfect signals', () => {
    const r = generateCertificationReport({ ...perfectSignals, security: 80, compliance: 80 });
    expect(r.decision.state).toBe('RC');
    expect(r.decision.deployment).toBe('CONDITIONAL_GO');
  });

  it('clamps NaN/Infinity/null in signals', () => {
    const r = generateCertificationReport({
      security: NaN as unknown as number,
      performance: Infinity as unknown as number,
      compliance: null as unknown as number,
    });
    expect(r.decision.state).toBe('NOT_READY');
    expect(Number.isFinite(r.aggregate.score.enterpriseScore)).toBe(true);
  });

  it('matrix classifies boundaries deterministically', () => {
    const agg = aggregateEvidence({ ...perfectSignals, security: 74, compliance: 89 });
    const m = buildQualityGateMatrix(agg);
    const sec = m.rows.find((r) => r.key === 'security')!;
    const comp = m.rows.find((r) => r.key === 'compliance')!;
    expect(sec.verdict).toBe('FAIL');
    expect(comp.verdict).toBe('WARN');
  });

  it('validator flags missing and low domains', () => {
    const v = validateEvidence(aggregateEvidence({}));
    expect(v.failCount).toBeGreaterThan(0);
    expect(v.valid).toBe(false);
  });

  it('decision consumes only matrix + validation + aggregate', () => {
    const agg = aggregateEvidence(perfectSignals);
    const val = validateEvidence(agg);
    const mat = buildQualityGateMatrix(agg);
    expect(decideGaFinalState(agg, val, mat).state).toBe('GA');
  });

  it('executive summary is present and non-empty', () => {
    const r = generateCertificationReport(perfectSignals);
    expect(r.executiveSummary.headline).toContain('GENERAL AVAILABILITY');
    expect(r.executiveSummary.bullets.length).toBeGreaterThan(0);
  });

  it('completeness is 0 for empty and 100 for full signals', () => {
    expect(aggregateEvidence({}).completeness).toBe(0);
    expect(aggregateEvidence(perfectSignals).completeness).toBe(100);
  });

  it('is deterministic across calls', () => {
    const a = generateCertificationReport(perfectSignals);
    const b = generateCertificationReport(perfectSignals);
    expect(a.decision).toEqual(b.decision);
    expect(a.matrix.passCount).toBe(b.matrix.passCount);
  });

  it('handles partial signals without throwing', () => {
    const r = generateCertificationReport({ security: 90, coverage: 80 });
    expect(['NOT_READY', 'RC', 'GA']).toContain(r.decision.state);
  });
});
