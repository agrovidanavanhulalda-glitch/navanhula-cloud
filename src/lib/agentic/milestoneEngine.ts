/**
 * Sprint 4.7 · Milestone Engine (pure).
 */
import type { RoadmapItem } from './roadmapEngine';

export interface Milestone {
  id: string;
  label: string;
  horizon: RoadmapItem['horizon'];
  items: string[];
}

export function buildMilestones(roadmap: RoadmapItem[]): Milestone[] {
  const buckets: Record<RoadmapItem['horizon'], string[]> = { NOW: [], NEXT: [], LATER: [] };
  for (const r of roadmap) buckets[r.horizon].push(r.id);
  return (['NOW', 'NEXT', 'LATER'] as const).map((h) => ({
    id: `ms-${h.toLowerCase()}`,
    label: h === 'NOW' ? 'Marco imediato' : h === 'NEXT' ? 'Marco próximo ciclo' : 'Marco futuro',
    horizon: h,
    items: buckets[h],
  }));
}
