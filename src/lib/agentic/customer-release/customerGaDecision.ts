import type { CustomerEvidence, ReleaseStatus } from './types';
import { aggregateCustomerEvidence } from './customerEvidenceAggregator';
import { evaluateCustomerQualityGate } from './customerQualityGate';
import { computeCustomerReadiness } from './customerReadinessEngine';

export interface GaDecision {
  readonly status: ReleaseStatus;
  readonly rationale: readonly string[];
}

export function decideCustomerGa(input: CustomerEvidence = {}): GaDecision {
  const agg = aggregateCustomerEvidence(input);
  const gate = evaluateCustomerQualityGate(input);
  const readiness = computeCustomerReadiness(input);
  const rationale: string[] = [];

  const complete = agg.collected.completeness;
  const weighted = agg.weighted;

  let status: ReleaseStatus = 'NOT_READY';
  if (complete >= 100 && gate.status === 'PASS' && weighted >= 85 && readiness.production >= 80) {
    status = 'GENERAL_AVAILABILITY';
    rationale.push('Evidências completas; quality gate PASS; score elevado.');
  } else if (complete >= 70 && gate.status !== 'FAIL' && weighted >= 65) {
    status = 'RELEASE_CANDIDATE';
    rationale.push('Evidências parciais mas suficientes; sem falhas críticas.');
  } else {
    rationale.push('Evidências insuficientes ou falhas críticas no quality gate.');
  }
  rationale.push(`Completeness: ${complete}%`);
  rationale.push(`Weighted score: ${weighted}`);
  rationale.push(`Production readiness: ${readiness.production}`);
  return { status, rationale };
}
