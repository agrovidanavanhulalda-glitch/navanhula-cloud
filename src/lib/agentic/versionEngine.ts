/**
 * Sprint 4.3 · Version Engine (pure).
 * Snapshots each submission of a plan for a workflow.
 */
import type { ExecutionPlan } from './executionPlanner';

export interface PlanVersionSnapshot {
  planId: string;
  readiness: ExecutionPlan['readiness'];
  riskLevel: string;
  riskScore: number;
  executionScore: number;
  rollbackReadiness: string;
  rollbackSteps: number;
  confidence: number;
  avgMinutes: number;
  taskCount: number;
  criticalPathLength: number;
  problemTitle: string;
  problemSeverity: string;
}

export interface PlanVersion {
  workflowId: string;
  version: number;
  createdAt: string;
  snapshot: PlanVersionSnapshot;
}

const VERSIONS = new Map<string, PlanVersion[]>();

function snapshotOf(plan: ExecutionPlan): PlanVersionSnapshot {
  return {
    planId: plan.planId,
    readiness: plan.readiness,
    riskLevel: plan.risk.level,
    riskScore: Number.isFinite(plan.risk.score) ? plan.risk.score : 0,
    executionScore: Number.isFinite(plan.validation.score) ? plan.validation.score : 0,
    rollbackReadiness: plan.rollback.readiness,
    rollbackSteps: plan.rollback.steps.length,
    confidence: Number.isFinite(plan.estimate.confidence) ? plan.estimate.confidence : 0,
    avgMinutes: Number.isFinite(plan.estimate.avgMinutes) ? plan.estimate.avgMinutes : 0,
    taskCount: plan.graph.nodes.length,
    criticalPathLength: plan.graph.criticalPath.length,
    problemTitle: plan.source.problem.title,
    problemSeverity: plan.source.problem.severity,
  };
}

export function addVersion(workflowId: string, plan: ExecutionPlan, currentVersion: number): PlanVersion {
  const list = VERSIONS.get(workflowId) ?? [];
  const version: PlanVersion = {
    workflowId,
    version: currentVersion + 1,
    createdAt: new Date().toISOString(),
    snapshot: snapshotOf(plan),
  };
  list.push(version);
  VERSIONS.set(workflowId, list);
  return version;
}

export function listVersions(workflowId: string): PlanVersion[] {
  return (VERSIONS.get(workflowId) ?? []).slice().sort((a, b) => a.version - b.version);
}

export function latestVersion(workflowId: string): PlanVersion | null {
  const list = listVersions(workflowId);
  return list.length ? list[list.length - 1] : null;
}

export function resetVersionRegistry(): void {
  VERSIONS.clear();
}
