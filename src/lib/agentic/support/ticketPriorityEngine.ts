/**
 * Sprint 7.4 · Ticket Priority Engine.
 */
import type { SupportTicket, TicketPriority } from './types';
import { num } from './_utils';

const WEIGHT: Record<TicketPriority, number> = { P1: 4, P2: 3, P3: 2, P4: 1 };

export function priorityWeight(p: TicketPriority): number {
  return WEIGHT[p] ?? 1;
}

export function derivedPriority(t: SupportTicket): TicketPriority {
  if (t.priority === 'P1') return 'P1';
  if (num(t.escalations) >= 2 || num(t.reopenCount) >= 2) return 'P1';
  if (t.priority === 'P2' || num(t.escalations) >= 1) return 'P2';
  return t.priority;
}
