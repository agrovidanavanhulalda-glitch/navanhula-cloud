/**
 * Sprint 7.1 · Retention Engine (pure).
 */
import type { CustomerSignals } from '../customer-success/customerHealthEngine';

const num = (n: number): number => (Number.isFinite(n) ? n : 0);
const clamp = (n: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));

export interface RetentionResult {
  readonly score: number;
  readonly likelihood: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
}

export function evaluateRetention(s: CustomerSignals): RetentionResult {
  let score = 60;
  const tenure = num(s.tenureDays);
  if (tenure > 365) score += 20;
  else if (tenure > 180) score += 12;
  else if (tenure > 90) score += 6;

  if (num(s.sales30d) > 0) score += 10;
  if (num(s.fiscalDocs30d) > 0) score += 5;
  if (num(s.featureAdoptionPct) >= 70) score += 10;
  if (s.hasOverdueInvoice) score -= 25;
  if (num(s.daysToRenewal) < 0) score -= 20;
  if (num(s.daysSinceLastLogin) >= 30) score -= 25;
  if (num(s.criticalTickets) > 0) score -= 10;

  const final = clamp(score);
  const likelihood = final >= 85 ? 'VERY_HIGH'
    : final >= 65 ? 'HIGH'
    : final >= 40 ? 'MODERATE'
    : 'LOW';
  return { score: Math.round(final), likelihood };
}
