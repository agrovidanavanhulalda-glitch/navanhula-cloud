/**
 * Sprint 5.2 · Mitigation Planner (pure).
 */
import type { NormalizedRisk } from './enterpriseRiskEngine';
import { inherentRisk } from './enterpriseRiskEngine';

export interface MitigationStep {
  id: string;
  name: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  expectedReduction: number; // 0-100 points reduction
  horizon: 'NOW' | 'NEXT' | 'LATER';
}

export function planMitigation(list: NormalizedRisk[]): MitigationStep[] {
  return list
    .map((r) => {
      const inh = inherentRisk(r);
      const reduction = Math.round((inh * Math.max(0, Math.min(100, r.mitigation))) / 100);
      const priority: MitigationStep['priority'] =
        inh >= 75 ? 'P0' : inh >= 50 ? 'P1' : inh >= 25 ? 'P2' : 'P3';
      const horizon: MitigationStep['horizon'] =
        inh >= 60 ? 'NOW' : inh >= 30 ? 'NEXT' : 'LATER';
      return { id: r.id, name: r.name, priority, expectedReduction: reduction, horizon };
    })
    .sort((a, b) => (b.expectedReduction - a.expectedReduction) || a.id.localeCompare(b.id));
}
