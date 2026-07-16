/**
 * Sprint 7.3 · Renewal Risk Engine.
 */
import type { RenewalContract } from './types';
import { clamp, num } from './_utils';
import { estimateRenewalProbability } from './renewalProbability';

export interface RenewalRisk {
  readonly riskScore: number; // 0..100
  readonly band: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  readonly drivers: readonly string[];
}

export function evaluateRenewalRisk(c: RenewalContract): RenewalRisk {
  const { probability } = estimateRenewalProbability(c);
  const drivers: string[] = [];
  if (num(c.overdueInvoices) > 0) drivers.push('Faturas em atraso');
  if (num(c.criticalTickets) > 0) drivers.push('Tickets críticos');
  if (num(c.daysSinceLastLogin) >= 30) drivers.push('Inatividade prolongada');
  if (num(c.usagePct) < 40) drivers.push('Baixa adoção');
  if (num(c.npsScore) < 0) drivers.push('NPS negativo');
  const risk = clamp(100 - probability * 100);
  const band =
    risk >= 75 ? 'CRITICAL'
    : risk >= 50 ? 'HIGH'
    : risk >= 25 ? 'MODERATE'
    : 'LOW';
  return { riskScore: Math.round(risk), band, drivers };
}
