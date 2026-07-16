/**
 * Sprint 5.6 · Release Checklist Engine — pure.
 */
import type { QualityGateReport } from './qualityGateEngine';
import type { GAScoreReport } from './gaScoreEngine';

export interface ChecklistItem {
  readonly id: string;
  readonly label: string;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  readonly passed: boolean;
}

export interface ReleaseChecklistReport {
  readonly items: readonly ChecklistItem[];
  readonly criticalFailed: number;
  readonly highFailed: number;
  readonly mediumFailed: number;
  readonly readyForRelease: boolean;
}

export function buildReleaseChecklist(
  gate: QualityGateReport,
  score: GAScoreReport,
): ReleaseChecklistReport {
  const items: ChecklistItem[] = [
    { id: 'gate', label: 'Quality Gate passed', severity: 'CRITICAL', passed: gate.passed },
    { id: 'ga', label: 'GA score >= 82 (A+/A)', severity: 'CRITICAL', passed: score.overall >= 82 },
    { id: 'security', label: 'Security score >= 80', severity: 'CRITICAL', passed: score.securityScore >= 80 },
    { id: 'compliance', label: 'Compliance score >= 75', severity: 'HIGH', passed: score.complianceScore >= 75 },
    { id: 'recovery', label: 'Recovery score >= 70', severity: 'HIGH', passed: score.recoveryScore >= 70 },
    { id: 'ops', label: 'Operational score >= 75', severity: 'HIGH', passed: score.operationalScore >= 75 },
    { id: 'arch', label: 'Architecture score >= 75', severity: 'MEDIUM', passed: score.architectureScore >= 75 },
    { id: 'testing', label: 'Testing score >= 80', severity: 'MEDIUM', passed: score.testingScore >= 80 },
  ];
  const criticalFailed = items.filter((i) => !i.passed && i.severity === 'CRITICAL').length;
  const highFailed = items.filter((i) => !i.passed && i.severity === 'HIGH').length;
  const mediumFailed = items.filter((i) => !i.passed && i.severity === 'MEDIUM').length;
  const readyForRelease = criticalFailed === 0 && highFailed === 0;
  return { items, criticalFailed, highFailed, mediumFailed, readyForRelease };
}
