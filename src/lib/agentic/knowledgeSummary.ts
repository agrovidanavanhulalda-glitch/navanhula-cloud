/**
 * Sprint 4.4 · Knowledge Summary (pure).
 * Produces an executive-level summary from learning + patterns.
 */
import type { LearningMetrics } from './learningEngine';
import type { KnowledgeScoreResult } from './knowledgeScore';
import type { DetectedPattern } from './patternEngine';
import type { Recommendation } from './recommendationMemory';

export type MaturityLevel = 'INITIAL' | 'DEVELOPING' | 'DEFINED' | 'MANAGED' | 'OPTIMIZED';

export interface KnowledgeSummary {
  summary: string;
  maturity: MaturityLevel;
  trend: 'UP' | 'FLAT' | 'DOWN';
  alerts: string[];
  nextSteps: string[];
  confidence: number;
}

function maturityFor(score: number): MaturityLevel {
  if (score >= 85) return 'OPTIMIZED';
  if (score >= 70) return 'MANAGED';
  if (score >= 55) return 'DEFINED';
  if (score >= 35) return 'DEVELOPING';
  return 'INITIAL';
}

export function summarizeKnowledge(
  metrics: LearningMetrics,
  score: KnowledgeScoreResult,
  patterns: DetectedPattern[] = [],
  recs: Recommendation[] = [],
): KnowledgeSummary {
  const alerts: string[] = [];
  if (metrics.rejectionRate >= 40) alerts.push(`Rejeição elevada (${metrics.rejectionRate}%).`);
  if (metrics.avgRisk >= 70) alerts.push(`Risco médio alto (${metrics.avgRisk}/100).`);
  if (metrics.expireRate >= 20) alerts.push(`Muitos planos expirando (${metrics.expireRate}%).`);
  if (metrics.total === 0) alerts.push('Base de conhecimento vazia — enviar planos para aprender.');

  const nextSteps = recs.slice(0, 5).map((r) => r.title);
  const trend: 'UP' | 'FLAT' | 'DOWN' =
    metrics.successRate >= 70 ? 'UP' : metrics.successRate <= 30 ? 'DOWN' : 'FLAT';

  const summary =
    metrics.total === 0
      ? 'Sem histórico suficiente para gerar conhecimento.'
      : `Base com ${metrics.total} decisões, sucesso ${metrics.successRate}%, confiança ${metrics.avgConfidence}%. ${patterns.length} padrões detectados.`;

  return {
    summary,
    maturity: maturityFor(score.score),
    trend,
    alerts,
    nextSteps,
    confidence: metrics.knowledgeConfidence,
  };
}
