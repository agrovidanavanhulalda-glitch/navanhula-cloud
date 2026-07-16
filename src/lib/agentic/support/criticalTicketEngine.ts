/**
 * Sprint 7.4 · Critical Ticket Engine.
 */
import type { SupportTicket } from './types';
import { derivedPriority } from './ticketPriorityEngine';
import { evaluateTicket } from './ticketEngine';

export interface CriticalTicket {
  readonly id: string;
  readonly customerName: string;
  readonly subject: string;
  readonly ageHours: number;
  readonly escalations: number;
}

export function selectCriticalTickets(
  tickets: readonly SupportTicket[],
  now: Date = new Date(),
): readonly CriticalTicket[] {
  return tickets
    .filter((t) => (t.status === 'open' || t.status === 'pending') && derivedPriority(t) === 'P1')
    .map((t) => ({
      id: t.id,
      customerName: t.customerName,
      subject: t.subject,
      ageHours: Math.round(evaluateTicket(t, now).ageMinutes / 60),
      escalations: t.escalations ?? 0,
    }))
    .sort((a, b) => b.ageHours - a.ageHours);
}
