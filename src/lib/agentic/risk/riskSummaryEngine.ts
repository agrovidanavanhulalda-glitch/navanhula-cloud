/**
 * Sprint 5.2 · Risk Summary Engine (pure).
 */
import type { NormalizedRisk } from './enterpriseRiskEngine';
import { computeExecutiveScore } from './riskScoreEngine';
import { computeExposure } from './riskExposureEngine';
import { computeResidual } from './residualRiskEngine';
import { computeTrend } from './riskTrendEngine';

export interface RiskSummary {
  headline: string;
  highlights: string[];
  warnings: string[];
  recommendation: 'PROCEED' | 'MONITOR' | 'REVIEW' | 'ESCALATE';
}

export function buildRiskSummary(list: NormalizedRisk[]): RiskSummary {
  const score = computeExecutiveScore(list);
  const exposure = computeExposure(list);
  const residual = computeResidual(list);
  const trend = computeTrend(list);

  const highlights: string[] = [
    `Executive Risk Score ${score.score} (${score.rating})`,
    `Exposição média ${exposure.totalExposure} · pico ${exposure.peak}`,
    `Residual médio: ${residual.avgBefore} → ${residual.avgAfter} (Δ ${residual.avgDelta})`,
    `Tendência: ${trend.direction}`,
  ];

  const warnings: string[] = [];
  if (exposure.critical > 0) warnings.push(`${exposure.critical} risco(s) crítico(s)`);
  if (exposure.high > 0) warnings.push(`${exposure.high} risco(s) alto(s)`);
  if (trend.direction === 'DEGRADING') warnings.push('Tendência de deterioração detectada');

  let recommendation: RiskSummary['recommendation'];
  if (score.score >= 85 && exposure.critical === 0) recommendation = 'PROCEED';
  else if (score.score >= 70) recommendation = 'MONITOR';
  else if (score.score >= 50) recommendation = 'REVIEW';
  else recommendation = 'ESCALATE';

  const headline = list.length === 0
    ? 'Nenhum risco registado — postura Enterprise robusta.'
    : `Postura de risco ${score.rating} com ${list.length} risco(s) avaliado(s).`;

  return { headline, highlights, warnings, recommendation };
}
