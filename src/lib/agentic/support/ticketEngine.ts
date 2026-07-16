/**
 * Sprint 7.4 · Ticket Engine — derives ticket lifecycle metrics.
 */
import type { SupportTicket } from './types';
import { minutesBetween, num } from './_utils';

export interface TicketMetrics {
  readonly id: string;
  readonly ageMinutes: number;
  readonly responseMinutes: number;
  readonly resolutionMinutes: number;
  readonly isOpen: boolean;
  readonly isResolved: boolean;
}

export function evaluateTicket(t: SupportTicket, now: Date = new Date()): TicketMetrics {
  const nowIso = now.toISOString();
  const isResolved = t.status === 'resolved' || t.status === 'closed';
  return {
    id: t.id,
    ageMinutes: minutesBetween(t.createdAt, isResolved && t.resolvedAt ? t.resolvedAt : nowIso),
    responseMinutes: minutesBetween(t.createdAt, t.firstResponseAt),
    resolutionMinutes: minutesBetween(t.createdAt, t.resolvedAt),
    isOpen: !isResolved,
    isResolved,
  };
}
