/**
 * Sprint 5.1 · Transformation Roadmap Engine (pure).
 */
import type { TransformationItem } from './transformationEngine';
import { rankInitiatives } from './initiativeValueEngine';

export interface RoadmapEntry {
  id: string;
  name: string;
  horizon: 'NOW' | 'NEXT' | 'LATER';
  band: 'P0' | 'P1' | 'P2' | 'P3';
}

export function buildRoadmap(items: TransformationItem[] = []): RoadmapEntry[] {
  const ranked = rankInitiatives(items);
  return ranked.map((r) => {
    const horizon: RoadmapEntry['horizon'] =
      r.band === 'P0' ? 'NOW' : r.band === 'P1' ? 'NEXT' : 'LATER';
    return { id: r.id, name: r.name, horizon, band: r.band };
  });
}
