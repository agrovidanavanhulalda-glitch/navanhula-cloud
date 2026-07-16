/**
 * Sprint 7.1 · Adoption Engine (pure).
 */
import type { CustomerSignals } from '../customer-success/customerHealthEngine';

const clamp = (n: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));

export interface AdoptionResult {
  readonly score: number;
  readonly level: 'LOW' | 'MEDIUM' | 'HIGH' | 'DEEP';
}

export function evaluateAdoption(s: CustomerSignals): AdoptionResult {
  const feature = clamp(s.featureAdoptionPct);
  const fiscalBoost = (Number.isFinite(s.fiscalDocs30d) ? s.fiscalDocs30d : 0) > 0 ? 10 : 0;
  const salesBoost = (Number.isFinite(s.sales30d) ? s.sales30d : 0) > 0 ? 10 : 0;
  const score = clamp(feature * 0.8 + fiscalBoost + salesBoost);
  const level = score >= 85 ? 'DEEP' : score >= 65 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
  return { score: Math.round(score), level };
}
