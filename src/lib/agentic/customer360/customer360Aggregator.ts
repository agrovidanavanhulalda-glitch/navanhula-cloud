import type { Customer360Input } from './types';
import { evaluateCustomer360, type Customer360Assessment } from './customer360Engine';
import { rankCustomers, type RankedCustomer } from './customerRankingEngine';
import { buildPortfolio, type PortfolioBreakdown } from './customerPortfolioEngine';
import { computeBenchmark, type Benchmark } from './customerBenchmarkEngine';
import { generateInsights, type Insight } from './customerInsightsEngine';
import { round } from './_utils';

export interface Customer360Portfolio {
  readonly total: number;
  readonly totalMrr: number;
  readonly avgScore: number;
  readonly avgExecutiveScore: number;
  readonly benchmark: Benchmark;
  readonly portfolio: PortfolioBreakdown;
  readonly ranking: readonly RankedCustomer[];
  readonly topPremium: readonly RankedCustomer[];
  readonly topAtRisk: readonly RankedCustomer[];
  readonly assessments: readonly Customer360Assessment[];
  readonly insights: readonly Insight[];
}

export function assessCustomer360Portfolio(
  customers: readonly Customer360Input[],
): Customer360Portfolio {
  const assessments = customers.map(evaluateCustomer360);
  const total = assessments.length;
  const totalMrr = round(assessments.reduce((s, a) => s + a.mrr, 0));
  const avgScore = total > 0
    ? Math.round(assessments.reduce((s, a) => s + a.score.score, 0) / total)
    : 0;
  const avgExecutiveScore = total > 0
    ? Math.round(assessments.reduce((s, a) => s + a.executive.score, 0) / total)
    : 0;

  const ranking = rankCustomers(customers);
  const topPremium = ranking.filter((r) => r.tier === 'PLATINUM' || r.tier === 'GOLD').slice(0, 10);
  const topAtRisk = [...ranking].sort((a, b) => b.risk - a.risk).slice(0, 10);

  return {
    total,
    totalMrr,
    avgScore,
    avgExecutiveScore,
    benchmark: computeBenchmark(customers),
    portfolio: buildPortfolio(customers),
    ranking,
    topPremium,
    topAtRisk,
    assessments,
    insights: generateInsights(customers),
  };
}
