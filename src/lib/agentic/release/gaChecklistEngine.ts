/**
 * Sprint 5.6.3 · GA Checklist Engine — final GA gates.
 */
import type { EnterpriseScoreV3 } from './enterpriseScoreV3';
import type { QualityGateReport } from './qualityGateEngine';

export interface GaChecklistItem {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly threshold: number;
  readonly passed: boolean;
}

export interface GaChecklistReport {
  readonly items: readonly GaChecklistItem[];
  readonly passedCount: number;
  readonly totalCount: number;
  readonly allPassed: boolean;
}

export function buildGaChecklist(
  score: EnterpriseScoreV3,
  gate: QualityGateReport,
): GaChecklistReport {
  const v = score.evidence.values;
  const items: GaChecklistItem[] = [
    { id: 'enterprise', label: 'Enterprise Score ≥ 92', value: score.enterpriseScore, threshold: 92, passed: score.enterpriseScore >= 92 },
    { id: 'ga', label: 'GA Score ≥ 92', value: score.gaScore, threshold: 92, passed: score.gaScore >= 92 },
    { id: 'testing', label: 'Testing ≥ 95', value: v.testing, threshold: 95, passed: v.testing >= 95 },
    { id: 'security', label: 'Security ≥ 95', value: v.security, threshold: 95, passed: v.security >= 95 },
    { id: 'architecture', label: 'Architecture ≥ 95', value: v.architecture, threshold: 95, passed: v.architecture >= 95 },
    { id: 'gate', label: 'Quality Gates PASS', value: gate.passedCount, threshold: gate.totalCount, passed: gate.passed },
    { id: 'critical', label: 'Zero Critical', value: score.evidence.criticalCount, threshold: 0, passed: score.evidence.criticalCount === 0 },
    { id: 'high', label: 'Zero High', value: score.evidence.highCount, threshold: 0, passed: score.evidence.highCount === 0 },
  ];
  const passedCount = items.filter((i) => i.passed).length;
  const totalCount = items.length;
  return { items, passedCount, totalCount, allPassed: passedCount === totalCount };
}
