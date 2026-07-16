/**
 * Sprint 7.3 · Contract Health Engine.
 */
import type { RenewalContract, RenewalBand } from './types';
import { clamp, num } from './_utils';

export interface ContractHealth {
  readonly score: number;
  readonly rating: RenewalBand;
}

export function evaluateContractHealth(c: RenewalContract): ContractHealth {
  let s = 50;
  s += (clamp(num(c.usagePct)) - 50) / 2; // ±25
  s += clamp(num(c.npsScore), -100, 100) / 4; // ±25
  if (num(c.overdueInvoices) > 0) s -= 20;
  if (num(c.criticalTickets) > 0) s -= 5 * Math.min(3, num(c.criticalTickets));
  if (num(c.daysSinceLastLogin) >= 30) s -= 15;
  if (num(c.tenureDays) > 365) s += 10;
  const score = Math.round(clamp(s));
  const rating: RenewalBand =
    score >= 85 ? 'CHAMPION'
    : score >= 70 ? 'HEALTHY'
    : score >= 50 ? 'STABLE'
    : score >= 30 ? 'AT_RISK'
    : 'CRITICAL';
  return { score, rating };
}
