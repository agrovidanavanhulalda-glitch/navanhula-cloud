/**
 * Sprint 4.4 · Knowledge Score (pure).
 */
import type { LearningMetrics } from './learningEngine';

export type KnowledgeRating = 'POOR' | 'FAIR' | 'GOOD' | 'VERY_GOOD' | 'EXCELLENT';

export interface KnowledgeScoreResult {
  score: number;
  rating: KnowledgeRating;
}

export function classifyKnowledge(score: number): KnowledgeRating {
  const s = Number.isFinite(score) ? score : 0;
  if (s >= 85) return 'EXCELLENT';
  if (s >= 70) return 'VERY_GOOD';
  if (s >= 55) return 'GOOD';
  if (s >= 35) return 'FAIR';
  return 'POOR';
}

export function computeKnowledgeScore(m: LearningMetrics): KnowledgeScoreResult {
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(0.4 * m.learningScore + 0.3 * m.knowledgeConfidence + 0.3 * m.successRate),
    ),
  );
  return { score, rating: classifyKnowledge(score) };
}
