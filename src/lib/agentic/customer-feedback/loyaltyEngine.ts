/**
 * Loyalty proxy: repeat-feedback rate + promoter share.
 */
import { FeedbackEntry, clamp } from './types';
import { computeNps } from './npsEngine';

export interface LoyaltyResult {
  readonly score: number;               // 0-100
  readonly repeatCustomers: number;
  readonly uniqueCustomers: number;
  readonly repeatRatePct: number;
}

export function computeLoyalty(entries: readonly FeedbackEntry[]): LoyaltyResult {
  if (entries.length === 0) {
    return { score: 0, repeatCustomers: 0, uniqueCustomers: 0, repeatRatePct: 0 };
  }
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.customerId, (counts.get(e.customerId) ?? 0) + 1);
  const unique = counts.size;
  let repeat = 0;
  counts.forEach((c) => { if (c > 1) repeat++; });
  const repeatRate = unique > 0 ? (repeat / unique) * 100 : 0;
  const { promoterPct, detractorPct } = computeNps(entries);
  const score = clamp(Math.round(repeatRate * 0.5 + promoterPct * 0.5 - detractorPct * 0.25));
  return {
    score,
    repeatCustomers: repeat,
    uniqueCustomers: unique,
    repeatRatePct: Math.round(repeatRate),
  };
}
