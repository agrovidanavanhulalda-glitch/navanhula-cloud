/**
 * Sprint 4.7 · Priority Matrix (pure).
 * Deterministic ordering — ties broken by id.
 */
import type { Initiative } from './initiativeEngine';

export type PriorityBand = 'P0' | 'P1' | 'P2' | 'P3';

export interface PriorityItem {
  id: string;
  score: number;
  band: PriorityBand;
  initiative: Initiative;
}

const bandOf = (s: number): PriorityBand => {
  if (s >= 75) return 'P0';
  if (s >= 55) return 'P1';
  if (s >= 35) return 'P2';
  return 'P3';
};

export function rankPriorities(initiatives: Initiative[]): PriorityItem[] {
  return initiatives
    .map((i) => {
      const impact = Math.max(0, Math.min(10, i.impact));
      const effort = Math.max(1, Math.min(10, i.effort));
      const risk = Math.max(0, Math.min(10, i.risk));
      const conf = Math.max(0, Math.min(100, i.confidence));
      const raw = ((impact / effort) * 60) + (conf * 0.3) - (risk * 2);
      const score = Math.max(0, Math.min(100, Math.round(raw)));
      return { id: i.id, score, band: bandOf(score), initiative: i };
    })
    .sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id));
}
