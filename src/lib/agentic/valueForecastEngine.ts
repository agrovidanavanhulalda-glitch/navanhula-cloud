/**
 * Sprint 5.1 · Value Forecast Engine (pure).
 * Projects value realization based on current progress and risk.
 */
import type { TransformationItem } from './transformationEngine';

export interface ValueForecast {
  projected3m: number;
  projected6m: number;
  projected12m: number;
  confidence: number; // 0-100
}

export function forecastValue(items: TransformationItem[] = []): ValueForecast {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) {
    return { projected3m: 0, projected6m: 0, projected12m: 0, confidence: 0 };
  }
  let base = 0;
  let confSum = 0;
  list.forEach((i) => {
    const remaining = i.value * (1 - i.progress / 100);
    const riskFactor = 1 - (i.risk / 200); // risk drag
    base += Math.max(0, remaining * riskFactor);
    confSum += (100 - i.risk) * (i.alignment / 100);
  });
  const confidence = Math.max(0, Math.min(100, Math.round(confSum / list.length)));
  return {
    projected3m: Math.round(base * 0.25),
    projected6m: Math.round(base * 0.5),
    projected12m: Math.round(base),
    confidence,
  };
}
