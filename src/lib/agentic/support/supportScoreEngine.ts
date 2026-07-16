/**
 * Sprint 7.4 · Support Score Engine (composite 0..100).
 */
import type { SupportAgent, SupportTicket, TicketBand } from './types';
import { evaluateSlaCompliance } from './slaEngine';
import { evaluateQueueHealth } from './queueHealthEngine';
import { evaluateSupportCapacity } from './supportCapacityEngine';
import { evaluateEscalations } from './escalationEngine';
import { clamp } from './_utils';

export interface SupportScore {
  readonly score: number;
  readonly rating: TicketBand;
}

export function computeSupportScore(
  tickets: readonly SupportTicket[],
  agents: readonly SupportAgent[],
  now: Date = new Date(),
): SupportScore {
  const sla = evaluateSlaCompliance(tickets, now);
  const queue = evaluateQueueHealth(tickets, now);
  const cap = evaluateSupportCapacity(agents, tickets);
  const esc = evaluateEscalations(tickets);

  const capPenalty = cap.band === 'OVERLOAD' ? 15 : cap.band === 'HIGH' ? 5 : 0;
  const escPenalty = Math.min(20, esc.escalationRatePct / 2);

  const composite = clamp(
    sla.overallCompliancePct * 0.5 + queue.score * 0.5 - capPenalty - escPenalty,
  );
  const score = Math.round(composite);
  const rating: TicketBand =
    score >= 85 ? 'CHAMPION'
    : score >= 70 ? 'HEALTHY'
    : score >= 50 ? 'STABLE'
    : score >= 30 ? 'AT_RISK'
    : 'CRITICAL';
  return { score, rating };
}
