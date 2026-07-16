/**
 * Sprint 5.6.4 · Release Evidence Validator — detects gaps, inconsistencies, thresholds.
 */
import { EVIDENCE_KEYS, type EvidenceKey } from './enterpriseWeightEngine';
import type { AggregatedEvidence } from './evidenceAggregatorFinal';

export type ValidationSeverity = 'INFO' | 'WARN' | 'FAIL';

export interface ValidationIssue {
  readonly key: EvidenceKey | 'aggregate';
  readonly severity: ValidationSeverity;
  readonly message: string;
}

export interface ValidationReport {
  readonly issues: readonly ValidationIssue[];
  readonly failCount: number;
  readonly warnCount: number;
  readonly infoCount: number;
  readonly valid: boolean;
}

export function validateEvidence(agg: AggregatedEvidence): ValidationReport {
  const issues: ValidationIssue[] = [];
  for (const k of EVIDENCE_KEYS) {
    const v = agg.domains[k];
    if (v <= 0) issues.push({ key: k, severity: 'FAIL', message: `${k}: evidência ausente` });
    else if (v < 50) issues.push({ key: k, severity: 'FAIL', message: `${k}=${v} abaixo do mínimo crítico` });
    else if (v < 75) issues.push({ key: k, severity: 'WARN', message: `${k}=${v} abaixo do alvo enterprise` });
    else if (v < 90) issues.push({ key: k, severity: 'INFO', message: `${k}=${v} ok, oportunidade de melhoria` });
  }
  if (agg.completeness < 100) {
    issues.push({
      key: 'aggregate',
      severity: agg.completeness < 80 ? 'FAIL' : 'WARN',
      message: `Cobertura de evidência ${agg.completeness}%`,
    });
  }
  const failCount = issues.filter((i) => i.severity === 'FAIL').length;
  const warnCount = issues.filter((i) => i.severity === 'WARN').length;
  const infoCount = issues.filter((i) => i.severity === 'INFO').length;
  return { issues, failCount, warnCount, infoCount, valid: failCount === 0 };
}
