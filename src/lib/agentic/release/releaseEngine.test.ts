import { describe, it, expect } from 'vitest';
import { computeGAScore } from './gaScoreEngine';
import { evaluateQualityGate } from './qualityGateEngine';
import { computeEnterpriseMaturity } from './enterpriseMaturityEngine';
import { computeRelease } from './releaseEngine';
import { generateReleaseNotes } from './releaseNotesEngine';

describe('Sprint 5.6 · Release Engine (pure)', () => {
  it('handles empty input deterministically', () => {
    const a = computeRelease();
    const b = computeRelease();
    expect(a).toEqual(b);
    expect(a.score.overall).toBe(0);
    expect(a.status).toBe('ALPHA');
    expect(a.summary.verdict).toBe('NO_GO');
  });

  it('handles null / undefined / NaN / Infinity in score input', () => {
    const s = computeGAScore({
      architecture: NaN, security: Infinity, performance: -Infinity,
      observability: undefined, compliance: null as unknown as number,
    });
    expect(s.overall).toBeGreaterThanOrEqual(0);
    expect(s.overall).toBeLessThanOrEqual(100);
    expect(s.dimensions.security).toBe(0);
  });

  it('clamps to min/max boundaries', () => {
    expect(computeGAScore({ architecture: -50 }).dimensions.architecture).toBe(0);
    expect(computeGAScore({ architecture: 500 }).dimensions.architecture).toBe(100);
  });

  it('assigns A+ grade when all dimensions are 100', () => {
    const perfect: Record<string, number> = {};
    ['architecture','security','performance','observability','compliance','governance','continuity','digitalTwin','aiEnterprise','operations','transformation','risk','decision','knowledge','simulation','strategy','policy','capability','executiveAnalytics','testing','recovery']
      .forEach((k) => { perfect[k] = 100; });
    const s = computeGAScore(perfect);
    expect(s.overall).toBe(100);
    expect(s.grade).toBe('A+');
  });

  it('quality gate passes only when every check is true', () => {
    const allTrue = {
      typecheckClean: true, testsGreen: true, zeroRegressions: true, readOnly: true,
      darkModeSafe: true, mobileFirst: true, semanticTokens: true,
      backwardCompatible: true, protectedModulesUntouched: true, consultiveOnly: true,
    };
    expect(evaluateQualityGate(allTrue).passed).toBe(true);
    expect(evaluateQualityGate({ ...allTrue, testsGreen: false }).passed).toBe(false);
    expect(evaluateQualityGate({}).passed).toBe(false);
  });

  it('classifies maturity levels correctly', () => {
    expect(computeEnterpriseMaturity(0).level).toBe('FOUNDATION');
    expect(computeEnterpriseMaturity(55).level).toBe('GROWTH');
    expect(computeEnterpriseMaturity(70).level).toBe('SCALE');
    expect(computeEnterpriseMaturity(80).level).toBe('ENTERPRISE');
    expect(computeEnterpriseMaturity(90).level).toBe('WORLD_CLASS');
    expect(computeEnterpriseMaturity(97).level).toBe('AAA_ENTERPRISE');
  });

  it('produces GA status when gate + perfect score', () => {
    const r = computeRelease({
      score: Object.fromEntries(
        ['architecture','security','performance','observability','compliance','governance','continuity','digitalTwin','aiEnterprise','operations','transformation','risk','decision','knowledge','simulation','strategy','policy','capability','executiveAnalytics','testing','recovery'].map((k) => [k, 100]),
      ),
      gate: {
        typecheckClean: true, testsGreen: true, zeroRegressions: true, readOnly: true,
        darkModeSafe: true, mobileFirst: true, semanticTokens: true,
        backwardCompatible: true, protectedModulesUntouched: true, consultiveOnly: true,
      },
    });
    expect(r.status).toBe('GA');
    expect(r.summary.verdict).toBe('GO');
    expect(r.deployment.deployable).toBe(true);
    expect(r.certifications.allCertified).toBe(true);
  });

  it('release notes are deterministic and cover timelines', () => {
    const n1 = generateReleaseNotes('GA-1.0.0', 0);
    const n2 = generateReleaseNotes('GA-1.0.0', 0);
    expect(n1).toEqual(n2);
    expect(n1.sprints.length).toBeGreaterThan(0);
    expect(Object.keys(n1.timelines)).toContain('digitalTwin');
  });

  it('multiple sprints reduce to same output for identical input', () => {
    const input = { score: { architecture: 80 }, gate: { typecheckClean: true } };
    expect(computeRelease(input)).toEqual(computeRelease(input));
  });
});
