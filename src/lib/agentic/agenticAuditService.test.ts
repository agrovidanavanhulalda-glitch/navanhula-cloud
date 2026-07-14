import { describe, it, expect } from 'vitest';
import { summarizeAudit, type AgenticAuditRow } from './agenticAuditService';

const row = (over: Partial<AgenticAuditRow>): AgenticAuditRow => ({
  id: 'x', company_id: null, created_by: null, session_id: null,
  workflow_id: null, decision_id: null, decision_type: 't',
  severity: 'LOW', confidence: 80, risk_score: 10, impact_score: 20,
  status: 'PENDING', recommendation: null, rollback_plan: null,
  evidence_json: {}, metadata_json: {},
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  ...over,
});

describe('agenticAuditService · summarizeAudit', () => {
  it('returns zeroed summary for empty input', () => {
    expect(summarizeAudit([])).toEqual({
      total: 0, pending: 0, approved: 0, rejected: 0,
      cancelled: 0, expired: 0, executed: 0, avgConfidence: 0,
    });
  });

  it('aggregates all statuses and averages confidence', () => {
    const rows: AgenticAuditRow[] = [
      row({ status: 'PENDING', confidence: 60 }),
      row({ status: 'APPROVED', confidence: 90 }),
      row({ status: 'REJECTED', confidence: 40 }),
      row({ status: 'CANCELLED', confidence: 30 }),
      row({ status: 'EXPIRED', confidence: 70 }),
      row({ status: 'EXECUTED', confidence: 100 }),
    ];
    const s = summarizeAudit(rows);
    expect(s.total).toBe(6);
    expect(s.pending).toBe(1);
    expect(s.approved).toBe(1);
    expect(s.rejected).toBe(1);
    expect(s.cancelled).toBe(1);
    expect(s.expired).toBe(1);
    expect(s.executed).toBe(1);
    expect(s.avgConfidence).toBe(Math.round((60 + 90 + 40 + 30 + 70 + 100) / 6));
  });

  it('handles non-numeric confidence gracefully', () => {
    const rows = [row({ confidence: Number.NaN })];
    const s = summarizeAudit(rows);
    expect(s.total).toBe(1);
    expect(s.avgConfidence).toBe(0);
  });
});
