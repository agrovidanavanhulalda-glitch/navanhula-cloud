/**
 * Sprint 7.0 · Customer Health Engine (pure, deterministic, read-only).
 *
 * Consolidates signals about a customer account (usage, adoption, support,
 * billing) into a single Customer Health Score (0-100) with a rating and
 * ordered list of reasons. No I/O, no side effects.
 */

export type HealthRating = 'CRITICAL' | 'AT_RISK' | 'STABLE' | 'HEALTHY' | 'CHAMPION';

export interface CustomerSignals {
  /** Days since account creation. */
  readonly tenureDays: number;
  /** Days since last user login (any user of the tenant). */
  readonly daysSinceLastLogin: number;
  /** Percent of onboarding checklist completed (0-100). */
  readonly onboardingCompletionPct: number;
  /** Percent of paid modules actively used (0-100). */
  readonly featureAdoptionPct: number;
  /** Sales registered in the last 30 days. */
  readonly sales30d: number;
  /** Sales registered in the previous 30 days (30-60d ago). */
  readonly salesPrev30d: number;
  /** Fiscal documents emitted in the last 30 days. */
  readonly fiscalDocs30d: number;
  /** Open support tickets. */
  readonly openTickets: number;
  /** Support tickets escalated to critical. */
  readonly criticalTickets: number;
  /** Days remaining until subscription renewal (negative = overdue). */
  readonly daysToRenewal: number;
  /** Whether the last invoice is overdue. */
  readonly hasOverdueInvoice: boolean;
  /** Monthly Recurring Revenue in MZN. */
  readonly mrr: number;
}

export interface CustomerHealth {
  readonly score: number;
  readonly rating: HealthRating;
  readonly reasons: string[];
  readonly breakdown: {
    readonly adoption: number;
    readonly engagement: number;
    readonly growth: number;
    readonly support: number;
    readonly billing: number;
  };
}

const clamp = (n: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));

export function ratingOf(score: number): HealthRating {
  const s = clamp(score);
  if (s >= 85) return 'CHAMPION';
  if (s >= 70) return 'HEALTHY';
  if (s >= 55) return 'STABLE';
  if (s >= 35) return 'AT_RISK';
  return 'CRITICAL';
}

export function evaluateCustomerHealth(s: CustomerSignals): CustomerHealth {
  const reasons: string[] = [];

  // Adoption: how much of what they pay for they actually use.
  const adoption = clamp(s.onboardingCompletionPct * 0.4 + s.featureAdoptionPct * 0.6);
  if (adoption < 40) reasons.push('Baixa adoção de funcionalidades');

  // Engagement: recency of activity.
  const loginPenalty = s.daysSinceLastLogin >= 30 ? 80
    : s.daysSinceLastLogin >= 14 ? 50
    : s.daysSinceLastLogin >= 7 ? 25
    : 0;
  const engagement = clamp(100 - loginPenalty);
  if (s.daysSinceLastLogin >= 14) reasons.push(`Sem login há ${s.daysSinceLastLogin} dias`);

  // Growth: trending activity vs previous period.
  const salesRatio = s.salesPrev30d > 0 ? s.sales30d / s.salesPrev30d : (s.sales30d > 0 ? 1.5 : 0);
  const growth = clamp(
    (s.sales30d > 0 ? 40 : 0) +
    (s.fiscalDocs30d > 0 ? 30 : 0) +
    Math.min(30, salesRatio * 20),
  );
  if (s.sales30d === 0 && s.tenureDays > 14) reasons.push('Nenhuma venda nos últimos 30 dias');
  if (salesRatio > 0 && salesRatio < 0.7) reasons.push('Queda de atividade vs período anterior');

  // Support pressure.
  const support = clamp(100 - s.openTickets * 5 - s.criticalTickets * 20);
  if (s.criticalTickets > 0) reasons.push(`${s.criticalTickets} tickets críticos abertos`);

  // Billing health.
  let billing = 100;
  if (s.hasOverdueInvoice) { billing -= 50; reasons.push('Fatura em atraso'); }
  if (s.daysToRenewal <= 7 && s.daysToRenewal >= 0) { billing -= 10; reasons.push(`Renovação em ${s.daysToRenewal} dias`); }
  if (s.daysToRenewal < 0) { billing -= 40; reasons.push('Renovação vencida'); }
  billing = clamp(billing);

  const score = Math.round(
    adoption * 0.25 +
    engagement * 0.25 +
    growth * 0.20 +
    support * 0.15 +
    billing * 0.15,
  );

  return {
    score,
    rating: ratingOf(score),
    reasons,
    breakdown: {
      adoption: Math.round(adoption),
      engagement: Math.round(engagement),
      growth: Math.round(growth),
      support: Math.round(support),
      billing: Math.round(billing),
    },
  };
}
