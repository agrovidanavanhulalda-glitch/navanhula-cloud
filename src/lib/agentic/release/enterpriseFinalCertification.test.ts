import { describe, it, expect } from 'vitest';
import { certifyEnterpriseFinal } from './enterpriseFinalCertification';
import { buildEnterpriseReleaseReport } from './enterpriseReleaseReport';
import { summarizeFinal } from './releaseFinalSummary';
import { computeMaturityV3 } from './enterpriseMaturityV3';
import { collectEvidence } from './releaseEvidenceCollector';
import { buildQualityMatrix } from './enterpriseQualityMatrix';
import { buildGaChecklist } from './gaChecklistEngine';
import { decideGaFinal } from './gaFinalDecision';
import { issueExecutiveCertification } from './executiveCertification';
import { evaluateQualityGate } from './qualityGateEngine';

const goodGate = {
  typecheckClean: true, testsGreen: true, zeroRegressions: true, readOnly: true,
  darkModeSafe: true, mobileFirst: true, semanticTokens: true,
  backwardCompatible: true, protectedModulesUntouched: true, consultiveOnly: true,
};

const perfectSignals = {
  typecheck: true, vitest: { passed: 420, total: 420 }, coverage: 100,
  security: 100, architecture: 100, observability: 100, performance: 100,
  scalability: 100, governance: 100, compliance: 100, agentic: 100,
  businessContinuity: 100, digitalTwin: 100,
  releaseChecklist: { passed: 8, total: 8 }, qualityGates: { passed: 10, total: 10 },
  operations: 100, transformation: 100, strategy: 100, knowledge: 100,
  decision: 100, simulation: 100, documentation: 100,
};

describe('Sprint 5.6.3 · Enterprise GA Final Certification', () => {
  it('empty / null / undefined dataset is deterministic and NO_GO', () => {
    const a = certifyEnterpriseFinal();
    const b = certifyEnterpriseFinal({ signals: undefined, gate: undefined });
    expect(a).toEqual(b);
    expect(a.decision.status).toBe('RC');
    expect(a.decision.deployment).toBe('CONDITIONAL_GO');
  });

  it('clamps NaN / Infinity in signals', () => {
    const r = certifyEnterpriseFinal({
      signals: { security: NaN, architecture: Infinity, performance: -Infinity },
    });
    expect(r.evidence.score.enterpriseScore).toBeGreaterThanOrEqual(0);
    expect(r.evidence.score.enterpriseScore).toBeLessThanOrEqual(100);
  });

  it('perfect signals + gates → GA_CERTIFIED / GO / A+', () => {
    const r = certifyEnterpriseFinal({ signals: perfectSignals, gate: goodGate });
    expect(r.decision.status).toBe('GA_CERTIFIED');
    expect(r.decision.deployment).toBe('GO');
    expect(r.certification.label).toBe('ENTERPRISE GENERAL AVAILABILITY');
    expect(r.certification.grade).toBe('A+');
    expect(r.checklist.allPassed).toBe(true);
  });

  it('boundary: score at 91 → RC', () => {
    const s91 = Object.fromEntries(Object.keys(perfectSignals).map((k) => [k, 91]));
    const r = certifyEnterpriseFinal({ signals: s91 as never, gate: goodGate });
    expect(r.decision.status).toBe('RC');
  });

  it('maturity boundaries', () => {
    expect(computeMaturityV3(0).level).toBe('FOUNDATION');
    expect(computeMaturityV3(50).level).toBe('GROWTH');
    expect(computeMaturityV3(70).level).toBe('SCALE');
    expect(computeMaturityV3(80).level).toBe('ENTERPRISE');
    expect(computeMaturityV3(90).level).toBe('WORLD_CLASS');
    expect(computeMaturityV3(95).level).toBe('AAA_ENTERPRISE');
  });

  it('flat report exposes derived scores', () => {
    const r = certifyEnterpriseFinal({ signals: perfectSignals, gate: goodGate });
    const flat = buildEnterpriseReleaseReport(r);
    expect(flat.status).toBe('GA_CERTIFIED');
    expect(flat.certification).toBe('ENTERPRISE GENERAL AVAILABILITY');
    expect(flat.grade).toBe('A+');
    expect(flat.scores.enterprise).toBe(100);
    expect(flat.scores.testing).toBe(100);
    expect(flat.scores.security).toBe(100);
  });

  it('summary reflects final decision', () => {
    const perfect = certifyEnterpriseFinal({ signals: perfectSignals, gate: goodGate });
    expect(summarizeFinal(perfect).verdict).toBe('GO');
    expect(summarizeFinal(perfect).headline).toContain('GA CERTIFIED');
    const empty = certifyEnterpriseFinal();
    expect(summarizeFinal(empty).verdict).toBe('CONDITIONAL_GO');
  });

  it('quality matrix classifies statuses', () => {
    const bundle = collectEvidence(perfectSignals);
    const m = buildQualityMatrix(bundle.score);
    expect(m.strongCount).toBeGreaterThan(0);
    expect(m.criticalCount).toBe(0);
  });

  it('checklist / decision transitions', () => {
    const perfect = collectEvidence(perfectSignals);
    const cl = buildGaChecklist(perfect.score, evaluateQualityGate(goodGate));
    expect(decideGaFinal(cl).status).toBe('GA_CERTIFIED');
    const empty = collectEvidence();
    const cl2 = buildGaChecklist(empty.score, evaluateQualityGate({}));
    expect(decideGaFinal(cl2).status).toBe('RC');
  });

  it('executive certification transitions', () => {
    const empty = collectEvidence();
    const dec = decideGaFinal(buildGaChecklist(empty.score, evaluateQualityGate({})));
    expect(issueExecutiveCertification(empty.score, dec).label).toBe('ENTERPRISE ALPHA');
    const perfect = collectEvidence(perfectSignals);
    const dec2 = decideGaFinal(buildGaChecklist(perfect.score, evaluateQualityGate(goodGate)));
    expect(issueExecutiveCertification(perfect.score, dec2).label).toBe('ENTERPRISE GENERAL AVAILABILITY');
  });

  it('is deterministic', () => {
    const input = { signals: perfectSignals, gate: goodGate };
    expect(certifyEnterpriseFinal(input)).toEqual(certifyEnterpriseFinal(input));
  });
});
