/**
 * Sprint 7.0 · Churn Prediction Engine (pure, deterministic).
 *
 * Estimates 30/60/90 day churn probability from CustomerSignals + Health.
 */
import type { CustomerHealth, CustomerSignals } from './customerHealthEngine';

export type ChurnBand = 'LOW' | 'MODERATE' | 'HIGH' | 'IMMINENT';

export interface ChurnPrediction {
  readonly probability30d: number;
  readonly probability60d: number;
  readonly probability90d: number;
  readonly band: ChurnBand;
  readonly drivers: string[];
  readonly recommendedPlaybook: string;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function predictChurn(s: CustomerSignals, h: CustomerHealth): ChurnPrediction {
  const drivers: string[] = [];
  // Base risk = inverse of health.
  let base = (100 - h.score) / 100;

  if (s.daysSinceLastLogin >= 30) { base += 0.25; drivers.push('Inatividade prolongada'); }
  else if (s.daysSinceLastLogin >= 14) { base += 0.12; drivers.push('Inatividade moderada'); }

  if (s.hasOverdueInvoice) { base += 0.20; drivers.push('Pagamento em atraso'); }
  if (s.daysToRenewal < 0) { base += 0.15; drivers.push('Renovação vencida'); }
  if (s.criticalTickets > 0) { base += 0.10 * Math.min(3, s.criticalTickets); drivers.push('Suporte crítico'); }
  if (s.onboardingCompletionPct < 50 && s.tenureDays > 14) { base += 0.15; drivers.push('Onboarding incompleto'); }
  if (s.sales30d === 0 && s.tenureDays > 30) { base += 0.15; drivers.push('Sem transações no mês'); }

  const p30 = clamp01(base);
  const p60 = clamp01(base * 1.15);
  const p90 = clamp01(base * 1.30);

  const band: ChurnBand =
    p30 >= 0.75 ? 'IMMINENT' :
    p30 >= 0.50 ? 'HIGH' :
    p30 >= 0.25 ? 'MODERATE' : 'LOW';

  const recommendedPlaybook =
    band === 'IMMINENT' ? 'save-call-executive'
    : band === 'HIGH' ? 'csm-intervention-72h'
    : band === 'MODERATE' ? 'adoption-nudge-email'
    : 'quarterly-business-review';

  return {
    probability30d: Math.round(p30 * 100) / 100,
    probability60d: Math.round(p60 * 100) / 100,
    probability90d: Math.round(p90 * 100) / 100,
    band,
    drivers,
    recommendedPlaybook,
  };
}
