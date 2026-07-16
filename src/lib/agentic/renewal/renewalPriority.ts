/**
 * Sprint 7.3 · Renewal Priority Engine.
 */
import type { RenewalContract, RenewalPriority } from './types';
import { evaluateRenewal } from './renewalEngine';
import { evaluateRenewalRisk } from './renewalRisk';
import { num } from './_utils';

export interface RenewalPriorityResult {
  readonly priority: RenewalPriority;
  readonly reason: string;
}

export function prioritizeRenewal(
  c: RenewalContract,
  now: Date = new Date(),
): RenewalPriorityResult {
  const { daysToRenewal, stage } = evaluateRenewal(c, now);
  const risk = evaluateRenewalRisk(c);
  const mrr = num(c.mrr);

  if (stage === 'EXPIRED' || (stage === 'DUE_NOW' && risk.band !== 'LOW')) {
    return { priority: 'P1', reason: 'Renovação crítica imediata' };
  }
  if (risk.band === 'CRITICAL' || (mrr >= 3000 && daysToRenewal <= 30)) {
    return { priority: 'P1', reason: 'Alto valor + risco elevado' };
  }
  if (risk.band === 'HIGH' || daysToRenewal <= 30) {
    return { priority: 'P2', reason: 'Ação nas próximas 4 semanas' };
  }
  if (risk.band === 'MODERATE' || daysToRenewal <= 60) {
    return { priority: 'P3', reason: 'Monitorar em 60 dias' };
  }
  return { priority: 'P4', reason: 'Estável, revisão trimestral' };
}
