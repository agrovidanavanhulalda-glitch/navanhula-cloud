import { describe, it, expect } from 'vitest';
import { normalizeSignal, normalizeRatio, normalizeBoolean, normalizePercent } from './qualityNormalization';
import { deriveEvidence } from './gaEvidenceEngine';
import { computeEnterpriseScoreV3 } from './enterpriseScoreV3';
import { evaluateReleaseReadinessV2 } from './releaseReadinessV2';
import { certifyV2 } from './enterpriseCertificationV2';
import { decideDeployment } from './deploymentDecision';
import { decideRelease } from './releaseDecisionEngine';
import { auditRelease } from './releaseAuditEngine';
import { recommendReleaseActions } from './releaseRecommendationEngine';
import { buildExecutiveSummary } from './releaseExecutiveSummary';
import { evaluateQualityGate } from './qualityGateEngine';

const allGood = {
  typecheckClean: true, testsGreen: true, zeroRegressions: true, readOnly: true,
  darkModeSafe: true, mobileFirst: true, semanticTokens: true,
  backwardCompatible: true, protectedModulesUntouched: true, consultiveOnly: true,
};

const perfectSignals = {
  typecheck: true, vitest: { passed: 420, total: 420 }, coverage: 100,
  security: 100, architecture: 100, observability: 100, performance: 100,
  scalability: 100, governance: 100, compliance: 100, agentic: 100,
  businessContinuity: 100, digitalTwin: 100, releaseChecklist: { passed: 8, total: 8 },
  qualityGates: { passed: 10, total: 10 }, operations: 100, transformation: 100,
  strategy: 100, knowledge: 100, decision: 100, simulation: 100, documentation: 100,
};

describe('Sprint 5.6.2 · Enterprise GA Calibration', () => {
  it('normalization clamps NaN/Infinity/null/undefined', () => {
    expect(normalizeSignal(null)).toBe(0);
    expect(normalizeSignal(undefined)).toBe(0);
    expect(normalizeSignal(NaN)).toBe(0);
    expect(normalizeSignal(Infinity)).toBe(100);
    expect(normalizeSignal(-Infinity)).toBe(0);
    expect(normalizeSignal(-50)).toBe(0);
    expect(normalizeSignal(500)).toBe(100);
    expect(normalizeBoolean(true)).toBe(100);
    expect(normalizeBoolean(false)).toBe(0);
    expect(normalizeRatio(0, 0)).toBe(0);
    expect(normalizeRatio(4, 8)).toBe(50);
    expect(normalizePercent(NaN)).toBe(0);
  });

  it('empty dataset yields deterministic zeros', () => {
    const a = computeEnterpriseScoreV3(deriveEvidence());
    const b = computeEnterpriseScoreV3(deriveEvidence());
    expect(a).toEqual(b);
    expect(a.enterpriseScore).toBe(0);
    expect(a.minSignal).toBe(0);
    expect(a.maxSignal).toBe(0);
  });

  it('perfect signals yield GA and A+', () => {
    const evidence = deriveEvidence(perfectSignals);
    const score = computeEnterpriseScoreV3(evidence);
    const readiness = evaluateReleaseReadinessV2(score);
    const cert = certifyV2(score.enterpriseScore, readiness.gaEligible);
    const gate = evaluateQualityGate(allGood);
    const deploy = decideDeployment(readiness, gate);
    const decision = decideRelease(score, readiness, deploy);
    expect(score.enterpriseScore).toBe(100);
    expect(readiness.gaEligible).toBe(true);
    expect(cert.certification).toBe('Enterprise GA');
    expect(cert.grade).toBe('A+');
    expect(deploy.deployable).toBe(true);
    expect(decision.verdict).toBe('GO');
  });

  it('classifies grade transitions at boundaries', () => {
    expect(certifyV2(0, false).grade).toBe('F');
    expect(certifyV2(50, false).grade).toBe('D');
    expect(certifyV2(65, false).grade).toBe('C');
    expect(certifyV2(78, false).grade).toBe('B');
    expect(certifyV2(88, false).grade).toBe('A');
    expect(certifyV2(95, false).grade).toBe('A+');
  });

  it('classifies certification transitions', () => {
    expect(certifyV2(0, false).certification).toBe('Bronze');
    expect(certifyV2(65, false).certification).toBe('Silver');
    expect(certifyV2(74, false).certification).toBe('Gold');
    expect(certifyV2(82, false).certification).toBe('Platinum');
    expect(certifyV2(88, false).certification).toBe('Enterprise');
    expect(certifyV2(92, false).certification).toBe('Enterprise Certified');
    expect(certifyV2(50, true).certification).toBe('Enterprise GA');
  });

  it('release decisions: GO / CONDITIONAL_GO / NO_GO', () => {
    const empty = computeEnterpriseScoreV3(deriveEvidence());
    const emptyReadiness = evaluateReleaseReadinessV2(empty);
    const gate = evaluateQualityGate({});
    const dep = decideDeployment(emptyReadiness, gate);
    expect(decideRelease(empty, emptyReadiness, dep).verdict).toBe('NO_GO');

    const perfect = computeEnterpriseScoreV3(deriveEvidence(perfectSignals));
    const pr = evaluateReleaseReadinessV2(perfect);
    const pg = evaluateQualityGate(allGood);
    const pd = decideDeployment(pr, pg);
    expect(decideRelease(perfect, pr, pd).verdict).toBe('GO');
  });

  it('is deterministic', () => {
    const input = { security: 90, architecture: 85, testing: { passed: 400, total: 420 } };
    const a = computeEnterpriseScoreV3(deriveEvidence(input));
    const b = computeEnterpriseScoreV3(deriveEvidence(input));
    expect(a).toEqual(b);
  });

  it('audit sums equal enterprise score (± rounding)', () => {
    const score = computeEnterpriseScoreV3(deriveEvidence(perfectSignals));
    const readiness = evaluateReleaseReadinessV2(score);
    const audit = auditRelease(score, readiness);
    expect(Math.round(audit.totalContribution)).toBe(score.enterpriseScore);
  });

  it('recommendations empty when everything passes', () => {
    const score = computeEnterpriseScoreV3(deriveEvidence(perfectSignals));
    const readiness = evaluateReleaseReadinessV2(score);
    expect(recommendReleaseActions(readiness).length).toBe(0);
  });

  it('executive summary reflects verdict', () => {
    const score = computeEnterpriseScoreV3(deriveEvidence(perfectSignals));
    const readiness = evaluateReleaseReadinessV2(score);
    const cert = certifyV2(score.enterpriseScore, readiness.gaEligible);
    const gate = evaluateQualityGate(allGood);
    const dep = decideDeployment(readiness, gate);
    const dec = decideRelease(score, readiness, dep);
    const sum = buildExecutiveSummary(score, readiness, dep, dec, cert);
    expect(sum.verdict).toBe('GO');
    expect(sum.headline).toContain('Enterprise GA');
  });

  it('boundary min/max signals correct', () => {
    const min = computeEnterpriseScoreV3(deriveEvidence({ security: 0 }));
    expect(min.minSignal).toBe(0);
    expect(min.maxSignal).toBe(0);
    const max = computeEnterpriseScoreV3(deriveEvidence(perfectSignals));
    expect(max.minSignal).toBe(100);
    expect(max.maxSignal).toBe(100);
  });
});
