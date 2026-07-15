/**
 * Sprint 4.9 · Decision Summary Engine (pure).
 */
import type { NormalizedDecision } from './decisionIntelligenceEngine';
import { evaluateHealth } from './decisionHealthEngine';
import { analyzePortfolio } from './decisionPortfolioEngine';
import { generateExecutiveDecisions, type ExecutiveRow } from './executiveDecisionEngine';
import { topDecisions, type PriorityRow } from './decisionPriorityEngine';

export interface DecisionSummary {
  generatedAt: string;
  total: number;
  health: ReturnType<typeof evaluateHealth>;
  portfolio: ReturnType<typeof analyzePortfolio>;
  top10: PriorityRow[];
  executive: ExecutiveRow[];
  headlines: string[];
}

export function buildDecisionSummary(list: NormalizedDecision[]): DecisionSummary {
  const health = evaluateHealth(list);
  const portfolio = analyzePortfolio(list);
  const executive = generateExecutiveDecisions(list);
  const top10 = topDecisions(list, 10);
  const headlines: string[] = [];
  headlines.push(`${list.length} decisões avaliadas · saúde ${health.rating}`);
  if (portfolio.distribution.P0 > 0) headlines.push(`${portfolio.distribution.P0} P0 críticas`);
  const fastTrack = executive.filter((e) => e.recommendation === 'FAST_TRACK').length;
  if (fastTrack > 0) headlines.push(`${fastTrack} fast-track`);
  return {
    generatedAt: new Date(0).toISOString(),
    total: list.length,
    health,
    portfolio,
    top10,
    executive,
    headlines,
  };
}
