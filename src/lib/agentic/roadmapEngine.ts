/**
 * Sprint 4.7 · Roadmap Engine (pure).
 */
import type { PriorityItem } from './priorityMatrix';
import type { ResourcePlan } from './resourcePlanner';

export type RoadmapHorizon = 'NOW' | 'NEXT' | 'LATER';

export interface RoadmapItem {
  id: string;
  horizon: RoadmapHorizon;
  title: string;
  band: PriorityItem['band'];
  score: number;
}

export function buildRoadmap(priorities: PriorityItem[], resources: ResourcePlan): RoadmapItem[] {
  const scheduled = new Set(resources.scheduled);
  return priorities.map((p) => {
    let horizon: RoadmapHorizon;
    if (scheduled.has(p.id) && (p.band === 'P0' || p.band === 'P1')) horizon = 'NOW';
    else if (scheduled.has(p.id)) horizon = 'NEXT';
    else horizon = 'LATER';
    return {
      id: p.id,
      horizon,
      title: p.initiative.title,
      band: p.band,
      score: p.score,
    };
  });
}
