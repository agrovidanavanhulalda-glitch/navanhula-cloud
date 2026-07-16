/**
 * Sprint 7.4 · Support Executive Summary.
 */
import type { SupportPortfolio } from './supportAggregator';

export interface SupportSummary {
  readonly headline: string;
  readonly highlights: readonly string[];
}

export function summarizeSupport(p: SupportPortfolio): SupportSummary {
  if (p.totalTickets === 0) {
    return { headline: 'Fila de suporte vazia.', highlights: [] };
  }
  const highlights: string[] = [
    `Support Score: ${p.score.score}/100 (${p.score.rating})`,
    `SLA global: ${p.sla.overallCompliancePct}%`,
    `Backlog: ${p.backlog.openCount} abertos, ${p.backlog.agedOverDays} envelhecidos`,
    `Escalações: ${p.escalations.escalatedTickets} tickets (${p.escalations.escalationRatePct}%)`,
    `Capacidade: ${p.capacity.utilizationPct}% (${p.capacity.band})`,
  ];
  const headline =
    p.score.rating === 'CRITICAL' || p.score.rating === 'AT_RISK'
      ? 'Atenção: operação de suporte sob risco.'
      : p.score.rating === 'CHAMPION'
      ? 'Operação de suporte em excelência.'
      : 'Operação de suporte estável.';
  return { headline, highlights };
}
