/**
 * Monthly NPS/CSAT trend. Deterministic ISO month keys (YYYY-MM).
 */
import { FeedbackEntry, safeRating } from './types';
import { computeNps } from './npsEngine';

export interface MonthlyTrendPoint {
  readonly month: string;      // YYYY-MM
  readonly count: number;
  readonly avgRating: number;  // 0-10
  readonly nps: number;        // -100..100
}

const monthKey = (iso: string): string => {
  if (!iso || typeof iso !== 'string') return '0000-00';
  return iso.slice(0, 7);
};

export function monthlyTrend(entries: readonly FeedbackEntry[]): MonthlyTrendPoint[] {
  const groups = new Map<string, FeedbackEntry[]>();
  for (const e of entries) {
    const k = monthKey(e.createdAt);
    const arr = groups.get(k);
    if (arr) arr.push(e); else groups.set(k, [e]);
  }
  const keys = [...groups.keys()].sort();
  return keys.map((month) => {
    const list = groups.get(month)!;
    const sum = list.reduce((s, e) => s + safeRating(e.rating), 0);
    return {
      month,
      count: list.length,
      avgRating: Math.round((sum / list.length) * 10) / 10,
      nps: computeNps(list).nps,
    };
  });
}
