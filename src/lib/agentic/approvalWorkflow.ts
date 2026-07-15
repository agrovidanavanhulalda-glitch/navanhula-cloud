/**
 * Sprint 4.3 · Approval Workflow (pure, in-memory registry).
 * Founder Human-in-the-Loop. NEVER executes anything.
 */
import type { ExecutionPlan } from './executionPlanner';
import { addVersion, listVersions, type PlanVersion } from './versionEngine';
import { addComment, listComments, type ApprovalComment } from './commentEngine';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export interface ApprovalWorkflow {
  workflowId: string;
  planId: string;
  problemTitle: string;
  status: ApprovalStatus;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  riskScore: number;
  executionScore: number;
  rollbackScore: number;
  confidence: number;
  auditId: string | null;
}

const REGISTRY = new Map<string, ApprovalWorkflow>();
const DEFAULT_TTL_HOURS = 72;

function toWorkflowId(plan: ExecutionPlan): string {
  return `wf-${plan.planId}`;
}

function scoreOf(plan: ExecutionPlan) {
  return {
    riskScore: Math.max(0, Math.min(100, Math.round(plan.risk.score))) || 0,
    executionScore: Math.max(0, Math.min(100, Math.round(plan.validation.score))) || 0,
    rollbackScore:
      plan.rollback.readiness === 'READY' ? 100 : plan.rollback.readiness === 'PARTIAL' ? 60 : 0,
    confidence: Math.max(0, Math.min(100, Math.round(plan.estimate.confidence))) || 0,
  };
}

export function submitForApproval(plan: ExecutionPlan, auditId: string | null = null): ApprovalWorkflow {
  const workflowId = toWorkflowId(plan);
  const now = new Date();
  const existing = REGISTRY.get(workflowId);
  const scores = scoreOf(plan);
  const version = addVersion(workflowId, plan, existing?.currentVersion ?? 0);

  const wf: ApprovalWorkflow = {
    workflowId,
    planId: plan.planId,
    problemTitle: plan.source.problem.title,
    status: 'PENDING',
    currentVersion: version.version,
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + DEFAULT_TTL_HOURS * 3600_000).toISOString(),
    ...scores,
    auditId: auditId ?? existing?.auditId ?? null,
  };
  REGISTRY.set(workflowId, wf);
  return wf;
}

export function transitionStatus(
  workflowId: string,
  next: ApprovalStatus,
  actor: string,
  reason?: string,
): ApprovalWorkflow | null {
  const wf = REGISTRY.get(workflowId);
  if (!wf) return null;
  if (wf.status !== 'PENDING' && next !== 'EXPIRED') return wf;
  wf.status = next;
  wf.updatedAt = new Date().toISOString();
  REGISTRY.set(workflowId, wf);
  addComment(workflowId, {
    author: actor,
    action: next,
    message: reason ?? `Status alterado para ${next}`,
  });
  return wf;
}

export function expireStale(now: Date = new Date()): number {
  let n = 0;
  for (const wf of REGISTRY.values()) {
    if (wf.status === 'PENDING' && new Date(wf.expiresAt).getTime() < now.getTime()) {
      wf.status = 'EXPIRED';
      wf.updatedAt = now.toISOString();
      n++;
    }
  }
  return n;
}

export function getWorkflow(workflowId: string): ApprovalWorkflow | null {
  return REGISTRY.get(workflowId) ?? null;
}

export function listWorkflows(): ApprovalWorkflow[] {
  return Array.from(REGISTRY.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function workflowDetail(workflowId: string): {
  workflow: ApprovalWorkflow | null;
  versions: PlanVersion[];
  comments: ApprovalComment[];
} {
  return {
    workflow: getWorkflow(workflowId),
    versions: listVersions(workflowId),
    comments: listComments(workflowId),
  };
}

export function resetWorkflowRegistry(): void {
  REGISTRY.clear();
}
