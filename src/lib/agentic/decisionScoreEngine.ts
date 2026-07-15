/**
 * Sprint 4.9 · Decision Score Engine (pure).
 */
import type { NormalizedDecision } from './decisionIntelligenceEngine';

export type DecisionGrade = 'F' | 'D' | 'C' | 'B' | 'A' | 'A+';

export interface DecisionScoreRow {
  id: string;
  score: number;
  grade: DecisionGrade;
}

export function gradeOf(score: number): DecisionGrade {
  const s = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  if (s >= 90) return 'A+';
  if (s >= 80) return 'A';
  if (s >= 65) return 'B';
  if (s >= 50) return 'C';
  if (s >= 35) return 'D';
  return 'F';
}

export function scoreDecision(d: NormalizedDecision): DecisionScoreRow {
  const raw =
    d.impact * 0.25 +
    d.benefit * 0.15 +
    d.confidence * 0.2 +
    (100 - d.risk) * 0.15 +
    (100 - d.cost) * 0.1 +
    d.urgency * 0.15;
  const score = Math.round(Math.max(0, Math.min(100, raw)));
  return { id: d.id, score, grade: gradeOf(score) };
}

export function scoreDecisions(list: NormalizedDecision[]): DecisionScoreRow[] {
  return list.map(scoreDecision).sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id));
}
