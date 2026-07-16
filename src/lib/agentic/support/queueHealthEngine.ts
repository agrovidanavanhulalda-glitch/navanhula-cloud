/**
 * Sprint 7.4 · Queue Health Engine.
 */
import type { SupportTicket } from './types';
import { evaluateBacklog } from './backlogEngine';
import { evaluateSlaCompliance } from './slaEngine';
import { clamp } from './_utils';

export interface QueueHealth {
  readonly score: number;
  readonly band: 'CRITICAL' | 'AT_RISK' | 'STABLE' | 'HEALTHY' | 'CHAMPION';
  readonly risk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export function evaluateQueueHealth(tickets: readonly SupportTicket[], now: Date = new Date()): QueueHealth {
  const sla = evaluateSlaCompliance(tickets, now);
  const backlog = evaluateBacklog(tickets, now);
  let score = sla.overallCompliancePct;
  if (backlog.agedOverDays > 0) score -= Math.min(30, backlog.agedOverDays * 5);
  if (backlog.oldestAgeHours > 72) score -= 10;
  const finalScore = Math.round(clamp(score));
  const band =
    finalScore >= 85 ? 'CHAMPION'
    : finalScore >= 70 ? 'HEALTHY'
    : finalScore >= 50 ? 'STABLE'
    : finalScore >= 30 ? 'AT_RISK'
    : 'CRITICAL';
  const risk =
    finalScore >= 70 ? 'LOW'
    : finalScore >= 50 ? 'MODERATE'
    : finalScore >= 30 ? 'HIGH'
    : 'CRITICAL';
  return { score: finalScore, band, risk };
}
