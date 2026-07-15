/**
 * Sprint 4.9 · Decision Health Engine (pure).
 */
import type { NormalizedDecision } from './decisionIntelligenceEngine';
import { analyzePortfolio } from './decisionPortfolioEngine';

export type HealthRating = 'CRITICAL' | 'AT_RISK' | 'STABLE' | 'HEALTHY' | 'OPTIMAL';

export interface DecisionHealth {
  score: number; // 0-100
  rating: HealthRating;
  reasons: string[];
}

export function ratingOf(score: number): HealthRating {
  const s = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  if (s >= 85) return 'OPTIMAL';
  if (s >= 70) return 'HEALTHY';
  if (s >= 55) return 'STABLE';
  if (s >= 35) return 'AT_RISK';
  return 'CRITICAL';
}

export function evaluateHealth(list: NormalizedDecision[]): DecisionHealth {
  const p = analyzePortfolio(list);
  const reasons: string[] = [];
  if (p.total === 0) reasons.push('Nenhuma decisão registrada');
  if (p.avgRisk >= 60) reasons.push('Risco médio elevado');
  if (p.avgConfidence < 50) reasons.push('Confiança média baixa');
  if (p.balance === 'OVERLOADED') reasons.push('Portfolio sobrecarregado');
  const score = Math.round(
    Math.max(0, Math.min(100, p.avgScore * 0.5 + p.avgConfidence * 0.3 + (100 - p.avgRisk) * 0.2)),
  );
  return { score, rating: ratingOf(score), reasons };
}
