import { describe, it, expect } from 'vitest';
import { collectCustomerEvidence } from './customerEvidenceCollector';
import { aggregateCustomerEvidence } from './customerEvidenceAggregator';
import { evaluateCustomerQualityGate } from './customerQualityGate';
import { buildCertificationMatrix } from './customerCertificationMatrix';
import { computeCustomerReadiness } from './customerReadinessEngine';
import { decideCustomerGa } from './customerGaDecision';
import { certifyCustomerRelease } from './customerCertificationEngine';
import { issueExecutiveCertification } from './customerExecutiveCertification';
import { summarizeCustomerRelease } from './customerReleaseSummary';
import { buildCustomerReleaseReport } from './customerReleaseReport';
import { assessCustomerRelease } from './customerReleaseAggregator';

const FULL = {
  customerSuccessScore: 92,
  customerHealthScore: 90,
  journeyScore: 88,
  feedbackScore: 87,
  supportScore: 91,
  renewalScore: 93,
  customer360Score: 94,
};
const MID = {
  customerSuccessScore: 70,
  customerHealthScore: 65,
  journeyScore: 68,
  feedbackScore: 72,
  supportScore: 66,
  renewalScore: 71,
  customer360Score: 74,
};

describe('Sprint 7.6 · Customer Release', () => {
  it('empty dataset returns zeros', () => {
    const c = collectCustomerEvidence({});
    expect(c.presentCount).toBe(0);
    expect(c.completeness).toBe(0);
  });

  it('collector marks partial evidence', () => {
    const c = collectCustomerEvidence({ customerSuccessScore: 80 });
    expect(c.presentCount).toBe(1);
    expect(c.present.customerSuccessScore).toBe(true);
  });

  it('collector clamps out-of-range values', () => {
    const c = collectCustomerEvidence({ customerSuccessScore: 500 });
    expect(c.values.customerSuccessScore).toBe(100);
  });

  it('handles NaN', () => {
    const c = collectCustomerEvidence({ journeyScore: NaN });
    expect(c.present.journeyScore).toBe(false);
    expect(c.values.journeyScore).toBe(0);
  });

  it('handles Infinity', () => {
    const c = collectCustomerEvidence({ supportScore: Infinity });
    expect(c.present.supportScore).toBe(false);
  });

  it('handles undefined and null', () => {
    const c = collectCustomerEvidence({ feedbackScore: undefined, renewalScore: null as unknown as number });
    expect(c.present.feedbackScore).toBe(false);
    expect(c.present.renewalScore).toBe(false);
  });

  it('aggregator computes overall and weighted', () => {
    const a = aggregateCustomerEvidence(FULL);
    expect(a.overall).toBeGreaterThan(80);
    expect(a.weighted).toBeGreaterThan(80);
  });

  it('aggregator min score is 0 on empty', () => {
    expect(aggregateCustomerEvidence({}).weighted).toBe(0);
  });

  it('aggregator max score approaches 100 at maxed input', () => {
    const maxed = Object.fromEntries(Object.keys(FULL).map((k) => [k, 100]));
    expect(aggregateCustomerEvidence(maxed).weighted).toBeGreaterThanOrEqual(99);
  });

  it('quality gate FAIL when incomplete', () => {
    expect(evaluateCustomerQualityGate({}).status).toBe('FAIL');
  });

  it('quality gate PASS when full and high', () => {
    expect(evaluateCustomerQualityGate(FULL).status).toBe('PASS');
  });

  it('quality gate reports warnings for mid scores', () => {
    const r = evaluateCustomerQualityGate(MID);
    expect(r.warnings + r.passes).toBeGreaterThan(0);
  });

  it('gate reports failures count', () => {
    const r = evaluateCustomerQualityGate({ customerSuccessScore: 10 });
    expect(r.failures).toBeGreaterThan(0);
  });

  it('matrix classification produces cells', () => {
    const m = buildCertificationMatrix(FULL);
    expect(m.cells.length).toBe(7);
    expect(m.readyCount).toBeGreaterThan(0);
  });

  it('matrix flags missing evidence', () => {
    const m = buildCertificationMatrix({});
    expect(m.missingCount).toBe(7);
  });

  it('readiness engine returns bounded values', () => {
    const r = computeCustomerReadiness(FULL);
    expect(r.production).toBeLessThanOrEqual(100);
    expect(r.production).toBeGreaterThanOrEqual(0);
  });

  it('readiness zero on empty', () => {
    expect(computeCustomerReadiness({}).production).toBe(0);
  });

  it('GA decision NOT_READY on empty', () => {
    expect(decideCustomerGa({}).status).toBe('NOT_READY');
  });

  it('GA decision GA on full high scores', () => {
    expect(decideCustomerGa(FULL).status).toBe('GENERAL_AVAILABILITY');
  });

  it('GA decision RELEASE_CANDIDATE on mid scores', () => {
    expect(decideCustomerGa(MID).status).toBe('RELEASE_CANDIDATE');
  });

  it('certification NONE when failing', () => {
    expect(certifyCustomerRelease({}).level).toBe('NONE');
  });

  it('certification PLATINUM on top scores', () => {
    expect(certifyCustomerRelease(FULL).level).toBe('PLATINUM');
  });

  it('executive certification headline reflects GA', () => {
    expect(issueExecutiveCertification(FULL).headline).toMatch(/GA/);
  });

  it('summary lists strengths on high scores', () => {
    expect(summarizeCustomerRelease(FULL).strengths.length).toBeGreaterThan(0);
  });

  it('summary lists weaknesses on empty', () => {
    expect(summarizeCustomerRelease({}).weaknesses.length).toBeGreaterThan(0);
  });

  it('report builds checklist with 6 items', () => {
    const r = buildCustomerReleaseReport(FULL);
    expect(r.checklist.length).toBe(6);
    expect(r.checklist.every((c) => c.ok)).toBe(true);
  });

  it('report on empty has all checklist items failing', () => {
    const r = buildCustomerReleaseReport({});
    expect(r.checklist.every((c) => !c.ok)).toBe(true);
  });

  it('aggregator is deterministic', () => {
    const a1 = assessCustomerRelease(FULL, 0);
    const a2 = assessCustomerRelease(FULL, 0);
    expect(a1).toEqual(a2);
  });

  it('aggregator generatedAt uses provided now', () => {
    const a = assessCustomerRelease({}, 0);
    expect(a.generatedAt).toBe(new Date(0).toISOString());
  });
});
