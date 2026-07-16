import type { Customer360Input } from './types';
import { computeBenchmark } from './customerBenchmarkEngine';
import { computeRisk } from './customerRiskIndex';
import { detectOpportunity } from './customerOpportunityEngine';

export interface Insight {
  readonly kind: 'risk' | 'opportunity' | 'benchmark' | 'health';
  readonly message: string;
}

export function generateInsights(customers: readonly Customer360Input[]): Insight[] {
  const insights: Insight[] = [];
  if (!customers.length) return insights;
  const bench = computeBenchmark(customers);
  insights.push({ kind: 'benchmark', message: `Score médio da carteira: ${bench.avgScore}` });

  let highRisk = 0;
  let opportunities = 0;
  for (const c of customers) {
    if (computeRisk(c).band === 'HIGH' || computeRisk(c).band === 'CRITICAL') highRisk++;
    if (detectOpportunity(c).hasOpportunity) opportunities++;
  }
  if (highRisk > 0) insights.push({ kind: 'risk', message: `${highRisk} clientes em risco elevado` });
  if (opportunities > 0) insights.push({ kind: 'opportunity', message: `${opportunities} oportunidades identificadas` });
  if (bench.avgNps < 0) insights.push({ kind: 'health', message: `NPS médio negativo (${bench.avgNps})` });
  return insights;
}
