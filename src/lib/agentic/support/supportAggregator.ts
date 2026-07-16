/**
 * Sprint 7.4 · Support Portfolio Aggregator.
 */
import type { SupportAgent, SupportTicket } from './types';
import { evaluateSlaCompliance, type SlaCompliance } from './slaEngine';
import { evaluateResponseTime, type ResponseTimeStats } from './responseTimeEngine';
import { evaluateResolutionTime, type ResolutionTimeStats } from './resolutionTimeEngine';
import { evaluateBacklog, type BacklogStats } from './backlogEngine';
import { evaluateEscalations, type EscalationStats } from './escalationEngine';
import { selectCriticalTickets, type CriticalTicket } from './criticalTicketEngine';
import { evaluateSupportCapacity, type CapacityStats } from './supportCapacityEngine';
import { evaluateQueueHealth, type QueueHealth } from './queueHealthEngine';
import { computeSupportScore, type SupportScore } from './supportScoreEngine';
import { analyzeTicketTrend, type TicketTrend } from './ticketTrendEngine';
import { summarizeSupport, type SupportSummary } from './supportSummaryEngine';

export interface SupportPortfolio {
  readonly totalTickets: number;
  readonly sla: SlaCompliance;
  readonly responseTime: ResponseTimeStats;
  readonly resolutionTime: ResolutionTimeStats;
  readonly backlog: BacklogStats;
  readonly escalations: EscalationStats;
  readonly critical: readonly CriticalTicket[];
  readonly capacity: CapacityStats;
  readonly queue: QueueHealth;
  readonly score: SupportScore;
  readonly trend: TicketTrend;
  readonly summary: SupportSummary;
}

export function assessSupportPortfolio(
  tickets: readonly SupportTicket[],
  agents: readonly SupportAgent[] = [],
  now: Date = new Date(),
): SupportPortfolio {
  const sla = evaluateSlaCompliance(tickets, now);
  const responseTime = evaluateResponseTime(tickets, now);
  const resolutionTime = evaluateResolutionTime(tickets, now);
  const backlog = evaluateBacklog(tickets, now);
  const escalations = evaluateEscalations(tickets);
  const critical = selectCriticalTickets(tickets, now);
  const capacity = evaluateSupportCapacity(agents, tickets);
  const queue = evaluateQueueHealth(tickets, now);
  const score = computeSupportScore(tickets, agents, now);
  const trend = analyzeTicketTrend(tickets);
  const partial: SupportPortfolio = {
    totalTickets: tickets.length,
    sla, responseTime, resolutionTime, backlog, escalations,
    critical, capacity, queue, score, trend,
    summary: { headline: '', highlights: [] },
  };
  return { ...partial, summary: summarizeSupport(partial) };
}
