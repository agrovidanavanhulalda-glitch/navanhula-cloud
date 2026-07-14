/**
 * Sprint 4.2 · Execution Planner (pure orchestrator, advisory only).
 * Turns an approved AgenticPlan into a structured executable plan — NEVER runs anything.
 */
import type { AgenticPlan } from './plannerEngine';
import { buildExecutionGraph, type ExecutionGraph } from './executionGraph';
import { buildRollbackPlan, type RollbackPlan } from './rollbackPlanner';
import { estimateExecution, type ExecutionEstimate } from './executionEstimator';
import { classifyRisk, type RiskAssessment } from './riskPlanner';
import { validateExecution, type ValidationReport } from './executionValidator';
import { simulateWorkflow, type SimulationResult } from './workflowSimulator';

export interface ExecutionPlan {
  planId: string;
  createdAt: string;
  source: AgenticPlan;
  graph: ExecutionGraph;
  rollback: RollbackPlan;
  estimate: ExecutionEstimate;
  risk: RiskAssessment;
  validation: ValidationReport;
  simulation: SimulationResult;
  readiness: 'READY' | 'REVIEW' | 'BLOCKED';
}

export function buildExecutionPlan(plan: AgenticPlan): ExecutionPlan {
  const graph = buildExecutionGraph(plan.tasks);
  const rollback = buildRollbackPlan(plan);
  const estimate = estimateExecution(plan);
  const risk = classifyRisk(plan);
  const validation = validateExecution(graph, rollback, estimate);
  const simulation = simulateWorkflow(estimate, validation);
  const readiness: ExecutionPlan['readiness'] =
    !validation.ok || risk.level === 'CRITICAL'
      ? 'BLOCKED'
      : risk.level === 'HIGH' || validation.score < 80
        ? 'REVIEW'
        : 'READY';
  return {
    planId: `exec-${plan.id}`,
    createdAt: new Date().toISOString(),
    source: plan,
    graph,
    rollback,
    estimate,
    risk,
    validation,
    simulation,
    readiness,
  };
}
