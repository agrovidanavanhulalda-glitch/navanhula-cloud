/**
 * Sprint 7.0 · Expansion Opportunity Engine (pure).
 * Identifies upsell/cross-sell signals from usage patterns.
 */
import type { CustomerSignals } from './customerHealthEngine';

export type OpportunityType = 'UPSELL_PLAN' | 'CROSS_SELL_MODULE' | 'ADD_SEATS' | 'ANNUAL_UPGRADE';

export interface ExpansionOpportunity {
  readonly type: OpportunityType;
  readonly title: string;
  readonly rationale: string;
  readonly estimatedMrrLift: number;
  readonly confidence: number; // 0-100
}

export function detectExpansion(s: CustomerSignals, currentPlanTier: 'starter' | 'pro' | 'enterprise'): ExpansionOpportunity[] {
  const ops: ExpansionOpportunity[] = [];

  if (currentPlanTier === 'starter' && s.sales30d > 200 && s.featureAdoptionPct > 60) {
    ops.push({
      type: 'UPSELL_PLAN',
      title: 'Upgrade para plano Pro',
      rationale: 'Volume de vendas acima da média do Starter com alta adoção',
      estimatedMrrLift: 750,
      confidence: 82,
    });
  }
  if (currentPlanTier === 'pro' && s.sales30d > 1000) {
    ops.push({
      type: 'UPSELL_PLAN',
      title: 'Upgrade para plano Enterprise',
      rationale: 'Escala operacional exige recursos Enterprise',
      estimatedMrrLift: 2000,
      confidence: 78,
    });
  }
  if (s.featureAdoptionPct >= 80 && s.fiscalDocs30d > 0) {
    ops.push({
      type: 'CROSS_SELL_MODULE',
      title: 'Ativar Módulo de Compliance Fiscal Avançado',
      rationale: 'Cliente já usa fiscal intensivamente',
      estimatedMrrLift: 500,
      confidence: 65,
    });
  }
  if (s.daysToRenewal <= 30 && s.daysToRenewal >= 0 && !s.hasOverdueInvoice) {
    ops.push({
      type: 'ANNUAL_UPGRADE',
      title: 'Oferecer plano anual com desconto',
      rationale: 'Renovação próxima e histórico de pagamento saudável',
      estimatedMrrLift: 0,
      confidence: 70,
    });
  }

  return ops.sort((a, b) => b.confidence - a.confidence);
}
