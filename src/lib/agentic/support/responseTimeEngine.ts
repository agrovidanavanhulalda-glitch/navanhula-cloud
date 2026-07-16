/**
 * Sprint 7.4 · Response Time Engine.
 */
import type { SupportTicket } from './types';
import { evaluateTicket } from './ticketEngine';
import { avg, round } from './_utils';

export interface ResponseTimeStats {
  readonly avgMinutes: number;
  readonly p90Minutes: number;
  readonly answered: number;
  readonly unanswered: number;
}

export function evaluateResponseTime(tickets: readonly SupportTicket[], now: Date = new Date()): ResponseTimeStats {
  const values: number[] = [];
  let unanswered = 0;
  for (const t of tickets) {
    if (!t.firstResponseAt) { unanswered += 1; continue; }
    values.push(evaluateTicket(t, now).responseMinutes);
  }
  if (values.length === 0) {
    return { avgMinutes: 0, p90Minutes: 0, answered: 0, unanswered };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.floor(sorted.length * 0.9) - 1);
  return {
    avgMinutes: round(avg(values)),
    p90Minutes: round(sorted[idx]),
    answered: values.length,
    unanswered,
  };
}
