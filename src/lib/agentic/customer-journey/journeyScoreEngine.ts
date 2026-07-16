/**
 * Sprint 7.1 · Journey Score Engine (pure).
 * Composite score from activation, adoption, engagement, and retention.
 */
import type { CustomerSignals } from '../customer-success/customerHealthEngine';
import { evaluateActivation } from './activationEngine';
import { evaluateAdoption } from './adoptionEngine';
import { evaluateEngagement } from './engagementEngine';
import { evaluateRetention } from './retentionEngine';

const clamp = (n: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));

export interface JourneyScore {
  readonly score: number;
  readonly activation: number;
  readonly adoption: number;
  readonly engagement: number;
  readonly retention: number;
}

export function evaluateJourneyScore(s: CustomerSignals): JourneyScore {
  const activation = evaluateActivation(s).score;
  const adoption = evaluateAdoption(s).score;
  const engagement = evaluateEngagement(s).score;
  const retention = evaluateRetention(s).score;
  const score = clamp(
    activation * 0.25 + adoption * 0.25 + engagement * 0.25 + retention * 0.25,
  );
  return {
    score: Math.round(score),
    activation,
    adoption,
    engagement,
    retention,
  };
}
