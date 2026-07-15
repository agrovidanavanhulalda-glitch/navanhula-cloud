/**
 * Sprint 5.0 · Capability Roadmap Engine (pure).
 */
import type { Capability } from './businessCapabilityEngine';
import { assessCapabilityRisks } from './capabilityRiskEngine';

export type Horizon = 'NOW' | 'NEXT' | 'LATER';

export interface RoadmapItem {
  id: string;
  name: string;
  horizon: Horizon;
  action: 'REMEDIATE' | 'MATURE' | 'MONITOR' | 'INVEST';
  priority: number;
}

export function buildCapabilityRoadmap(list: Capability[]): RoadmapItem[] {
  const risks = new Map(assessCapabilityRisks(list).map((r) => [r.id, r]));
  return list
    .map((c) => {
      const r = risks.get(c.id);
      let horizon: Horizon;
      let action: RoadmapItem['action'];
      if (r?.level === 'CRITICAL' || c.health < 40) {
        horizon = 'NOW';
        action = 'REMEDIATE';
      } else if (c.maturity <= 1 && c.criticality >= 60) {
        horizon = 'NOW';
        action = 'MATURE';
      } else if (c.maturity <= 2) {
        horizon = 'NEXT';
        action = 'MATURE';
      } else if (c.criticality >= 70 && c.maturity < 4) {
        horizon = 'NEXT';
        action = 'INVEST';
      } else {
        horizon = 'LATER';
        action = 'MONITOR';
      }
      const priority = Math.round(c.criticality * 0.5 + (r?.risk ?? 0) * 0.3 + (100 - c.health) * 0.2);
      return { id: c.id, name: c.name, horizon, action, priority };
    })
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}
