import type { CustomerEvidence } from './types';
import { aggregateCustomerEvidence } from './customerEvidenceAggregator';
import { EVIDENCE_KEYS } from './types';

export interface ReleaseSummary {
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly recommendations: readonly string[];
}

export function summarizeCustomerRelease(input: CustomerEvidence = {}): ReleaseSummary {
  const { collected } = aggregateCustomerEvidence(input);
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  for (const k of EVIDENCE_KEYS) {
    const v = collected.values[k];
    if (!collected.present[k]) {
      weaknesses.push(`Falta evidência: ${k}`);
      recommendations.push(`Coletar evidência ${k}`);
    } else if (v >= 80) {
      strengths.push(`${k} forte (${v})`);
    } else if (v < 60) {
      weaknesses.push(`${k} baixo (${v})`);
      recommendations.push(`Elevar ${k} acima de 75`);
    }
  }
  if (strengths.length === 0) strengths.push('Nenhum pilar em nível excelente ainda');
  if (recommendations.length === 0) recommendations.push('Manter monitorização contínua');
  return { strengths, weaknesses, recommendations };
}
