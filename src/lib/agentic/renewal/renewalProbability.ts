/**
 * Sprint 7.3 · Renewal Probability Engine (deterministic).
 */
import type { RenewalContract } from './types';
import { clamp, clamp01, num } from './_utils';

export interface RenewalProbability {
  readonly probability: number; // 0..1
  readonly likelihood: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
}

export function estimateRenewalProbability(c: RenewalContract): RenewalProbability {
  let p = 0.55;
  const usage = clamp(num(c.usagePct));
  p += (usage - 50) / 200; // ±0.25
  const nps = clamp(num(c.npsScore), -100, 100);
  p += nps / 400; // ±0.25
  if (num(c.overdueInvoices) > 0) p -= 0.20;
  if (num(c.criticalTickets) > 0) p -= 0.10 * Math.min(3, num(c.criticalTickets));
  if (num(c.daysSinceLastLogin) >= 30) p -= 0.15;
  else if (num(c.daysSinceLastLogin) >= 14) p -= 0.07;
  if (num(c.tenureDays) > 365) p += 0.10;
  if (num(c.expansionSignals) > 0) p += 0.05;
  const prob = clamp01(p);
  const likelihood =
    prob >= 0.85 ? 'VERY_HIGH'
    : prob >= 0.65 ? 'HIGH'
    : prob >= 0.40 ? 'MODERATE'
    : 'LOW';
  return { probability: Math.round(prob * 100) / 100, likelihood };
}
