/**
 * CSAT: average rating on 0-10 mapped to 0-100.
 */
import { FeedbackEntry, clamp, safeRating } from './types';

export interface SatisfactionResult {
  readonly csat: number;          // 0-100
  readonly avgRating: number;     // 0-10
  readonly total: number;
}

export function computeSatisfaction(entries: readonly FeedbackEntry[]): SatisfactionResult {
  const total = entries.length;
  if (total === 0) return { csat: 0, avgRating: 0, total: 0 };
  let sum = 0;
  for (const e of entries) sum += safeRating(e.rating);
  const avg = sum / total;
  return {
    csat: clamp(Math.round((avg / 10) * 100)),
    avgRating: Math.round(avg * 10) / 10,
    total,
  };
}
