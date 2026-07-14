/**
 * Sprint 4.2 · Execution Validator (pure).
 */
import type { ExecutionGraph } from './executionGraph';
import type { RollbackPlan } from './rollbackPlanner';
import type { ExecutionEstimate } from './executionEstimator';

export interface ValidationIssue {
  code: string;
  severity: 'INFO' | 'WARN' | 'BLOCK';
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  score: number; // 0..100
  issues: ValidationIssue[];
}

export function validateExecution(
  graph: ExecutionGraph | null | undefined,
  rollback: RollbackPlan | null | undefined,
  est: ExecutionEstimate | null | undefined,
): ValidationReport {
  const issues: ValidationIssue[] = [];
  if (!graph || graph.nodes.length <= 2) {
    issues.push({ code: 'EMPTY_GRAPH', severity: 'BLOCK', message: 'Grafo de execução vazio.' });
  }
  if (graph && graph.dependency.cycles.length > 0) {
    issues.push({ code: 'CYCLE', severity: 'BLOCK', message: 'Dependência circular detectada.' });
  }
  if (graph && graph.validationGates.length === 0) {
    issues.push({ code: 'NO_VALIDATION', severity: 'WARN', message: 'Sem gates de validação.' });
  }
  if (!rollback || rollback.readiness === 'MISSING') {
    issues.push({ code: 'NO_ROLLBACK', severity: 'BLOCK', message: 'Rollback ausente.' });
  } else if (rollback.readiness === 'PARTIAL') {
    issues.push({ code: 'PARTIAL_ROLLBACK', severity: 'WARN', message: 'Rollback com apenas 1 passo.' });
  }
  if (est && est.successProbability < 40) {
    issues.push({ code: 'LOW_SUCCESS', severity: 'WARN', message: `Probabilidade de sucesso baixa (${est.successProbability.toFixed(0)}%).` });
  }
  const blocks = issues.filter((i) => i.severity === 'BLOCK').length;
  const warns = issues.filter((i) => i.severity === 'WARN').length;
  const score = Math.max(0, 100 - blocks * 40 - warns * 10);
  return { ok: blocks === 0, score, issues };
}
