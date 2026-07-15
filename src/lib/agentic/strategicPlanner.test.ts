/**
 * Sprint 4.7 · Strategic Planner tests.
 */
import { describe, it, expect } from 'vitest';
import { buildStrategicReport } from './strategicPlanner';
import { buildDependencyGraph } from './dependencyGraph';
import { rankPriorities } from './priorityMatrix';
import { planResources } from './resourcePlanner';

describe('strategicPlanner', () => {
  it('handles empty input', () => {
    const r = buildStrategicReport();
    expect(r.objectives.length).toBeGreaterThan(0);
    expect(r.score.score).toBeGreaterThanOrEqual(0);
    expect(r.status).toBe('DRAFT');
  });

  it('handles NaN/Infinity/null/undefined safely', () => {
    const r = buildStrategicReport({
      opsHealth: NaN,
      enterpriseScore: Infinity,
      storageUsagePct: -50,
      knowledgeScore: undefined as unknown as number,
      policyScore: null as unknown as number,
      simulationScore: 200,
      executionReadiness: NaN,
      teamCapacity: Infinity,
    });
    expect(r.score.score).toBeGreaterThanOrEqual(0);
    expect(r.score.score).toBeLessThanOrEqual(100);
  });

  it('produces deterministic output for identical input', () => {
    const a = buildStrategicReport({ opsHealth: 80, enterpriseScore: 90, policyScore: 85, knowledgeScore: 70, simulationScore: 60, executionReadiness: 75, teamCapacity: 80 });
    const b = buildStrategicReport({ opsHealth: 80, enterpriseScore: 90, policyScore: 85, knowledgeScore: 70, simulationScore: 60, executionReadiness: 75, teamCapacity: 80 });
    expect(a.score).toEqual(b.score);
    expect(a.priorities.map(p => p.id)).toEqual(b.priorities.map(p => p.id));
  });

  it('reaches minimum score when all signals are 0', () => {
    const r = buildStrategicReport({ opsHealth: 0, enterpriseScore: 0, policyScore: 0, knowledgeScore: 0, simulationScore: 0, executionReadiness: 0, teamCapacity: 0 });
    expect(r.score.score).toBeGreaterThanOrEqual(0);
    expect(r.score.score).toBeLessThan(60);
  });

  it('reaches enterprise rating when all signals are max', () => {
    const r = buildStrategicReport({ opsHealth: 100, enterpriseScore: 100, policyScore: 100, knowledgeScore: 100, simulationScore: 100, executionReadiness: 100, teamCapacity: 100, storageUsagePct: 10 });
    expect(r.score.score).toBeGreaterThanOrEqual(75);
  });
});

describe('priorityMatrix', () => {
  it('breaks ties deterministically by id', () => {
    const items = rankPriorities([
      { id: 'a', objectiveId: 'o', title: 't', effort: 5, impact: 5, risk: 5, confidence: 60, dependsOn: [] },
      { id: 'b', objectiveId: 'o', title: 't', effort: 5, impact: 5, risk: 5, confidence: 60, dependsOn: [] },
    ]);
    expect(items[0].id).toBe('a');
  });
});

describe('dependencyGraph', () => {
  it('detects circular dependencies', () => {
    const g = buildDependencyGraph([
      { id: 'x', objectiveId: 'o', title: 't', effort: 3, impact: 5, risk: 2, confidence: 70, dependsOn: ['y'] },
      { id: 'y', objectiveId: 'o', title: 't', effort: 3, impact: 5, risk: 2, confidence: 70, dependsOn: ['x'] },
    ]);
    expect(g.hasCycle).toBe(true);
    expect(g.topoOrder).toEqual([]);
  });

  it('produces topo order for acyclic graph', () => {
    const g = buildDependencyGraph([
      { id: 'a', objectiveId: 'o', title: 't', effort: 3, impact: 5, risk: 2, confidence: 70, dependsOn: [] },
      { id: 'b', objectiveId: 'o', title: 't', effort: 3, impact: 5, risk: 2, confidence: 70, dependsOn: ['a'] },
    ]);
    expect(g.hasCycle).toBe(false);
    expect(g.topoOrder.indexOf('a')).toBeLessThan(g.topoOrder.indexOf('b'));
  });

  it('ignores unknown dependencies', () => {
    const g = buildDependencyGraph([
      { id: 'a', objectiveId: 'o', title: 't', effort: 3, impact: 5, risk: 2, confidence: 70, dependsOn: ['ghost'] },
    ]);
    expect(g.hasCycle).toBe(false);
    expect(g.edges.length).toBe(0);
  });
});

describe('resourcePlanner', () => {
  it('handles zero capacity', () => {
    const p = planResources(
      [{ id: 'a', objectiveId: 'o', title: 't', effort: 5, impact: 5, risk: 2, confidence: 70, dependsOn: [] }],
      0,
    );
    expect(p.scheduled).toEqual([]);
    expect(p.deferred).toEqual(['a']);
    expect(p.overloaded).toBe(true);
  });

  it('handles empty initiatives', () => {
    const p = planResources([], 100);
    expect(p.totalEffort).toBe(0);
    expect(p.overloaded).toBe(false);
  });

  it('marks overload when effort exceeds capacity', () => {
    const inits = Array.from({ length: 20 }, (_, i) => ({
      id: `i${i}`, objectiveId: 'o', title: 't', effort: 10, impact: 5, risk: 2, confidence: 70, dependsOn: [],
    }));
    const p = planResources(inits, 100);
    expect(p.overloaded).toBe(true);
    expect(p.deferred.length).toBeGreaterThan(0);
  });
});
