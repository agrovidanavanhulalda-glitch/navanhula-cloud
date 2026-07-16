/**
 * Sprint 7.4 · Ticket Trend Engine — monthly volume + trend.
 */
import type { SupportTicket } from './types';

export interface TrendBucket {
  readonly month: string; // YYYY-MM
  readonly count: number;
}

export interface TicketTrend {
  readonly buckets: readonly TrendBucket[];
  readonly direction: 'UP' | 'FLAT' | 'DOWN';
}

export function analyzeTicketTrend(tickets: readonly SupportTicket[]): TicketTrend {
  const acc = new Map<string, number>();
  for (const t of tickets) {
    const ts = Date.parse(t.createdAt);
    if (!Number.isFinite(ts)) continue;
    const d = new Date(ts);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    acc.set(key, (acc.get(key) ?? 0) + 1);
  }
  const buckets = [...acc.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, count]) => ({ month, count }));
  let direction: TicketTrend['direction'] = 'FLAT';
  if (buckets.length >= 2) {
    const last = buckets[buckets.length - 1].count;
    const prev = buckets[buckets.length - 2].count;
    if (last > prev * 1.1) direction = 'UP';
    else if (last < prev * 0.9) direction = 'DOWN';
  }
  return { buckets, direction };
}
