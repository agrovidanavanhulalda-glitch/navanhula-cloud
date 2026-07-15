/**
 * Sprint 4.9 · Decision Priority Engine (pure).
 */
import type { NormalizedDecision } from './decisionIntelligenceEngine';
import { scoreDecision } from './decisionScoreEngine';

export type PriorityBand = 'P0' | 'P1' | 'P2' | 'P3';

export interface PriorityRow {
  id: string;
  priorityScore: number;
  band: PriorityBand;
}

const bandOf = (s: number): PriorityBand => {
  if (s >= 80) return 'P0';
  if (s >= 60) return 'P1';
  if (s >= 40) return 'P2';
  return 'P3';
};

export function prioritizeDecisions(list: NormalizedDecision[]): PriorityRow[] {
  return list
    .map((d) => {
      const s = scoreDecision(d).score;
      const priorityScore = Math.round(
        Math.max(0, Math.min(100, s * 0.6 + d.urgency * 0.3 + (100 - d.risk) * 0.1)),
      );
      return { id: d.id, priorityScore, band: bandOf(priorityScore) };
    })
    .sort((a, b) => (b.priorityScore - a.priorityScore) || a.id.localeCompare(b.id));
}

export function topDecisions(list: NormalizedDecision[], n = 10): PriorityRow[] {
  return prioritizeDecisions(list).slice(0, Math.max(0, n));
}
