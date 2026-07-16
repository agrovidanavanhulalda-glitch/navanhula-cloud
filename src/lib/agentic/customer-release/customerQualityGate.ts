import type { CustomerEvidence, EvidenceKey, QualityGateStatus } from './types';
import { EVIDENCE_KEYS } from './types';
import { aggregateCustomerEvidence } from './customerEvidenceAggregator';

export interface QualityGateCheck {
  readonly key: string;
  readonly status: QualityGateStatus;
  readonly message: string;
}

export interface QualityGateReport {
  readonly status: QualityGateStatus;
  readonly checks: readonly QualityGateCheck[];
  readonly failures: number;
  readonly warnings: number;
  readonly passes: number;
}

const MIN_PASS = 75;
const MIN_WARN = 60;

export function evaluateCustomerQualityGate(input: CustomerEvidence = {}): QualityGateReport {
  const { collected, weighted } = aggregateCustomerEvidence(input);
  const checks: QualityGateCheck[] = [];

  for (const k of EVIDENCE_KEYS as readonly EvidenceKey[]) {
    const present = collected.present[k];
    const v = collected.values[k];
    if (!present) {
      checks.push({ key: k, status: 'FAIL', message: `Evidência ausente: ${k}` });
    } else if (v < MIN_WARN) {
      checks.push({ key: k, status: 'FAIL', message: `${k} abaixo de ${MIN_WARN}` });
    } else if (v < MIN_PASS) {
      checks.push({ key: k, status: 'WARN', message: `${k} abaixo de ${MIN_PASS}` });
    } else {
      checks.push({ key: k, status: 'PASS', message: `${k} OK` });
    }
  }

  checks.push({
    key: 'overall',
    status: weighted >= MIN_PASS ? 'PASS' : weighted >= MIN_WARN ? 'WARN' : 'FAIL',
    message: `Score global ponderado: ${weighted}`,
  });

  const failures = checks.filter((c) => c.status === 'FAIL').length;
  const warnings = checks.filter((c) => c.status === 'WARN').length;
  const passes = checks.filter((c) => c.status === 'PASS').length;
  const status: QualityGateStatus = failures > 0 ? 'FAIL' : warnings > 0 ? 'WARN' : 'PASS';
  return { status, checks, failures, warnings, passes };
}
