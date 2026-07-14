/**
 * Sprint 4.2 · Risk Planner (pure).
 */
import type { AgenticPlan } from './plannerEngine';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskAssessment {
  level: RiskLevel;
  score: number; // 0..100
  reasons: string[];
}

export function classifyRisk(plan: AgenticPlan | null | undefined): RiskAssessment {
  if (!plan) return { level: 'LOW', score: 0, reasons: ['sem plano fornecido'] };
  const reasons: string[] = [];
  const s = Number.isFinite(plan.score.risk) ? plan.score.risk : 0;
  if (plan.problem.severity === 'CRITICAL') reasons.push('problema classificado como CRITICAL');
  if (plan.requiresFounder) reasons.push('exige aprovação do Founder');
  if (plan.tasks.runbook.length > 5) reasons.push('runbook extenso (>5 passos)');
  if (plan.score.confidence < 50) reasons.push('confiança baixa (<50)');
  const level: RiskLevel = s >= 80 ? 'CRITICAL' : s >= 60 ? 'HIGH' : s >= 30 ? 'MEDIUM' : 'LOW';
  if (reasons.length === 0) reasons.push('sem sinais de risco elevados');
  return { level, score: Math.max(0, Math.min(100, s)), reasons };
}
