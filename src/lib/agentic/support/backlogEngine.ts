/**
 * Sprint 7.4 · Backlog Engine.
 */
import type { SupportTicket } from './types';
import { evaluateTicket } from './ticketEngine';
import { num, round } from './_utils';

export interface BacklogStats {
  readonly openCount: number;
  readonly agedOverDays: number; // count of tickets older than 7d
  readonly avgAgeHours: number;
  readonly oldestAgeHours: number;
}

export function evaluateBacklog(tickets: readonly SupportTicket[], now: Date = new Date()): BacklogStats {
  const open = tickets.filter((t) => t.status === 'open' || t.status === 'pending');
  if (open.length === 0) {
    return { openCount: 0, agedOverDays: 0, avgAgeHours: 0, oldestAgeHours: 0 };
  }
  let sum = 0;
  let oldest = 0;
  let aged = 0;
  for (const t of open) {
    const age = evaluateTicket(t, now).ageMinutes;
    sum += age;
    if (age > oldest) oldest = age;
    if (age > 7 * 24 * 60) aged += 1;
  }
  return {
    openCount: open.length,
    agedOverDays: aged,
    avgAgeHours: round(sum / open.length / 60, 1),
    oldestAgeHours: round(oldest / 60, 1),
  };
}
