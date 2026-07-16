import { FeedbackEntry, FeedbackCategory, FEEDBACK_CATEGORIES, safeRating } from './types';

export interface CategoryBreakdown {
  readonly category: FeedbackCategory;
  readonly count: number;
  readonly avgRating: number;
  readonly sharePct: number;
}

export function breakdownByCategory(entries: readonly FeedbackEntry[]): CategoryBreakdown[] {
  const total = entries.length;
  const buckets: Record<FeedbackCategory, { count: number; sum: number }> = {} as never;
  for (const c of FEEDBACK_CATEGORIES) buckets[c] = { count: 0, sum: 0 };
  for (const e of entries) {
    const b = buckets[e.category] ?? buckets.other;
    b.count++;
    b.sum += safeRating(e.rating);
  }
  return FEEDBACK_CATEGORIES.map((category) => {
    const b = buckets[category];
    return {
      category,
      count: b.count,
      avgRating: b.count === 0 ? 0 : Math.round((b.sum / b.count) * 10) / 10,
      sharePct: total === 0 ? 0 : Math.round((b.count / total) * 100),
    };
  }).filter((r) => r.count > 0);
}
