/**
 * Sprint 4.9 · Decision Portfolio Engine (pure).
 */
import type { NormalizedDecision } from './decisionIntelligenceEngine';
import { scoreDecisions } from './decisionScoreEngine';

export interface PortfolioReport {
  total: number;
  avgScore: number;
  avgRisk: number;
  avgConfidence: number;
  distribution: { P0: number; P1: number; P2: number; P3: number };
  balance: 'UNDERWEIGHT' | 'BALANCED' | 'OVERLOADED';
}

export function analyzePortfolio(list: NormalizedDecision[]): PortfolioReport {
  const total = list.length;
  if (total === 0) {
    return {
      total: 0,
      avgScore: 0,
      avgRisk: 0,
      avgConfidence: 0,
      distribution: { P0: 0, P1: 0, P2: 0, P3: 0 },
      balance: 'UNDERWEIGHT',
    };
  }
  const scores = scoreDecisions(list);
  const avgScore = Math.round(scores.reduce((a, b) => a + b.score, 0) / total);
  const avgRisk = Math.round(list.reduce((a, b) => a + b.risk, 0) / total);
  const avgConfidence = Math.round(list.reduce((a, b) => a + b.confidence, 0) / total);
  const dist = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const s of scores) {
    if (s.score >= 80) dist.P0++;
    else if (s.score >= 60) dist.P1++;
    else if (s.score >= 40) dist.P2++;
    else dist.P3++;
  }
  const balance: PortfolioReport['balance'] =
    total > 20 ? 'OVERLOADED' : total < 3 ? 'UNDERWEIGHT' : 'BALANCED';
  return { total, avgScore, avgRisk, avgConfidence, distribution: dist, balance };
}
