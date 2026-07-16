/**
 * Sprint 7.1 · Journey Stage Engine (pure, deterministic).
 * Classifies a customer into a lifecycle stage of the journey.
 */
import type { CustomerSignals } from '../customer-success/customerHealthEngine';

export type JourneyStage =
  | 'LEAD'
  | 'TRIAL'
  | 'SETUP'
  | 'ONBOARDING'
  | 'FIRST_SALE'
  | 'ACTIVE'
  | 'POWER_USER'
  | 'RENEWAL'
  | 'EXPANSION'
  | 'CHAMPION'
  | 'AT_RISK';

const num = (n: number): number => (Number.isFinite(n) ? n : 0);

export const JOURNEY_STAGES: readonly JourneyStage[] = [
  'LEAD', 'TRIAL', 'SETUP', 'ONBOARDING', 'FIRST_SALE',
  'ACTIVE', 'POWER_USER', 'RENEWAL', 'EXPANSION', 'CHAMPION',
] as const;

export function classifyJourneyStage(s: CustomerSignals): JourneyStage {
  const tenure = num(s.tenureDays);
  const onboarding = num(s.onboardingCompletionPct);
  const adoption = num(s.featureAdoptionPct);
  const sales30 = num(s.sales30d);
  const salesPrev = num(s.salesPrev30d);
  const daysIdle = num(s.daysSinceLastLogin);
  const daysToRenewal = num(s.daysToRenewal);

  if (tenure <= 0) return 'LEAD';
  if (daysIdle >= 30 && tenure > 30) return 'AT_RISK';
  if (tenure <= 14 && onboarding < 40) return 'TRIAL';
  if (onboarding < 60) return 'SETUP';
  if (onboarding < 100 && sales30 === 0) return 'ONBOARDING';
  if (sales30 > 0 && salesPrev === 0) return 'FIRST_SALE';
  if (daysToRenewal >= 0 && daysToRenewal <= 15) return 'RENEWAL';
  if (adoption >= 85 && sales30 >= salesPrev * 1.2 && sales30 > 50) return 'CHAMPION';
  if (sales30 > salesPrev && adoption >= 70) return 'EXPANSION';
  if (adoption >= 70) return 'POWER_USER';
  return 'ACTIVE';
}

export function nextStage(current: JourneyStage): JourneyStage | null {
  const idx = JOURNEY_STAGES.indexOf(current);
  if (idx < 0 || idx >= JOURNEY_STAGES.length - 1) return null;
  return JOURNEY_STAGES[idx + 1];
}
