/**
 * Sprint 4.4 · Decision Memory (pure, read-only).
 * Normalizes historical agentic decisions into a common shape.
 * NEVER executes anything.
 */
import type { ApprovalWorkflow, ApprovalStatus } from './approvalWorkflow';
import type { AgenticAuditRow } from './agenticAuditService';

export interface DecisionRecord {
  id: string;
  title: string;
  status: ApprovalStatus | 'EXECUTED';
  riskScore: number;
  executionScore: number;
  rollbackScore: number;
  confidence: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  durationMs: number;
  source: 'workflow' | 'audit';
}

function safeNumber(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function safeDate(v: unknown): string {
  if (typeof v !== 'string') return new Date(0).toISOString();
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date(0).toISOString();
}

export function fromWorkflow(wf: ApprovalWorkflow): DecisionRecord {
  const created = safeDate(wf.createdAt);
  const updated = safeDate(wf.updatedAt);
  return {
    id: wf.workflowId,
    title: wf.problemTitle || 'Untitled',
    status: wf.status,
    riskScore: safeNumber(wf.riskScore),
    executionScore: safeNumber(wf.executionScore),
    rollbackScore: safeNumber(wf.rollbackScore),
    confidence: safeNumber(wf.confidence),
    version: safeNumber(wf.currentVersion, 1),
    createdAt: created,
    updatedAt: updated,
    durationMs: Math.max(0, Date.parse(updated) - Date.parse(created)),
    source: 'workflow',
  };
}

export function fromAudit(row: AgenticAuditRow): DecisionRecord {
  const created = safeDate(row.created_at);
  const updated = safeDate(row.updated_at);
  return {
    id: row.id,
    title: row.decision_type || 'decision',
    status: (row.status as ApprovalStatus | 'EXECUTED') ?? 'PENDING',
    riskScore: safeNumber(row.risk_score),
    executionScore: safeNumber(row.impact_score),
    rollbackScore: row.rollback_plan ? 100 : 0,
    confidence: safeNumber(row.confidence),
    version: 1,
    createdAt: created,
    updatedAt: updated,
    durationMs: Math.max(0, Date.parse(updated) - Date.parse(created)),
    source: 'audit',
  };
}

export function mergeDecisions(
  workflows: ApprovalWorkflow[] = [],
  audit: AgenticAuditRow[] = [],
): DecisionRecord[] {
  const seen = new Set<string>();
  const list: DecisionRecord[] = [];
  for (const w of workflows ?? []) {
    if (!w || seen.has(w.workflowId)) continue;
    seen.add(w.workflowId);
    list.push(fromWorkflow(w));
  }
  for (const r of audit ?? []) {
    if (!r || seen.has(r.id)) continue;
    seen.add(r.id);
    list.push(fromAudit(r));
  }
  return list.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
