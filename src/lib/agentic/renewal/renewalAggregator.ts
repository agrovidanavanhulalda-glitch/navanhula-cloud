/**
 * Sprint 7.3 · Renewal Portfolio Aggregator.
 */
import type { RenewalContract } from './types';
import { evaluateRenewal, type RenewalStatus } from './renewalEngine';
import { estimateRenewalProbability, type RenewalProbability } from './renewalProbability';
import { evaluateRenewalRisk, type RenewalRisk } from './renewalRisk';
import { detectRenewalOpportunity, type RenewalOpportunity } from './renewalOpportunity';
import { evaluateContractHealth, type ContractHealth } from './contractHealth';
import { computeRenewalScore, type RenewalScore } from './renewalScore';
import { prioritizeRenewal, type RenewalPriorityResult } from './renewalPriority';
import { buildRenewalPipeline, type RenewalPipeline } from './renewalPipeline';
import { forecastRenewals, type RenewalForecast } from './renewalForecast';
import { summarizeRenewals, type RenewalSummary } from './renewalSummary';
import { num, round } from './_utils';

export interface RenewalAssessment {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly planTier: RenewalContract['planTier'];
  readonly mrr: number;
  readonly status: RenewalStatus;
  readonly probability: RenewalProbability;
  readonly risk: RenewalRisk;
  readonly opportunity: RenewalOpportunity;
  readonly health: ContractHealth;
  readonly score: RenewalScore;
  readonly priority: RenewalPriorityResult;
}

export interface RenewalPortfolio {
  readonly total: number;
  readonly totalMrr: number;
  readonly avgScore: number;
  readonly pipeline: RenewalPipeline;
  readonly forecast30d: RenewalForecast;
  readonly forecast60d: RenewalForecast;
  readonly forecast90d: RenewalForecast;
  readonly summary: RenewalSummary;
  readonly assessments: readonly RenewalAssessment[];
  readonly topRisks: readonly RenewalAssessment[];
  readonly topOpportunities: readonly RenewalAssessment[];
}

export function assessContract(c: RenewalContract, now: Date = new Date()): RenewalAssessment {
  return {
    id: c.id,
    customerId: c.customerId,
    customerName: c.customerName,
    planTier: c.planTier,
    mrr: num(c.mrr),
    status: evaluateRenewal(c, now),
    probability: estimateRenewalProbability(c),
    risk: evaluateRenewalRisk(c),
    opportunity: detectRenewalOpportunity(c),
    health: evaluateContractHealth(c),
    score: computeRenewalScore(c),
    priority: prioritizeRenewal(c, now),
  };
}

export function assessRenewalPortfolio(
  contracts: readonly RenewalContract[],
  now: Date = new Date(),
): RenewalPortfolio {
  const assessments = contracts.map((c) => assessContract(c, now));
  const total = assessments.length;
  const totalMrr = round(assessments.reduce((s, a) => s + a.mrr, 0));
  const avgScore = total > 0
    ? Math.round(assessments.reduce((s, a) => s + a.score.score, 0) / total)
    : 0;

  const topRisks = [...assessments]
    .sort((a, b) => b.risk.riskScore - a.risk.riskScore || b.mrr - a.mrr)
    .slice(0, 10);
  const topOpportunities = [...assessments]
    .filter((a) => a.opportunity.hasOpportunity)
    .sort((a, b) => b.opportunity.estimatedMrrLift - a.opportunity.estimatedMrrLift)
    .slice(0, 10);

  return {
    total,
    totalMrr,
    avgScore,
    pipeline: buildRenewalPipeline(contracts, now),
    forecast30d: forecastRenewals(contracts, 30, now),
    forecast60d: forecastRenewals(contracts, 60, now),
    forecast90d: forecastRenewals(contracts, 90, now),
    summary: summarizeRenewals(assessments),
    assessments,
    topRisks,
    topOpportunities,
  };
}
