import { describe, it, expect } from 'vitest';
import { normalizeEvidence } from './enterpriseEvidenceEngine';
import { calibrate } from './enterpriseCalibration';
import { classifyGrade, classifyCertification } from './enterpriseGradeEngine';
import { evaluateEnterpriseReadiness } from './enterpriseReadinessEngine';
import { calibrateRelease } from './releaseCalibration';
import { summarizeCalibration } from './releaseSummary';
import { ENTERPRISE_WEIGHTS, EVIDENCE_KEYS, totalWeight } from './enterpriseWeightEngine';

const perfect = Object.fromEntries(EVIDENCE_KEYS.map((k) => [k, 100]));
const goodGate = {
  typecheckClean: true, testsGreen: true, zeroRegressions: true, readOnly: true,
  darkModeSafe: true, mobileFirst: true, semanticTokens: true,
  backwardCompatible: true, protectedModulesUntouched: true, consultiveOnly: true,
};

describe('Sprint 5.6.1 · Enterprise Calibration', () => {
  it('handles empty dataset deterministically', () => {
    const a = calibrateRelease();
    const b = calibrateRelease();
    expect(a).toEqual(b);
    expect(a.calibration.enterpriseScore).toBe(0);
    expect(a.certification).toBe('Bronze');
  });

  it('clamps NaN/Infinity/null/undefined/negative/overflow', () => {
    const r = normalizeEvidence({
      security: NaN, testing: Infinity, architecture: -50, operations: 500,
      compliance: null as unknown as number, governance: undefined,
    });
    expect(r.values.security).toBe(0);
    expect(r.values.testing).toBe(100);
    expect(r.values.architecture).toBe(0);
    expect(r.values.operations).toBe(100);
    expect(r.values.compliance).toBe(0);
    expect(r.values.governance).toBe(0);
  });

  it('weights sum to 100', () => {
    expect(totalWeight()).toBe(100);
    for (const k of EVIDENCE_KEYS) expect(ENTERPRISE_WEIGHTS[k]).toBeGreaterThan(0);
  });

  it('perfect dataset yields Enterprise GA', () => {
    const r = calibrateRelease({ evidence: perfect, gate: goodGate });
    expect(r.calibration.enterpriseScore).toBe(100);
    expect(r.readiness.gaEligible).toBe(true);
    expect(r.readiness.stage).toBe('Enterprise GA');
    expect(r.certification).toBe('Enterprise GA');
    expect(r.grade).toBe('A+');
  });

  it('minimum dataset yields Bronze / NOT READY', () => {
    const r = calibrateRelease({ evidence: Object.fromEntries(EVIDENCE_KEYS.map((k) => [k, 0])) });
    expect(r.calibration.enterpriseScore).toBe(0);
    expect(r.certification).toBe('Bronze');
    expect(r.readiness.stage).toBe('NOT READY');
  });

  it('grade transitions correctly at boundaries', () => {
    expect(classifyGrade(0)).toBe('F');
    expect(classifyGrade(50)).toBe('D');
    expect(classifyGrade(65)).toBe('C');
    expect(classifyGrade(78)).toBe('B');
    expect(classifyGrade(88)).toBe('A');
    expect(classifyGrade(95)).toBe('A+');
  });

  it('certification transitions correctly', () => {
    expect(classifyCertification(0, false)).toBe('Bronze');
    expect(classifyCertification(65, false)).toBe('Silver');
    expect(classifyCertification(74, false)).toBe('Gold');
    expect(classifyCertification(82, false)).toBe('Platinum');
    expect(classifyCertification(88, false)).toBe('Enterprise');
    expect(classifyCertification(92, false)).toBe('Enterprise Certified');
    expect(classifyCertification(50, true)).toBe('Enterprise GA');
  });

  it('boundary 91/92 gates GA correctly', () => {
    const at91 = calibrateRelease({
      evidence: Object.fromEntries(EVIDENCE_KEYS.map((k) => [k, 91])), gate: goodGate,
    });
    expect(at91.readiness.gaEligible).toBe(false);
    const at92 = calibrateRelease({
      evidence: Object.fromEntries(EVIDENCE_KEYS.map((k) => [k, 95])), gate: goodGate,
    });
    expect(at92.readiness.gaEligible).toBe(true);
  });

  it('is deterministic across multiple runs', () => {
    const input = { evidence: { security: 90, testing: 85 }, gate: { typecheckClean: true } };
    expect(calibrateRelease(input)).toEqual(calibrateRelease(input));
  });

  it('summary produces GO/CONDITIONAL_GO/NO_GO', () => {
    expect(summarizeCalibration(calibrateRelease({ evidence: perfect, gate: goodGate })).verdict).toBe('GO');
    expect(summarizeCalibration(calibrateRelease()).verdict).toBe('NO_GO');
    const mid = Object.fromEntries(EVIDENCE_KEYS.map((k) => [k, 80]));
    expect(summarizeCalibration(calibrateRelease({ evidence: mid })).verdict).toBe('CONDITIONAL_GO');
  });

  it('readiness stage covers RC-2/RC-1/RC ranges', () => {
    const ev = normalizeEvidence(Object.fromEntries(EVIDENCE_KEYS.map((k) => [k, 92])));
    const cal = calibrate(ev);
    const rep = evaluateEnterpriseReadiness(ev, cal);
    expect(['Enterprise GA', 'RC-2', 'RC-1', 'RC']).toContain(rep.stage);
  });
});
