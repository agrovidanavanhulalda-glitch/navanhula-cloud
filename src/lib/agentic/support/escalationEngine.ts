/**
 * Sprint 7.4 · Escalation Engine.
 */
import type { SupportTicket } from './types';
import { num } from './_utils';

export interface EscalationStats {
  readonly totalEscalations: number;
  readonly escalatedTickets: number;
  readonly reopenedTickets: number;
  readonly escalationRatePct: number;
}

export function evaluateEscalations(tickets: readonly SupportTicket[]): EscalationStats {
  if (tickets.length === 0) {
    return { totalEscalations: 0, escalatedTickets: 0, reopenedTickets: 0, escalationRatePct: 0 };
  }
  let total = 0;
  let escalated = 0;
  let reopened = 0;
  for (const t of tickets) {
    const e = num(t.escalations);
    total += e;
    if (e > 0) escalated += 1;
    if (num(t.reopenCount) > 0) reopened += 1;
  }
  return {
    totalEscalations: total,
    escalatedTickets: escalated,
    reopenedTickets: reopened,
    escalationRatePct: Math.round((escalated / tickets.length) * 100),
  };
}
