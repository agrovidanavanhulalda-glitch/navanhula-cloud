import { describe, it, expect } from 'vitest';
import { normalizeCapabilities, type CapabilityInput } from './businessCapabilityEngine';
import { buildCapabilityMap } from './capabilityMapEngine';
import { analyzeDependencies } from './capabilityDependencyEngine';
import { evaluateCapabilityHealth } from './capabilityHealthEngine';
import { evaluateMaturity } from './capabilityMaturityEngine';
import { analyzeDomains } from './domainEngine';
import { deriveBoundedContexts } from './boundedContextEngine';
import { assessCapabilityRisks } from './capabilityRiskEngine';
import { buildCapabilityRoadmap } from './capabilityRoadmapEngine';
import { computeArchitectureScore } from './architectureScoreEngine';
import { analyzeArchitecture } from './enterpriseArchitectureEngine';
import { buildArchitectureSummary } from './architectureSummaryEngine';

const S: CapabilityInput[] = [
  { id: 'C1', name: 'POS', domain: 'sales', boundedContext: 'sales', maturity: 4, health: 90, criticality: 90, risk: 20 },
  { id: 'C2', name: 'Fiscal', domain: 'finance', boundedContext: 'finance', maturity: 3, health: 70, criticality: 85, risk: 30, dependsOn: ['C1'] },
  { id: 'C3', name: 'Inventory', domain: 'ops', boundedContext: 'ops', maturity: 2, health: 55, criticality: 70, risk: 55, dependsOn: ['C1'] },
];

describe('Sprint 5.0 · Enterprise Architecture', () => {
  it('handles empty', () => {
    expect(normalizeCapabilities([])).toEqual([]);
    expect(buildCapabilityMap([])).toEqual({ domains: [], heatmap: [], total: 0 });
    expect(computeArchitectureScore([]).score).toBe(0);
    expect(analyzeArchitecture([]).capabilities).toEqual([]);
  });

  it('handles single capability', () => {
    const list = normalizeCapabilities([S[0]]);
    expect(list).toHaveLength(1);
    expect(evaluateMaturity(list).avg).toBeGreaterThan(0);
  });

  it('handles multiple capabilities deterministically', () => {
    const a = analyzeArchitecture(S);
    const b = analyzeArchitecture(S);
    expect(a).toEqual(b);
  });

  it('sanitizes NaN, Infinity, undefined, null', () => {
    const bad = [
      { id: 'X', maturity: NaN, health: Infinity, risk: -50, criticality: 999, dependsOn: undefined },
      null,
      { id: undefined },
    ] as unknown as CapabilityInput[];
    const list = normalizeCapabilities(bad);
    expect(list).toHaveLength(1);
    expect(list[0].maturity).toBe(0);
    expect(list[0].health).toBe(100);
    expect(list[0].risk).toBe(0);
    expect(list[0].criticality).toBe(100);
    expect(list[0].dependsOn).toEqual([]);
  });

  it('respects maturity bounds min/max', () => {
    const list = normalizeCapabilities([
      { id: 'lo', maturity: -10 },
      { id: 'hi', maturity: 99 },
    ]);
    expect(list.find((c) => c.id === 'lo')!.maturity).toBe(0);
    expect(list.find((c) => c.id === 'hi')!.maturity).toBe(5);
  });

  it('detects dependencies without cycles', () => {
    const list = normalizeCapabilities(S);
    const dep = analyzeDependencies(list);
    expect(dep.hasCycle).toBe(false);
    expect(dep.topoOrder).toContain('C1');
  });

  it('detects dependency cycles', () => {
    const list = normalizeCapabilities([
      { id: 'A', dependsOn: ['B'] },
      { id: 'B', dependsOn: ['A'] },
    ]);
    const dep = analyzeDependencies(list);
    expect(dep.hasCycle).toBe(true);
    expect(dep.topoOrder).toEqual([]);
  });

  it('groups domains and bounded contexts', () => {
    const list = normalizeCapabilities(S);
    expect(analyzeDomains(list)).toHaveLength(3);
    expect(deriveBoundedContexts(list)).toHaveLength(3);
  });

  it('computes score within bounds', () => {
    const list = normalizeCapabilities(S);
    const s = computeArchitectureScore(list);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
    expect(['D', 'C', 'B', 'A', 'A+']).toContain(s.rating);
  });

  it('minimum score for empty is 0', () => {
    expect(computeArchitectureScore([]).score).toBe(0);
  });

  it('maximum score for pristine capabilities is high', () => {
    const perfect = normalizeCapabilities([
      { id: 'P1', maturity: 5, health: 100, risk: 0, criticality: 90 },
      { id: 'P2', maturity: 5, health: 100, risk: 0, criticality: 80 },
    ]);
    expect(computeArchitectureScore(perfect).rating).toMatch(/A/);
  });

  it('risks classify correctly', () => {
    const risks = assessCapabilityRisks(normalizeCapabilities(S));
    expect(risks).toHaveLength(3);
    risks.forEach((r) => expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(r.level));
  });

  it('roadmap prioritizes deterministically', () => {
    const r1 = buildCapabilityRoadmap(normalizeCapabilities(S));
    const r2 = buildCapabilityRoadmap(normalizeCapabilities(S));
    expect(r1).toEqual(r2);
  });

  it('summary is stable', () => {
    const s = buildArchitectureSummary(analyzeArchitecture(S));
    expect(s.totals.capabilities).toBe(3);
    expect(s.highlights.length).toBeGreaterThan(0);
  });

  it('health distribution sums to total', () => {
    const h = evaluateCapabilityHealth(normalizeCapabilities(S));
    const sum = h.distribution.CRITICAL + h.distribution.AT_RISK + h.distribution.STABLE + h.distribution.HEALTHY;
    expect(sum).toBe(h.total);
  });
});
