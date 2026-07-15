/**
 * Sprint 4.8 · Initiative Ranking Engine (pure).
 */
import { computeBusinessValue, type BusinessValueInput } from './businessValueEngine';

export interface RankableInitiative extends BusinessValueInput {
  id: string;
  title?: string;
  cost?: number;
  effort?: number;
}

export interface RankedInitiative {
  id: string;
  title: string;
  value: number;
  cost: number;
  effort: number;
  priorityScore: number;
  rank: number;
}

const num = (n: unknown): number =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0;

export function rankInitiatives(items: RankableInitiative[] = []): RankedInitiative[] {
  const list = Array.isArray(items) ? items.filter(i => i && typeof i.id === 'string') : [];
  const scored = list.map(i => {
    const value = computeBusinessValue(i).score;
    const cost = num(i.cost);
    const effort = num(i.effort);
    const denominator = 1 + effort * 0.5 + cost * 0.001;
    const priorityScore = Math.round((value / denominator) * 10) / 10;
    return { id: i.id, title: i.title ?? i.id, value, cost, effort, priorityScore, rank: 0 };
  });
  scored.sort((a, b) => (b.priorityScore - a.priorityScore) || a.id.localeCompare(b.id));
  scored.forEach((s, idx) => (s.rank = idx + 1));
  return scored;
}
