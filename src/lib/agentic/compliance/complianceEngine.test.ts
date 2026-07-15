/**
 * Sprint 5.3 · Compliance Intelligence tests.
 */
import { describe, it, expect } from 'vitest';
import { computeComplianceIntelligence } from './complianceEngine';
import { evaluateRule, evaluateRules } from './complianceRuleEngine';
import { computeComplianceScore } from './complianceScoreEngine';
import { computeGaps } from './complianceGapEngine';
import { evaluateControls, summarizeControls } from './controlFrameworkEngine';
import { normalizeFindings, summarizeFindings } from './findingEngine';
import { recommendRemediations } from './remediationEngine';
import { computeTrend } from './complianceTrendEngine';
import { forecastCompliance } from './complianceForecastEngine';
import { buildAuditTrail } from './auditTrailEngine';
import { computeAuditReadiness } from './auditEngine';

const NOW = Date.parse('2026-07-15T00:00:00Z');
const day = 24 * 60 * 60 * 1000;

describe('complianceRuleEngine', () => {
  it('returns NON_COMPLIANT for empty/invalid input', () => {
    expect(evaluateRules([]).length).toBe(0);
    const r = evaluateRule({ id: 'r1', frameworkId: 'iso27001', name: 'X' });
    expect(r.status).toBe('NON_COMPLIANT');
  });
  it('handles null/undefined/NaN/Infinity defensively', () => {
    const r = evaluateRule({
      id: 'r1', frameworkId: 'iso27001', name: 'X',
      implemented: null, evidenceCount: NaN, lastReviewedDaysAgo: Infinity,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1);
  });
  it('is deterministic', () => {
    const a = evaluateRules([{ id: 'r1', frameworkId: 'f', name: 'n', implemented: true, evidenceCount: 3, lastReviewedDaysAgo: 10 }]);
    const b = evaluateRules([{ id: 'r1', frameworkId: 'f', name: 'n', implemented: true, evidenceCount: 3, lastReviewedDaysAgo: 10 }]);
    expect(a).toEqual(b);
  });
});

describe('complianceScoreEngine', () => {
  it('empty dataset yields zero score', () => {
    expect(computeComplianceScore([]).score).toBe(0);
  });
  it('all compliant yields max score', () => {
    const rules = evaluateRules([
      { id: 'a', frameworkId: 'f', name: 'a', implemented: true, evidenceCount: 5, lastReviewedDaysAgo: 10 },
      { id: 'b', frameworkId: 'f', name: 'b', implemented: true, evidenceCount: 5, lastReviewedDaysAgo: 10 },
    ]);
    const s = computeComplianceScore(rules);
    expect(s.score).toBeGreaterThanOrEqual(90);
    expect(s.status).toBe('COMPLIANT');
  });
  it('all non-compliant yields low score', () => {
    const rules = evaluateRules([{ id: 'a', frameworkId: 'f', name: 'a', implemented: false }]);
    expect(computeComplianceScore(rules).status).toBe('NON_COMPLIANT');
  });
});

describe('gap/control/finding engines', () => {
  it('gaps sorted descending', () => {
    const rules = evaluateRules([
      { id: 'a', frameworkId: 'f', name: 'a', implemented: false },
      { id: 'b', frameworkId: 'f', name: 'b', implemented: true, evidenceCount: 2, lastReviewedDaysAgo: 30 },
    ]);
    const g = computeGaps(rules);
    for (let i = 1; i < g.length; i++) expect(g[i - 1].gap).toBeGreaterThanOrEqual(g[i].gap);
  });
  it('controls: empty returns zeros', () => {
    expect(summarizeControls(evaluateControls([]))).toEqual({ healthy: 0, warning: 0, failed: 0, total: 0 });
  });
  it('controls handle negative/NaN', () => {
    const c = evaluateControls([{ id: 'c1', name: 'c1', failuresLast30d: -5, totalRunsLast30d: NaN }]);
    expect(c[0].failureRate).toBe(0);
    expect(c[0].health).toBe('HEALTHY');
  });
  it('findings sort by severity rank', () => {
    const f = normalizeFindings([
      { id: 'a', title: 'a', severity: 'LOW' },
      { id: 'b', title: 'b', severity: 'CRITICAL' },
    ]);
    expect(f[0].severity).toBe('CRITICAL');
    expect(summarizeFindings(f).critical).toBe(1);
  });
});

describe('remediationEngine', () => {
  it('empty inputs yield empty list', () => {
    expect(recommendRemediations([], [])).toEqual([]);
  });
  it('critical findings become P1', () => {
    const f = normalizeFindings([{ id: 'x', title: 'x', severity: 'CRITICAL' }]);
    const recs = recommendRemediations([], f);
    expect(recs[0].priority).toBe('P1');
  });
});

describe('trend/forecast engines', () => {
  it('empty snapshots yields zero-sample trend and flat forecast', () => {
    expect(computeTrend([], NOW).every((t) => t.samples === 0)).toBe(true);
    expect(forecastCompliance([], NOW).every((f) => f.projected === 0 && f.confidence === 0)).toBe(true);
  });
  it('single snapshot forecast falls back to last value', () => {
    const f = forecastCompliance([{ at: new Date(NOW).toISOString(), score: 77 }], NOW);
    expect(f[0].projected).toBe(77);
    expect(f[0].confidence).toBe(0);
  });
  it('linear rise projects higher', () => {
    const snaps = Array.from({ length: 10 }, (_, i) => ({
      at: new Date(NOW - (10 - i) * day).toISOString(), score: 50 + i * 2,
    }));
    const f = forecastCompliance(snaps, NOW);
    expect(f[2].projected).toBeGreaterThan(f[0].projected);
  });
  it('clamps NaN/Infinity scores', () => {
    const f = forecastCompliance(
      [
        { at: new Date(NOW - day).toISOString(), score: Number.NaN },
        { at: new Date(NOW).toISOString(), score: Number.POSITIVE_INFINITY },
      ],
      NOW,
    );
    for (const p of f) {
      expect(p.projected).toBeGreaterThanOrEqual(0);
      expect(p.projected).toBeLessThanOrEqual(100);
    }
  });
});

describe('auditTrail + readiness', () => {
  it('sorts trail by timestamp desc', () => {
    const t = buildAuditTrail([
      { id: 'a', at: new Date(NOW - 2 * day).toISOString(), actor: 'x', action: 'y', target: 'z' },
      { id: 'b', at: new Date(NOW).toISOString(), actor: 'x', action: 'y', target: 'z' },
    ]);
    expect(t[0].id).toBe('b');
  });
  it('readiness score bounded 0..100', () => {
    const r = computeAuditReadiness([], [], NOW);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe('computeComplianceIntelligence (integration)', () => {
  it('handles fully empty input deterministically', () => {
    const a = computeComplianceIntelligence({ now: NOW });
    const b = computeComplianceIntelligence({ now: NOW });
    expect(a).toEqual(b);
    expect(a.score.total).toBe(0);
    expect(a.summary.grade).toBe('F');
  });
  it('handles rich input', () => {
    const report = computeComplianceIntelligence({
      now: NOW,
      rules: [
        { id: 'r1', frameworkId: 'iso27001', name: 'Access', implemented: true, evidenceCount: 4, lastReviewedDaysAgo: 20 },
        { id: 'r2', frameworkId: 'gdpr', name: 'DPA', implemented: false, evidenceCount: 0, lastReviewedDaysAgo: 400 },
      ],
      controls: [
        { id: 'c1', name: 'Backup', failuresLast30d: 0, totalRunsLast30d: 30 },
        { id: 'c2', name: 'MFA', failuresLast30d: 5, totalRunsLast30d: 20 },
      ],
      findings: [
        { id: 'f1', title: 'Missing DPA', severity: 'HIGH' },
        { id: 'f2', title: 'Old cert', severity: 'LOW', resolvedAt: new Date(NOW).toISOString() },
      ],
      snapshots: Array.from({ length: 5 }, (_, i) => ({
        at: new Date(NOW - (5 - i) * day).toISOString(), score: 60 + i * 3,
      })),
      trail: [
        { id: 't1', at: new Date(NOW - day).toISOString(), actor: 'auditor', action: 'review', target: 'iso27001' },
      ],
    });
    expect(report.score.total).toBe(2);
    expect(report.gaps.length).toBeGreaterThan(0);
    expect(report.remediations.length).toBeGreaterThan(0);
    expect(report.summary.bullets.length).toBe(4);
  });
});
