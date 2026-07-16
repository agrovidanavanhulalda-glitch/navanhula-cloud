/**
 * Sprint 5.6.1 · Enterprise Recommendations — pure, deterministic.
 */
import type { GapReport } from './enterpriseGapEngine';

export interface Recommendation {
  readonly id: string;
  readonly priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  readonly action: string;
}

const priorityFor = (gap: number): Recommendation['priority'] =>
  gap >= 30 ? 'CRITICAL' : gap >= 15 ? 'HIGH' : 'MEDIUM';

export function buildRecommendations(gaps: GapReport): readonly Recommendation[] {
  const recs: Recommendation[] = [];
  for (const g of gaps.remainingGaps) {
    recs.push({
      id: `gap-${g.id}`,
      priority: priorityFor(g.gap),
      action: `Elevar ${g.label} (+${g.gap} pts para atingir threshold GA).`,
    });
  }
  for (const w of gaps.weaknesses) {
    recs.push({
      id: `weak-${w.key}`,
      priority: priorityFor(92 - w.value),
      action: `Reforçar camada "${w.key}" (score atual ${w.value}).`,
    });
  }
  return recs;
}
