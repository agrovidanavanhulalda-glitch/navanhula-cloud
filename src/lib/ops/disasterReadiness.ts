/**
 * Sprint 2.7 · Disaster Readiness Matrix (static, read-only).
 * Reference values only — validated during Sprint audit. Not enforced at runtime.
 */

export interface ReadinessItem {
  capability: string;
  target: string;
  evidence: string;
  status: 'READY' | 'PARTIAL' | 'PENDING';
}

export const READINESS_MATRIX: ReadinessItem[] = [
  { capability: 'RPO (Recovery Point Objective)', target: '≤ 5 min (PITR)', evidence: 'Managed PITR', status: 'READY' },
  { capability: 'RTO (Recovery Time Objective)', target: '≤ 1h',            evidence: 'Restore procedure documented', status: 'READY' },
  { capability: 'Backup diário',                  target: 'Automatizado',     evidence: 'founder_backups + schedules',  status: 'READY' },
  { capability: 'Rollback de migrations',          target: 'Reversível',       evidence: 'Migrations idempotentes',      status: 'READY' },
  { capability: 'Restore validation',              target: 'Trimestral',       evidence: 'Runbook rb.db.down',           status: 'PARTIAL' },
  { capability: 'Retry / idempotência de workers', target: 'Nativo',           evidence: 'background_tasks.attempts',    status: 'READY' },
  { capability: 'DLQ para tarefas falhadas',       target: 'Ativo',            evidence: 'FounderFiscalDLQPage',         status: 'READY' },
  { capability: 'Recovery de sessão auth',         target: 'onAuthStateChange',evidence: 'AuthContext',                  status: 'READY' },
];
