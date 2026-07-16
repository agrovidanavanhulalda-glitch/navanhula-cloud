/**
 * Sprint 7.1 · Milestone Engine (pure).
 * Detects reached milestones and identifies the next one for the customer.
 */
import type { CustomerSignals } from '../customer-success/customerHealthEngine';

const num = (n: number): number => (Number.isFinite(n) ? n : 0);

export interface Milestone {
  readonly id: string;
  readonly label: string;
  readonly reached: boolean;
}

export interface MilestoneResult {
  readonly milestones: Milestone[];
  readonly nextMilestone: Milestone | null;
  readonly reachedCount: number;
}

export function evaluateMilestones(s: CustomerSignals): MilestoneResult {
  const onboarding = num(s.onboardingCompletionPct);
  const sales = num(s.sales30d) + num(s.salesPrev30d);
  const fiscal = num(s.fiscalDocs30d);
  const adoption = num(s.featureAdoptionPct);
  const tenure = num(s.tenureDays);

  const milestones: Milestone[] = [
    { id: 'account_created', label: 'Conta criada', reached: tenure > 0 },
    { id: 'onboarding_started', label: 'Onboarding iniciado', reached: onboarding > 0 },
    { id: 'onboarding_completed', label: 'Onboarding completo', reached: onboarding >= 100 },
    { id: 'first_sale', label: 'Primeira venda', reached: sales > 0 },
    { id: 'first_fiscal_doc', label: 'Primeiro documento fiscal', reached: fiscal > 0 },
    { id: 'ten_sales', label: '10 vendas registadas', reached: sales >= 10 },
    { id: 'adoption_70', label: 'Adoção ≥ 70%', reached: adoption >= 70 },
    { id: 'tenure_90d', label: '90 dias na plataforma', reached: tenure >= 90 },
    { id: 'tenure_365d', label: '1 ano na plataforma', reached: tenure >= 365 },
  ];

  const nextMilestone = milestones.find((m) => !m.reached) ?? null;
  const reachedCount = milestones.filter((m) => m.reached).length;
  return { milestones, nextMilestone, reachedCount };
}
