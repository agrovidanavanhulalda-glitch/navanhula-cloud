/**
 * Basic descriptive stats over feedback entries.
 */
import { FeedbackEntry, safeRating } from './types';

export interface FeedbackStats {
  readonly total: number;
  readonly withComments: number;
  readonly minRating: number;
  readonly maxRating: number;
  readonly uniqueCustomers: number;
}

export function summarizeFeedback(entries: readonly FeedbackEntry[]): FeedbackStats {
  if (entries.length === 0) {
    return { total: 0, withComments: 0, minRating: 0, maxRating: 0, uniqueCustomers: 0 };
  }
  let withComments = 0;
  let min = 10, max = 0;
  const ids = new Set<string>();
  for (const e of entries) {
    const r = safeRating(e.rating);
    if (r < min) min = r;
    if (r > max) max = r;
    if ((e.comment ?? '').trim().length > 0) withComments++;
    ids.add(e.customerId);
  }
  return { total: entries.length, withComments, minRating: min, maxRating: max, uniqueCustomers: ids.size };
}
