/**
 * Sprint 7.4 · Resolution Time Engine.
 */
import type { SupportTicket } from './types';
import { evaluateTicket } from './ticketEngine';
import { avg, round } from './_utils';

export interface ResolutionTimeStats {
  readonly avgMinutes: number;
  readonly p90Minutes: number;
  readonly resolved: number;
  readonly pending: number;
}

export function evaluateResolutionTime(tickets: readonly SupportTicket[], now: Date = new Date()): ResolutionTimeStats {
  const values: number[] = [];
  let pending = 0;
  for (const t of tickets) {
    const m = evaluateTicket(t, now);
    if (!m.isResolved) { pending += 1; continue; }
    values.push(m.resolutionMinutes);
  }
  if (values.length === 0) {
    return { avgMinutes: 0, p90Minutes: 0, resolved: 0, pending };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.floor(sorted.length * 0.9) - 1);
  return {
    avgMinutes: round(avg(values)),
    p90Minutes: round(sorted[idx]),
    resolved: values.length,
    pending,
  };
}
