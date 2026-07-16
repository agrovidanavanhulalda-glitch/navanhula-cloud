/**
 * Sprint 7.1 · Activation Engine (pure).
 * Measures how quickly and how completely a customer reached "activated" state.
 */
import type { CustomerSignals } from '../customer-success/customerHealthEngine';

const clamp = (n: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));

export interface ActivationResult {
  readonly score: number;
  readonly activated: boolean;
  readonly reasons: string[];
}

export function evaluateActivation(s: CustomerSignals): ActivationResult {
  const reasons: string[] = [];
  const onboarding = clamp(s.onboardingCompletionPct);
  const hasFirstSale = (Number.isFinite(s.sales30d) ? s.sales30d : 0) > 0
    || (Number.isFinite(s.salesPrev30d) ? s.salesPrev30d : 0) > 0;
  const hasFiscal = (Number.isFinite(s.fiscalDocs30d) ? s.fiscalDocs30d : 0) > 0;
  const adoption = clamp(s.featureAdoptionPct);

  const score = Math.round(
    onboarding * 0.35 +
    (hasFirstSale ? 30 : 0) +
    (hasFiscal ? 15 : 0) +
    adoption * 0.20,
  );

  if (!hasFirstSale) reasons.push('Sem primeira venda registada');
  if (!hasFiscal) reasons.push('Sem documento fiscal emitido');
  if (onboarding < 80) reasons.push('Onboarding incompleto');

  return { score: clamp(score), activated: score >= 70, reasons };
}
