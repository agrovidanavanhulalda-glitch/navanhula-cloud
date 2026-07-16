/**
 * Sprint 7.0 · Customer Success Aggregator (pure).
 * Aggregates portfolio-wide metrics from per-customer signals.
 */
import { evaluateCustomerHealth, type CustomerHealth, type CustomerSignals, type HealthRating } from './customerHealthEngine';
import { predictChurn, type ChurnPrediction } from './churnPredictionEngine';
import { detectExpansion, type ExpansionOpportunity } from './expansionEngine';

export interface CustomerRecord {
  readonly id: string;
  readonly name: string;
  readonly planTier: 'starter' | 'pro' | 'enterprise';
  readonly signals: CustomerSignals;
}

export interface CustomerAssessment {
  readonly id: string;
  readonly name: string;
  readonly planTier: CustomerRecord['planTier'];
  readonly health: CustomerHealth;
  readonly churn: ChurnPrediction;
  readonly opportunities: ExpansionOpportunity[];
}

export interface PortfolioAssessment {
  readonly total: number;
  readonly totalMrr: number;
  readonly avgHealth: number;
  readonly nrr: number; // Net Revenue Retention estimate (0-2)
  readonly grr: number; // Gross Revenue Retention estimate (0-1)
  readonly distribution: Record<HealthRating, number>;
  readonly atRiskMrr: number;
  readonly expansionMrr: number;
  readonly topRisks: CustomerAssessment[];
  readonly topOpportunities: CustomerAssessment[];
  readonly customers: CustomerAssessment[];
}

export function assessCustomer(c: CustomerRecord): CustomerAssessment {
  const health = evaluateCustomerHealth(c.signals);
  const churn = predictChurn(c.signals, health);
  const opportunities = detectExpansion(c.signals, c.planTier);
  return { id: c.id, name: c.name, planTier: c.planTier, health, churn, opportunities };
}

export function assessPortfolio(customers: CustomerRecord[]): PortfolioAssessment {
  const assessments = customers.map(assessCustomer);
  const total = assessments.length;
  const totalMrr = customers.reduce((sum, c) => sum + c.signals.mrr, 0);

  const distribution: Record<HealthRating, number> = {
    CRITICAL: 0, AT_RISK: 0, STABLE: 0, HEALTHY: 0, CHAMPION: 0,
  };
  let healthSum = 0;
  let atRiskMrr = 0;
  let expansionMrr = 0;
  let churnedMrr = 0;

  for (let i = 0; i < assessments.length; i++) {
    const a = assessments[i];
    const mrr = customers[i].signals.mrr;
    distribution[a.health.rating]++;
    healthSum += a.health.score;
    if (a.churn.band === 'HIGH' || a.churn.band === 'IMMINENT') atRiskMrr += mrr;
    for (const op of a.opportunities) expansionMrr += op.estimatedMrrLift * (op.confidence / 100);
    churnedMrr += mrr * a.churn.probability30d;
  }

  const avgHealth = total > 0 ? Math.round(healthSum / total) : 0;
  const grr = totalMrr > 0 ? Math.max(0, (totalMrr - churnedMrr) / totalMrr) : 1;
  const nrr = totalMrr > 0 ? (totalMrr - churnedMrr + expansionMrr) / totalMrr : 1;

  const topRisks = [...assessments]
    .sort((a, b) => b.churn.probability30d - a.churn.probability30d)
    .slice(0, 10);
  const topOpportunities = [...assessments]
    .filter((a) => a.opportunities.length > 0)
    .sort((a, b) => {
      const sa = a.opportunities.reduce((s, o) => s + o.estimatedMrrLift, 0);
      const sb = b.opportunities.reduce((s, o) => s + o.estimatedMrrLift, 0);
      return sb - sa;
    })
    .slice(0, 10);

  return {
    total,
    totalMrr: Math.round(totalMrr),
    avgHealth,
    nrr: Math.round(nrr * 100) / 100,
    grr: Math.round(grr * 100) / 100,
    distribution,
    atRiskMrr: Math.round(atRiskMrr),
    expansionMrr: Math.round(expansionMrr),
    topRisks,
    topOpportunities,
    customers: assessments,
  };
}
