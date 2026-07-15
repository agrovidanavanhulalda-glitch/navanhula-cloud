/**
 * Sprint 5.4 · Business Continuity tests.
 */
import { describe, it, expect } from 'vitest';
import { computeBusinessContinuity } from './businessContinuityEngine';
import { analyzeBusinessImpact } from './businessImpactAnalysis';
import { rankCriticalProcesses } from './criticalProcessEngine';
import { computeDependencyImpact } from './dependencyImpactEngine';
import { computeRecoveryObjectives } from './recoveryObjectiveEngine';
import { buildContinuityPlan } from './continuityPlanner';
import { evaluateDisasterScenarios } from './disasterScenarioEngine';
import { simulateRecovery } from './recoverySimulationEngine';
import { computeServiceAvailability } from './serviceAvailabilityEngine';
import { planFailover } from './failoverPlanner';
import { computeResilience } from './resiliencePlanner';
import { validateBackups } from './backupValidationEngine';
import { computeRecoveryReadiness } from './recoveryReadinessEngine';
import { computeContinuityScore } from './continuityScoreEngine';

describe('BIA', () => {
  it('handles empty/null/undefined', () => {
    expect(analyzeBusinessImpact([])).toEqual([]);
    expect(analyzeBusinessImpact(null as never)).toEqual([]);
    expect(analyzeBusinessImpact(undefined)).toEqual([]);
  });
  it('single item deterministic', () => {
    const a = analyzeBusinessImpact([{ id: 'p1', name: 'POS', criticality: 100, revenueImpact: 100, customerImpact: 100, regulatoryImpact: 100 }]);
    const b = analyzeBusinessImpact([{ id: 'p1', name: 'POS', criticality: 100, revenueImpact: 100, customerImpact: 100, regulatoryImpact: 100 }]);
    expect(a).toEqual(b);
    expect(a[0].tier).toBe('TIER_1');
  });
  it('defends against NaN/Infinity/negatives', () => {
    const rows = analyzeBusinessImpact([
      { id: 'x', criticality: NaN, revenueImpact: Infinity, customerImpact: -50 },
    ]);
    expect(rows[0].impactScore).toBeGreaterThanOrEqual(0);
    expect(rows[0].impactScore).toBeLessThanOrEqual(100);
  });
  it('tie-breaks alphabetically by id', () => {
    const rows = analyzeBusinessImpact([
      { id: 'b', criticality: 50 }, { id: 'a', criticality: 50 },
    ]);
    expect(rows[0].id).toBe('a');
  });
});

describe('critical + dependency + objectives', () => {
  it('critical returns tier1/2 only', () => {
    const bia = analyzeBusinessImpact([
      { id: 'c', criticality: 100 }, { id: 'd', criticality: 10 },
    ]);
    expect(rankCriticalProcesses(bia).every((r) => r.tier === 'TIER_1' || r.tier === 'TIER_2')).toBe(true);
  });
  it('deps empty ok; extremes clamped', () => {
    expect(computeDependencyImpact([]).averageRisk).toBe(0);
    const d = computeDependencyImpact([{ id: 'x', criticality: Infinity, reliability: -5 }]);
    expect(d.rows[0].risk).toBeGreaterThanOrEqual(0);
    expect(d.rows[0].risk).toBeLessThanOrEqual(100);
  });
  it('objectives empty ok', () => {
    expect(computeRecoveryObjectives([]).averageRtoHours).toBe(0);
  });
});

describe('scenarios + simulation', () => {
  it('empty scenarios yields zeros', () => {
    const s = evaluateDisasterScenarios([]);
    expect(s.worst).toBeNull();
    expect(simulateRecovery([], s).worstCaseHours).toBe(0);
  });
  it('extreme disaster ranks worst first', () => {
    const s = evaluateDisasterScenarios([
      { id: 'a', likelihood: 10, severity: 10 },
      { id: 'b', likelihood: 100, severity: 100 },
    ]);
    expect(s.worst?.id).toBe('b');
  });
});

describe('availability + failover + resilience', () => {
  it('empty availability score is 0', () => {
    expect(computeServiceAvailability([]).score).toBe(0);
  });
  it('failover unavailable yields 0', () => {
    expect(planFailover([]).score).toBe(0);
  });
  it('resilience bounded 0..100', () => {
    const r = computeResilience(
      { rows: [], average: 0, breachCount: 0, score: 999 as number },
      { rows: [], score: -50 as number, untestedCount: 0 },
    );
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe('backups + readiness + score', () => {
  it('no backups yields 0', () => {
    expect(validateBackups([]).score).toBe(0);
  });
  it('recovery readiness zero when no objectives', () => {
    expect(computeRecoveryReadiness(
      { rows: [], averageRtoHours: 0, averageRpoHours: 0 },
      { rows: [], score: 0, staleCount: 0 },
      { rows: [], score: 0, untestedCount: 0 },
    ).score).toBe(0);
  });
  it('score min/max bounded', () => {
    const min = computeContinuityScore({ readiness: 0, resilience: 0, availability: 0, backups: 0, scenarios: 100 });
    const max = computeContinuityScore({ readiness: 100, resilience: 100, availability: 100, backups: 100, scenarios: 0 });
    expect(min.total).toBe(0);
    expect(max.total).toBe(100);
    expect(min.status).toBe('AT_RISK');
    expect(max.status).toBe('READY');
  });
});

describe('plan + integration', () => {
  it('plan prioritizes P1 before P3', () => {
    const bia = analyzeBusinessImpact([
      { id: 'x', criticality: 100, revenueImpact: 100, customerImpact: 100, regulatoryImpact: 100 },
      { id: 'y', criticality: 5 },
    ]);
    const plan = buildContinuityPlan(bia, computeDependencyImpact([]));
    expect(plan.actions[0].priority).toBe('P1');
  });
  it('empty end-to-end deterministic', () => {
    const a = computeBusinessContinuity({});
    const b = computeBusinessContinuity({});
    expect(a).toEqual(b);
    expect(a.score.total).toBe(0);
  });
  it('rich end-to-end produces bounded report', () => {
    const r = computeBusinessContinuity({
      processes: [
        { id: 'pos', name: 'POS', criticality: 100, revenueImpact: 100, customerImpact: 90, regulatoryImpact: 60 },
        { id: 'crm', name: 'CRM', criticality: 40, revenueImpact: 30 },
      ],
      dependencies: [{ id: 'stripe', name: 'Stripe', criticality: 90, reliability: 99 }],
      services: [{ id: 'api', name: 'API', uptime: 99.9, slaTarget: 99.5 }],
      scenarios: [{ id: 'aws', name: 'AWS Outage', likelihood: 30, severity: 90, detectability: 60 }],
      failovers: [{ id: 'db', name: 'DB', configured: true, tested: true, automatic: true, failoverTimeMinutes: 5 }],
      backups: [{ id: 'db', name: 'DB', lastBackupHoursAgo: 1, lastRestoreTestDaysAgo: 30, successRate: 100, encrypted: true, offsite: true }],
    });
    expect(r.score.total).toBeGreaterThan(0);
    expect(r.score.total).toBeLessThanOrEqual(100);
    expect(r.critical.length).toBeGreaterThan(0);
    expect(r.summary.bullets.length).toBe(4);
  });
});
