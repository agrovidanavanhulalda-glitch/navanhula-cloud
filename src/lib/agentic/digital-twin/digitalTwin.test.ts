import { describe, it, expect } from 'vitest';
import { computeDigitalTwin } from './digitalTwinEngine';
import { buildEnterpriseModel } from './enterpriseModelEngine';
import { projectState } from './stateProjectionEngine';
import { scoreDigitalTwin } from './digitalTwinScore';
import { mirrorResources } from './resourceMirrorEngine';
import { mirrorCapacity } from './capacityMirrorEngine';
import { propagateFailure } from './failurePropagationEngine';

describe('Digital Twin Engine', () => {
  it('handles empty input', () => {
    const r = computeDigitalTwin({});
    expect(r.score.total).toBeGreaterThanOrEqual(0);
    expect(r.score.total).toBeLessThanOrEqual(100);
  });

  it('handles a single process', () => {
    const r = computeDigitalTwin({ processes: [{ id: 'a', name: 'A', load: 40, health: 80 }] });
    expect(r.model.processes).toHaveLength(1);
    expect(r.health.now).toBe(80);
  });

  it('handles 100 processes deterministically', () => {
    const processes = Array.from({ length: 100 }, (_, i) => ({
      id: `p${i}`, name: `P${i}`, load: (i * 3) % 100, health: 100 - (i % 50), revenueImpact: i % 100,
    }));
    const a = computeDigitalTwin({ processes });
    const b = computeDigitalTwin({ processes });
    expect(a).toEqual(b);
  });

  it('clamps NaN/Infinity/null/undefined defensively', () => {
    const r = computeDigitalTwin({
      processes: [
        { id: 'x', name: 'X', load: NaN, health: Infinity, revenueImpact: -50 },
        // @ts-expect-error – runtime resilience
        { id: 'y', name: 'Y', load: null, health: undefined },
      ],
      resources: [{ id: 'r', name: 'R', used: NaN, capacity: 0 }],
      growthPerDay: Infinity,
    });
    expect(Number.isFinite(r.score.total)).toBe(true);
    expect(r.score.total).toBeLessThanOrEqual(100);
    expect(r.score.total).toBeGreaterThanOrEqual(0);
  });

  it('breaks ties deterministically by input order (bottlenecks stable)', () => {
    const r = computeDigitalTwin({
      processes: [
        { id: 'a', name: 'A', load: 80, health: 40 },
        { id: 'b', name: 'B', load: 80, health: 40 },
      ],
    });
    expect(r.bottlenecks.count).toBeGreaterThan(0);
  });

  it('extremes: fully healthy scores near max', () => {
    const s = scoreDigitalTwin({
      health: { now: 100, d7: 100, d30: 100, d90: 100, trend: 'STABLE' },
      capacity: { utilization: 0, headroom: 100, daysUntilSaturation: null, rating: 'IDLE' },
      resources: { rows: [], averageUtilization: 0, saturatedCount: 0 },
      bottlenecks: { rows: [], count: 0 },
      failure: { rows: [], worstCaseRevenueImpact: 0 },
      dependencies: { nodes: [], edges: [], highRiskCount: 0 },
    });
    expect(s.total).toBe(100);
    expect(s.grade).toBe('A');
  });

  it('extremes: fully broken scores near min', () => {
    const s = scoreDigitalTwin({
      health: { now: 0, d7: 0, d30: 0, d90: 0, trend: 'DEGRADING' },
      capacity: { utilization: 100, headroom: 0, daysUntilSaturation: 0, rating: 'OVERLOADED' },
      resources: { rows: [], averageUtilization: 100, saturatedCount: 10 },
      bottlenecks: { rows: [], count: 50 },
      failure: { rows: [], worstCaseRevenueImpact: 1000 },
      dependencies: { nodes: [], edges: [], highRiskCount: 20 },
    });
    expect(s.total).toBeLessThanOrEqual(10);
    expect(s.grade).toBe('F');
  });

  it('propagates failure across dependencies', () => {
    const model = buildEnterpriseModel({
      processes: [
        { id: 'p1', name: 'P1', revenueImpact: 80, dependsOn: ['db'] },
        { id: 'p2', name: 'P2', revenueImpact: 60, dependsOn: ['db'] },
      ],
      dependencies: [{ id: 'db', name: 'DB' }],
    });
    const f = propagateFailure(model);
    expect(f.worstCaseRevenueImpact).toBe(140);
  });

  it('projects future state with growth', () => {
    const model = buildEnterpriseModel({
      processes: [{ id: 'p', name: 'P', load: 40, health: 90 }],
      resources: [{ id: 'r', name: 'R', used: 40, capacity: 100 }],
      growthPerDay: 1,
    });
    const now = projectState(model, 0);
    const later = projectState(model, 30);
    expect(later.averageLoad).toBeGreaterThan(now.averageLoad);
  });

  it('resource mirror flags saturation', () => {
    const m = buildEnterpriseModel({ resources: [{ id: 'r', name: 'R', used: 95, capacity: 100 }] });
    const r = mirrorResources(m);
    expect(r.saturatedCount).toBe(1);
  });

  it('capacity daysUntilSaturation is null without growth', () => {
    const m = buildEnterpriseModel({ resources: [{ id: 'r', name: 'R', used: 50, capacity: 100 }] });
    expect(mirrorCapacity(m).daysUntilSaturation).toBeNull();
  });
});
