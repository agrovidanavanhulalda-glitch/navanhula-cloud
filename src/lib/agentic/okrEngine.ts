/**
 * Sprint 4.7 · OKR Engine (pure).
 */
import type { StrategicObjective } from './objectiveEngine';

export interface KeyResult {
  id: string;
  metric: string;
  baseline: number;
  target: number;
  unit: string;
}

export interface OKR {
  objectiveId: string;
  objective: string;
  keyResults: KeyResult[];
}

export function buildOKRs(objectives: StrategicObjective[]): OKR[] {
  return objectives.map((o) => ({
    objectiveId: o.id,
    objective: o.title,
    keyResults: [
      { id: `${o.id}-kr1`, metric: `${o.pillar} score`, baseline: o.currentScore, target: o.targetScore, unit: 'pts' },
      { id: `${o.id}-kr2`, metric: `Gap reduzido`, baseline: o.gap, target: Math.max(0, Math.round(o.gap / 3)), unit: 'pts' },
    ],
  }));
}
