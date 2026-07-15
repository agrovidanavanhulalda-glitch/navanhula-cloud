/**
 * Sprint 5.4 · Continuity Summary Engine — pure.
 */
import type { ContinuityScore } from './continuityScoreEngine';
import type { RecoveryReadinessReport } from './recoveryReadinessEngine';
import type { ResilienceReport } from './resiliencePlanner';
import type { AvailabilityReport } from './serviceAvailabilityEngine';
import type { BackupReport } from './backupValidationEngine';
import type { FailoverReport } from './failoverPlanner';
import type { BIARow } from './businessImpactAnalysis';
import type { ScenariosReport } from './disasterScenarioEngine';

export interface ContinuitySummary {
  grade: ContinuityScore['grade'];
  status: ContinuityScore['status'];
  headline: string;
  bullets: string[];
}

export function summarizeContinuity(input: {
  score: ContinuityScore;
  readiness: RecoveryReadinessReport;
  resilience: ResilienceReport;
  availability: AvailabilityReport;
  backups: BackupReport;
  failover: FailoverReport;
  critical: BIARow[];
  scenarios: ScenariosReport;
}): ContinuitySummary {
  const { score, readiness, resilience, availability, backups, failover, critical, scenarios } = input;
  const headline = `Continuidade ${score.grade} · ${score.total}/100 · ${score.status}`;
  const bullets = [
    `Recovery Readiness: ${readiness.score}/100 (RTO ${readiness.rtoAlignment}, RPO ${readiness.rpoAlignment})`,
    `Resiliência: ${resilience.grade} (${resilience.score}/100) · Disponibilidade média: ${availability.average}%`,
    `Backups: ${backups.score}/100 · ${backups.staleCount} desatualizado(s) · Failover: ${failover.score}/100 (${failover.untestedCount} sem teste)`,
    `Processos críticos: ${critical.length} · Piores cenários severidade média: ${scenarios.averageSeverity}/100`,
  ];
  return { grade: score.grade, status: score.status, headline, bullets };
}
