/**
 * Sprint 4.2 · Execution Summary (pure).
 */
import type { ExecutionPlan } from './executionPlanner';

export interface ExecutionSummary {
  headline: string;
  time: string;
  risk: string;
  complexity: string;
  impact: string;
  recommendation: string;
  planOverview: string;
  rollbackOverview: string;
  nextSteps: string[];
}

export function summarizeExecution(plan: ExecutionPlan): ExecutionSummary {
  const { estimate, risk, source, graph, rollback, simulation, readiness } = plan;
  const headline = `Plano ${source.problem.title} — ${readiness}`;
  const time = `${estimate.minMinutes}–${estimate.maxMinutes} min (média ${estimate.avgMinutes} min)`;
  const riskLine = `${risk.level} (${risk.score}/100) — ${risk.reasons.slice(0, 2).join('; ')}`;
  const complexity = `${estimate.complexity} (${graph.nodes.length - 2} tarefas)`;
  const impact = `Impacto estimado ${source.score.impact}/100 · Confiança ${estimate.confidence}%`;
  const recommendation =
    readiness === 'READY'
      ? 'Pronto para revisão do Founder.'
      : readiness === 'REVIEW'
        ? 'Requer revisão adicional antes da aprovação.'
        : 'Bloqueado — corrigir issues antes de prosseguir.';
  const planOverview = `${graph.criticalPath.length - 2} passos no caminho crítico, ${graph.validationGates.length} gates de validação.`;
  const rollbackOverview = `${rollback.steps.length} passos de rollback (${rollback.readiness}).`;
  const nextSteps = [
    'Revisar plano no Execution Center',
    'Confirmar rollback e validações',
    simulation.outcome === 'SUCCESS' ? 'Encaminhar para aprovação Founder' : 'Mitigar riscos identificados',
  ];
  return { headline, time, risk: riskLine, complexity, impact, recommendation, planOverview, rollbackOverview, nextSteps };
}
