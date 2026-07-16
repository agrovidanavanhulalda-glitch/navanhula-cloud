/**
 * Sprint 5.6.1 · Enterprise Readiness — GA gating rules.
 */
import type { EvidenceReport } from './enterpriseEvidenceEngine';
import type { CalibrationReport } from './enterpriseCalibration';

export type ReleaseStage =
  | 'Enterprise GA' | 'RC-2' | 'RC-1' | 'RC' | 'Conditional GO' | 'NOT READY';

export interface EnterpriseGaCriterion {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly threshold: number;
  readonly passed: boolean;
}

export interface EnterpriseReadinessReport {
  readonly criteria: readonly EnterpriseGaCriterion[];
  readonly gaEligible: boolean;
  readonly stage: ReleaseStage;
  readonly passedCount: number;
  readonly totalCount: number;
}

export function evaluateEnterpriseReadiness(
  evidence: EvidenceReport,
  calibration: CalibrationReport,
): EnterpriseReadinessReport {
  const v = evidence.values;
  const criteria: EnterpriseGaCriterion[] = [
    { id: 'security', label: 'Security >= 92', value: v.security, threshold: 92, passed: v.security >= 92 },
    { id: 'testing', label: 'Testing >= 95', value: v.testing, threshold: 95, passed: v.testing >= 95 },
    { id: 'architecture', label: 'Architecture >= 92', value: v.architecture, threshold: 92, passed: v.architecture >= 92 },
    { id: 'operations', label: 'Operations >= 92', value: v.operations, threshold: 92, passed: v.operations >= 92 },
    { id: 'compliance', label: 'Compliance >= 92', value: v.compliance, threshold: 92, passed: v.compliance >= 92 },
    { id: 'governance', label: 'Governance >= 92', value: v.governance, threshold: 92, passed: v.governance >= 92 },
    { id: 'enterprise', label: 'Enterprise Score >= 92', value: calibration.enterpriseScore, threshold: 92, passed: calibration.enterpriseScore >= 92 },
    { id: 'ga', label: 'GA Score >= 92', value: calibration.gaScore, threshold: 92, passed: calibration.gaScore >= 92 },
    { id: 'production', label: 'Production Readiness >= 92', value: calibration.productionReadiness, threshold: 92, passed: calibration.productionReadiness >= 92 },
    { id: 'critical', label: 'Zero Critical (<50)', value: evidence.criticalCount, threshold: 0, passed: evidence.criticalCount === 0 },
    { id: 'high', label: 'Zero High (<70)', value: evidence.highCount, threshold: 0, passed: evidence.highCount === 0 },
  ];
  const passedCount = criteria.filter((c) => c.passed).length;
  const totalCount = criteria.length;
  const gaEligible = passedCount === totalCount;
  const ratio = passedCount / totalCount;
  const stage: ReleaseStage =
    gaEligible ? 'Enterprise GA' :
    ratio >= 0.9 ? 'RC-2' :
    ratio >= 0.8 ? 'RC-1' :
    ratio >= 0.7 ? 'RC' :
    ratio >= 0.5 ? 'Conditional GO' : 'NOT READY';
  return { criteria, gaEligible, stage, passedCount, totalCount };
}
