/**
 * Sprint 5.4 · Recovery Readiness Engine — pure.
 */
import type { RecoveryObjectivesReport } from './recoveryObjectiveEngine';
import type { BackupReport } from './backupValidationEngine';
import type { FailoverReport } from './failoverPlanner';

export interface RecoveryReadinessReport {
  score: number;
  rtoAlignment: number;
  rpoAlignment: number;
}

export function computeRecoveryReadiness(
  objectives: RecoveryObjectivesReport,
  backups: BackupReport,
  failover: FailoverReport,
): RecoveryReadinessReport {
  // RTO alignment: lower avg RTO + higher failover readiness => better.
  const rtoAlignment = objectives.rows.length === 0
    ? 0
    : Math.max(0, Math.min(100, Math.round(
        failover.score * 0.7 + (1 - Math.min(1, objectives.averageRtoHours / 48)) * 30,
      )));
  // RPO alignment: lower avg RPO + healthier backups => better.
  const rpoAlignment = objectives.rows.length === 0
    ? 0
    : Math.max(0, Math.min(100, Math.round(
        backups.score * 0.7 + (1 - Math.min(1, objectives.averageRpoHours / 24)) * 30,
      )));
  const score = Math.round((rtoAlignment + rpoAlignment) / 2);
  return { score: Math.max(0, Math.min(100, score)), rtoAlignment, rpoAlignment };
}
