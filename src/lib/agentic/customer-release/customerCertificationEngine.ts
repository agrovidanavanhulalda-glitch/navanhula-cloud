import type { CustomerEvidence, CertificationLevel } from './types';
import { aggregateCustomerEvidence } from './customerEvidenceAggregator';
import { evaluateCustomerQualityGate } from './customerQualityGate';

export interface Certification {
  readonly level: CertificationLevel;
  readonly score: number;
  readonly gate: 'PASS' | 'WARN' | 'FAIL';
}

export function certifyCustomerRelease(input: CustomerEvidence = {}): Certification {
  const { weighted } = aggregateCustomerEvidence(input);
  const gate = evaluateCustomerQualityGate(input).status;
  let level: CertificationLevel = 'NONE';
  if (gate !== 'FAIL') {
    if (weighted >= 90) level = 'PLATINUM';
    else if (weighted >= 80) level = 'GOLD';
    else if (weighted >= 70) level = 'SILVER';
    else if (weighted >= 60) level = 'BRONZE';
  }
  return { level, score: weighted, gate };
}
