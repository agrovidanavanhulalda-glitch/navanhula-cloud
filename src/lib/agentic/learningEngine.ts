/**
 * Sprint 4.4 · Learning Engine (pure).
 * Aggregate learning metrics from decision history.
 */
import type { DecisionRecord } from './decisionMemory';

export interface LearningMetrics {
  total: number;
  successRate: number;
  approvalRate: number;
  rejectionRate: number;
  cancelRate: number;
  expireRate: number;
  avgRisk: number;
  avgComplexity: number;
  avgConfidence: number;
  avgDurationMs: number;
  learningScore: number;
  knowledgeConfidence: number;
}

function pct(n: number, total: number): number {
  if (!total) return 0;
  const v = (n / total) * 100;
  return Number.isFinite(v) ? Math.round(v) : 0;
}

function avg(nums: number[]): number {
  const clean = nums.filter((n) => Number.isFinite(n));
  if (!clean.length) return 0;
  return Math.round(clean.reduce((a, b) => a + b, 0) / clean.length);
}

export function computeLearning(decisions: DecisionRecord[] = []): LearningMetrics {
  const list = (decisions ?? []).filter(Boolean);
  const total = list.length;
  const approved = list.filter((d) => d.status === 'APPROVED' || d.status === 'EXECUTED').length;
  const rejected = list.filter((d) => d.status === 'REJECTED').length;
  const cancelled = list.filter((d) => d.status === 'CANCELLED').length;
  const expired = list.filter((d) => d.status === 'EXPIRED').length;

  const approvalRate = pct(approved, total);
  const rejectionRate = pct(rejected, total);
  const cancelRate = pct(cancelled, total);
  const expireRate = pct(expired, total);
  const successRate = approvalRate;

  const avgRisk = avg(list.map((d) => d.riskScore));
  const avgComplexity = avg(list.map((d) => 100 - d.executionScore));
  const avgConfidence = avg(list.map((d) => d.confidence));
  const avgDurationMs = avg(list.map((d) => d.durationMs));

  const learningScore = Math.max(
    0,
    Math.min(100, Math.round(0.5 * successRate + 0.3 * avgConfidence + 0.2 * (100 - avgRisk))),
  );
  const knowledgeConfidence = Math.max(
    0,
    Math.min(100, Math.round(0.6 * avgConfidence + 0.4 * Math.min(100, total * 5))),
  );

  return {
    total,
    successRate,
    approvalRate,
    rejectionRate,
    cancelRate,
    expireRate,
    avgRisk,
    avgComplexity,
    avgConfidence,
    avgDurationMs,
    learningScore,
    knowledgeConfidence,
  };
}
