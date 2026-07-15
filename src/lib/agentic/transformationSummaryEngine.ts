/**
 * Sprint 5.1 · Transformation Summary Engine (pure).
 */
import type { TransformationItem } from './transformationEngine';
import { computeTransformationScore } from './transformationScoreEngine';
import { computeValueScore } from './valueEngine';
import { evaluateRealization } from './valueRealizationEngine';
import { assessRisks } from './transformationRiskEngine';
import { analyzePortfolioValue } from './portfolioValueEngine';
import { forecastValue } from './valueForecastEngine';

export interface TransformationSummary {
  headline: string;
  highlights: string[];
  warnings: string[];
  recommendation: 'ACCELERATE' | 'MAINTAIN' | 'REBALANCE' | 'STABILIZE';
  totals: {
    initiatives: number;
    investment: number;
    value: number;
  };
}

export function buildTransformationSummary(items: TransformationItem[] = []): TransformationSummary {
  const list = Array.isArray(items) ? items : [];
  const score = computeTransformationScore(list);
  const val = computeValueScore(list);
  const real = evaluateRealization(list);
  const risk = assessRisks(list);
  const portfolio = analyzePortfolioValue(list);
  const forecast = forecastValue(list);

  const highlights: string[] = [];
  const warnings: string[] = [];

  highlights.push(`Transformation Score: ${score.score} (${score.rating})`);
  highlights.push(`Business Value: ${val.score} (${val.rating})`);
  highlights.push(`Realization: ${real.realizationRate}% (${real.rating})`);
  highlights.push(`Portfolio ROI: ${portfolio.roi}% · Balance: ${portfolio.balance}`);
  highlights.push(`12m Forecast: ${forecast.projected12m} @ ${forecast.confidence}% confidence`);

  if (risk.critical > 0) warnings.push(`${risk.critical} iniciativa(s) crítica(s)`);
  if (real.rating === 'FAILING') warnings.push('Realização abaixo do esperado');
  if (val.rating === 'LOW') warnings.push('Valor de negócio baixo');
  if (portfolio.balance === 'CONCENTRATED' && list.length > 1) warnings.push('Portfolio concentrado');

  const recommendation: TransformationSummary['recommendation'] =
    score.score >= 80 ? 'ACCELERATE' :
    score.score >= 60 ? 'MAINTAIN' :
    risk.rating === 'CRITICAL' ? 'STABILIZE' : 'REBALANCE';

  return {
    headline: `Enterprise Transformation: ${score.rating} · Value ${val.rating}`,
    highlights,
    warnings,
    recommendation,
    totals: {
      initiatives: list.length,
      investment: portfolio.totalInvestment,
      value: portfolio.totalValue,
    },
  };
}
