import type { Customer360Input } from './types';
import { clamp, clamp01, round } from './_utils';

export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskIndex {
  readonly score: number;    // 0-100 (higher = more risk)
  readonly band: RiskBand;
  readonly reasons: string[];
}

export function computeRisk(c: Customer360Input): RiskIndex {
  const reasons: string[] = [];
  const churn = clamp01(c.churnProbability) * 100;
  const healthGap = 100 - clamp(c.healthScore);
  const renewalGap = 100 - clamp(c.renewalScore);
  const supportGap = 100 - clamp(c.supportScore);

  if (c.criticalTickets > 0) reasons.push(`${c.criticalTickets} tickets críticos`);
  if (c.churnProbability >= 0.4) reasons.push('Alta probabilidade de churn');
  if (c.renewalScore < 50) reasons.push('Renovação em risco');
  if (c.healthScore < 40) reasons.push('Saúde crítica');

  const score = round(
    churn * 0.35 + healthGap * 0.25 + renewalGap * 0.25 + supportGap * 0.15,
  );
  const band: RiskBand =
    score >= 75 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';
  return { score, band, reasons };
}
