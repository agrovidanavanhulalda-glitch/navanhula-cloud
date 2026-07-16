/**
 * Sprint 7.3 · Renewal Opportunity (expansion at renewal).
 */
import type { RenewalContract } from './types';
import { num } from './_utils';

export interface RenewalOpportunity {
  readonly hasOpportunity: boolean;
  readonly estimatedMrrLift: number;
  readonly reason: string;
}

const TIER_LIFT: Record<RenewalContract['planTier'], number> = {
  starter: 750,
  pro: 2000,
  enterprise: 5000,
};

export function detectRenewalOpportunity(c: RenewalContract): RenewalOpportunity {
  const signals = num(c.expansionSignals);
  const usage = num(c.usagePct);
  const nps = num(c.npsScore);
  if (signals <= 0 && usage < 75 && nps < 40) {
    return { hasOpportunity: false, estimatedMrrLift: 0, reason: 'Sem sinais claros' };
  }
  const base = TIER_LIFT[c.planTier] ?? 0;
  const confidence = Math.min(1, (signals * 0.25) + (usage / 200) + (Math.max(0, nps) / 200));
  return {
    hasOpportunity: true,
    estimatedMrrLift: Math.round(base * confidence),
    reason: signals > 0 ? 'Sinais de expansão detectados' : 'Alta adoção e satisfação',
  };
}
