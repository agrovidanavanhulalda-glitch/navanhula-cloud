/**
 * Sprint 7.4 · Support Capacity Engine.
 */
import type { SupportAgent, SupportTicket } from './types';
import { num, round } from './_utils';

export interface CapacityStats {
  readonly totalAgents: number;
  readonly totalCapacityHours: number;
  readonly activeTickets: number;
  readonly openTickets: number;
  readonly utilizationPct: number; // 0..100+
  readonly band: 'UNDER' | 'OK' | 'HIGH' | 'OVERLOAD';
}

const TICKETS_PER_HOUR = 0.5; // ~2h/ticket avg

export function evaluateSupportCapacity(
  agents: readonly SupportAgent[],
  tickets: readonly SupportTicket[],
): CapacityStats {
  const totalCapacityHours = agents.reduce((s, a) => s + num(a.capacityHoursPerWeek), 0);
  const activeTickets = agents.reduce((s, a) => s + num(a.activeTickets), 0);
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'pending').length;
  const effectiveCapacity = totalCapacityHours * TICKETS_PER_HOUR;
  const utilization = effectiveCapacity > 0 ? (openTickets / effectiveCapacity) * 100 : 0;
  const band =
    utilization >= 100 ? 'OVERLOAD'
    : utilization >= 80 ? 'HIGH'
    : utilization >= 40 ? 'OK'
    : 'UNDER';
  return {
    totalAgents: agents.length,
    totalCapacityHours: round(totalCapacityHours),
    activeTickets,
    openTickets,
    utilizationPct: round(utilization),
    band,
  };
}
