/**
 * Sprint 7.3 · Renewal Score Engine (composite 0..100).
 */
import type { RenewalContract } from './types';
import { evaluateContractHealth } from './contractHealth';
import { estimateRenewalProbability } from './renewalProbability';
import { evaluateRenewalRisk } from './renewalRisk';
import { clamp } from './_utils';

export interface RenewalScore {
  readonly score: number;
  readonly rating: 'CRITICAL' | 'AT_RISK' | 'STABLE' | 'HEALTHY' | 'CHAMPION';
}

export function computeRenewalScore(c: RenewalContract): RenewalScore {
  const health = evaluateContractHealth(c);
  const { probability } = estimateRenewalProbability(c);
  const risk = evaluateRenewalRisk(c);
  const composite = clamp(
    health.score * 0.4 + probability * 100 * 0.4 + (100 - risk.riskScore) * 0.2,
  );
  const score = Math.round(composite);
  const rating =
    score >= 85 ? 'CHAMPION'
    : score >= 70 ? 'HEALTHY'
    : score >= 50 ? 'STABLE'
    : score >= 30 ? 'AT_RISK'
    : 'CRITICAL';
  return { score, rating };
}
