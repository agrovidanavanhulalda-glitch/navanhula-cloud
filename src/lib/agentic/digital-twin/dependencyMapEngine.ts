/**
 * Sprint 5.5 · Dependency Map Engine (pure).
 */
import type { EnterpriseModel } from './enterpriseModelEngine';

export interface DependencyNode {
  id: string;
  name: string;
  type: string;
  reliability: number;
  criticality: number;
  fanIn: number;
  riskScore: number;
}

export interface DependencyMap {
  nodes: DependencyNode[];
  edges: Array<{ from: string; to: string }>;
  highRiskCount: number;
}

export function mapDependencies(model: EnterpriseModel): DependencyMap {
  const fanIn = new Map<string, number>();
  const edges: Array<{ from: string; to: string }> = [];
  for (const p of model.processes) {
    for (const d of p.dependsOn) {
      fanIn.set(d, (fanIn.get(d) ?? 0) + 1);
      edges.push({ from: p.id, to: d });
    }
  }
  const nodes: DependencyNode[] = model.dependencies.map((d) => {
    const fi = fanIn.get(d.id) ?? 0;
    const risk = Math.round(((100 - d.reliability) * 0.5) + (d.criticality * 0.3) + Math.min(20, fi * 4));
    return { id: d.id, name: d.name, type: d.type, reliability: d.reliability, criticality: d.criticality, fanIn: fi, riskScore: risk };
  }).sort((a, b) => b.riskScore - a.riskScore);
  return {
    nodes,
    edges,
    highRiskCount: nodes.filter((n) => n.riskScore >= 60).length,
  };
}
