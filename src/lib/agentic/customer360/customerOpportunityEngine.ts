import type { Customer360Input } from './types';
import { num, round } from './_utils';

export interface Opportunity {
  readonly hasOpportunity: boolean;
  readonly type: 'upsell' | 'cross_sell' | 'expansion' | 'advocacy' | 'none';
  readonly estimatedMrrLift: number;
  readonly confidence: number; // 0-100
}

export function detectOpportunity(c: Customer360Input): Opportunity {
  const expansion = Math.max(0, num(c.expansionMrr));
  if (c.nps >= 50 && c.healthScore >= 80) {
    return { hasOpportunity: true, type: 'advocacy', estimatedMrrLift: round(expansion), confidence: 90 };
  }
  if (expansion > 0 && c.healthScore >= 60) {
    return { hasOpportunity: true, type: 'expansion', estimatedMrrLift: round(expansion), confidence: 75 };
  }
  if (c.planTier === 'starter' && c.healthScore >= 70) {
    return { hasOpportunity: true, type: 'upsell', estimatedMrrLift: round(num(c.mrr) * 0.5), confidence: 65 };
  }
  if (c.planTier === 'pro' && c.healthScore >= 75) {
    return { hasOpportunity: true, type: 'cross_sell', estimatedMrrLift: round(num(c.mrr) * 0.3), confidence: 60 };
  }
  return { hasOpportunity: false, type: 'none', estimatedMrrLift: 0, confidence: 0 };
}
