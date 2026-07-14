/**
 * Sprint 4.2 · Rollback Planner (pure).
 */
import type { AgenticPlan } from './plannerEngine';
import type { AgenticTask } from './taskEngine';

export interface RollbackStep {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface RollbackPlan {
  steps: RollbackStep[];
  validation: RollbackStep;
  finish: RollbackStep;
  estimatedMinutes: number;
  readiness: 'READY' | 'PARTIAL' | 'MISSING';
}

export function buildRollbackPlan(plan: AgenticPlan | null | undefined): RollbackPlan {
  const source: AgenticTask[] = plan?.tasks.rollback ?? [];
  const steps: RollbackStep[] = source.map((t, i) => ({
    id: `rb-step-${i + 1}`,
    title: t.title,
    description: t.description,
    order: i + 1,
  }));
  const validation: RollbackStep = {
    id: 'rb-validation',
    title: 'Validar rollback',
    description: 'Confirmar métricas restauradas ao estado anterior.',
    order: steps.length + 1,
  };
  const finish: RollbackStep = {
    id: 'rb-finish',
    title: 'Encerrar rollback',
    description: 'Registrar decisão e resultado no audit trail.',
    order: steps.length + 2,
  };
  const estimatedMinutes = source.reduce((s, t) => s + (Number.isFinite(t.estimatedMinutes) ? t.estimatedMinutes : 0), 0) + 5;
  const readiness: RollbackPlan['readiness'] =
    steps.length === 0 ? 'MISSING' : steps.length < 2 ? 'PARTIAL' : 'READY';
  return { steps, validation, finish, estimatedMinutes, readiness };
}
