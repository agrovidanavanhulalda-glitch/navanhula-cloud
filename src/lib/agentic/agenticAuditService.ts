/**
 * Sprint 4.1 · Agentic Audit Service (persistent).
 * Founder-only. Writes to public.agentic_audit_log.
 * ADVISORY ONLY — no automated action execution.
 */
import { supabase } from '@/integrations/supabase/client';

export type AgenticSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AgenticStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'EXECUTED';

export interface AgenticAuditRow {
  id: string;
  company_id: string | null;
  created_by: string | null;
  session_id: string | null;
  workflow_id: string | null;
  decision_id: string | null;
  decision_type: string;
  severity: AgenticSeverity;
  confidence: number;
  risk_score: number;
  impact_score: number;
  status: AgenticStatus;
  recommendation: string | null;
  rollback_plan: string | null;
  evidence_json: Record<string, unknown>;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgenticAuditInsert {
  company_id?: string | null;
  session_id?: string | null;
  workflow_id?: string | null;
  decision_id?: string | null;
  decision_type: string;
  severity: AgenticSeverity;
  confidence?: number;
  risk_score?: number;
  impact_score?: number;
  status?: AgenticStatus;
  recommendation?: string | null;
  rollback_plan?: string | null;
  evidence_json?: Record<string, unknown>;
  metadata_json?: Record<string, unknown>;
}

export interface AgenticAuditFilters {
  companyId?: string | null;
  workflowId?: string | null;
  status?: AgenticStatus | null;
  severity?: AgenticSeverity | null;
  minConfidence?: number | null;
  from?: string | null;
  to?: string | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
}

export interface AgenticAuditSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  expired: number;
  executed: number;
  avgConfidence: number;
}

const TABLE = 'agentic_audit_log';

export async function persistAgenticDecision(
  entry: AgenticAuditInsert,
): Promise<AgenticAuditRow | null> {
  const { data: userData } = await supabase.auth.getUser();
  const created_by = userData?.user?.id ?? null;

  const payload = {
    created_by,
    company_id: entry.company_id ?? null,
    session_id: entry.session_id ?? null,
    workflow_id: entry.workflow_id ?? null,
    decision_id: entry.decision_id ?? null,
    decision_type: entry.decision_type,
    severity: entry.severity,
    confidence: entry.confidence ?? 0,
    risk_score: entry.risk_score ?? 0,
    impact_score: entry.impact_score ?? 0,
    status: entry.status ?? 'PENDING',
    recommendation: entry.recommendation ?? null,
    rollback_plan: entry.rollback_plan ?? null,
    evidence_json: entry.evidence_json ?? {},
    metadata_json: entry.metadata_json ?? {},
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(TABLE as any) as any)
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.warn('[agenticAudit] persist failed:', error.message);
    return null;
  }
  return data as AgenticAuditRow;
}

export async function fetchAgenticAudit(
  filters: AgenticAuditFilters = {},
): Promise<{ rows: AgenticAuditRow[]; count: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));
  const fromIdx = (page - 1) * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = (supabase.from(TABLE as any) as any)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(fromIdx, toIdx);

  if (filters.companyId) q = q.eq('company_id', filters.companyId);
  if (filters.workflowId) q = q.eq('workflow_id', filters.workflowId);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.severity) q = q.eq('severity', filters.severity);
  if (typeof filters.minConfidence === 'number') q = q.gte('confidence', filters.minConfidence);
  if (filters.from) q = q.gte('created_at', filters.from);
  if (filters.to) q = q.lte('created_at', filters.to);
  if (filters.search) {
    const s = filters.search.replace(/,/g, ' ');
    q = q.or(
      `decision_type.ilike.%${s}%,recommendation.ilike.%${s}%,workflow_id.ilike.%${s}%,decision_id.ilike.%${s}%`,
    );
  }

  const { data, error, count } = await q;
  if (error) {
    console.warn('[agenticAudit] fetch failed:', error.message);
    return { rows: [], count: 0 };
  }
  return { rows: (data ?? []) as AgenticAuditRow[], count: count ?? 0 };
}

export function summarizeAudit(rows: AgenticAuditRow[]): AgenticAuditSummary {
  const summary: AgenticAuditSummary = {
    total: rows.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    expired: 0,
    executed: 0,
    avgConfidence: 0,
  };
  if (rows.length === 0) return summary;
  let conf = 0;
  for (const r of rows) {
    conf += Number(r.confidence) || 0;
    switch (r.status) {
      case 'PENDING': summary.pending++; break;
      case 'APPROVED': summary.approved++; break;
      case 'REJECTED': summary.rejected++; break;
      case 'CANCELLED': summary.cancelled++; break;
      case 'EXPIRED': summary.expired++; break;
      case 'EXECUTED': summary.executed++; break;
    }
  }
  summary.avgConfidence = Math.round(conf / rows.length);
  return summary;
}

export async function updateAgenticStatus(
  id: string,
  status: AgenticStatus,
  metadata?: Record<string, unknown>,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(TABLE as any) as any)
    .update({ status, metadata_json: metadata ?? {} })
    .eq('id', id);
  if (error) {
    console.warn('[agenticAudit] update failed:', error.message);
    return false;
  }
  return true;
}
