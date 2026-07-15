/**
 * Sprint 4.7 · Initiative Engine (pure).
 */
import type { StrategicObjective } from './objectiveEngine';

export interface Initiative {
  id: string;
  objectiveId: string;
  title: string;
  effort: number;    // 1-10
  impact: number;    // 1-10
  risk: number;      // 1-10
  confidence: number; // 0-100
  dependsOn: string[];
}

interface Signals {
  activeInitiatives: number;
  executionReadiness: number;
}

export function buildInitiatives(objectives: StrategicObjective[], s: Signals): Initiative[] {
  const confidence = Math.round(Math.max(30, Math.min(95, s.executionReadiness || 60)));
  const out: Initiative[] = [];
  objectives.forEach((o, idx) => {
    const base = Math.max(1, Math.round(o.gap / 20));
    out.push({
      id: `init-${o.id}-a`,
      objectiveId: o.id,
      title: `Iniciativa primária — ${o.title}`,
      effort: Math.min(10, 3 + base),
      impact: Math.min(10, 5 + base),
      risk: Math.min(10, 2 + Math.round(o.gap / 30)),
      confidence,
      dependsOn: [],
    });
    if (o.gap >= 20) {
      out.push({
        id: `init-${o.id}-b`,
        objectiveId: o.id,
        title: `Iniciativa complementar — ${o.title}`,
        effort: Math.min(10, 2 + base),
        impact: Math.min(10, 3 + base),
        risk: Math.min(10, 1 + Math.round(o.gap / 40)),
        confidence: Math.max(30, confidence - 10),
        dependsOn: [`init-${o.id}-a`],
      });
    }
    if (idx > 0 && s.activeInitiatives > 3) {
      out[out.length - 1].dependsOn.push(`init-${objectives[idx - 1].id}-a`);
    }
  });
  return out;
}
