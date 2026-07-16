/**
 * Sprint 7.4 · SLA Engine.
 */
import type { SupportTicket } from './types';
import { evaluateTicket } from './ticketEngine';
import { clamp, num, round } from './_utils';

export interface SlaResult {
  readonly responseMet: boolean;
  readonly resolutionMet: boolean;
}

export function evaluateTicketSla(t: SupportTicket, now: Date = new Date()): SlaResult {
  const m = evaluateTicket(t, now);
  const respTarget = num(t.slaResponseMinutes);
  const resTarget = num(t.slaResolutionMinutes);
  const responseMet = t.firstResponseAt != null && m.responseMinutes <= respTarget;
  const resolutionMet = m.isResolved && m.resolutionMinutes <= resTarget;
  return { responseMet, resolutionMet };
}

export interface SlaCompliance {
  readonly responseCompliancePct: number;
  readonly resolutionCompliancePct: number;
  readonly overallCompliancePct: number;
  readonly violations: number;
}

export function evaluateSlaCompliance(
  tickets: readonly SupportTicket[],
  now: Date = new Date(),
): SlaCompliance {
  if (tickets.length === 0) {
    return { responseCompliancePct: 100, resolutionCompliancePct: 100, overallCompliancePct: 100, violations: 0 };
  }
  let respMet = 0;
  let resMet = 0;
  let respTotal = 0;
  let resTotal = 0;
  let violations = 0;
  for (const t of tickets) {
    const s = evaluateTicketSla(t, now);
    if (t.firstResponseAt != null) {
      respTotal += 1;
      if (s.responseMet) respMet += 1; else violations += 1;
    }
    if (t.status === 'resolved' || t.status === 'closed') {
      resTotal += 1;
      if (s.resolutionMet) resMet += 1; else violations += 1;
    }
  }
  const respPct = respTotal > 0 ? (respMet / respTotal) * 100 : 100;
  const resPct = resTotal > 0 ? (resMet / resTotal) * 100 : 100;
  return {
    responseCompliancePct: round(clamp(respPct)),
    resolutionCompliancePct: round(clamp(resPct)),
    overallCompliancePct: round(clamp((respPct + resPct) / 2)),
    violations,
  };
}
