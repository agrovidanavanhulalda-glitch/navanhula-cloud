/**
 * Sprint 5.1 · Value Engine (pure).
 * Computes overall business value score from transformation items.
 */
import type { TransformationItem } from './transformationEngine';

export interface ValueScore {
  score: number;   // 0-100
  totalValue: number;
  totalInvestment: number;
  netValue: number;
  rating: 'LOW' | 'MEDIUM' | 'HIGH' | 'STRATEGIC';
}

export function computeValueScore(items: TransformationItem[] = []): ValueScore {
  const list = Array.isArray(items) ? items : [];
  const totalValue = list.reduce((s, i) => s + i.value, 0);
  const totalInvestment = list.reduce((s, i) => s + i.investment, 0);
  const netValue = totalValue - totalInvestment;
  let score = 0;
  if (list.length > 0) {
    const alignAvg = list.reduce((s, i) => s + i.alignment, 0) / list.length;
    const riskAvg = list.reduce((s, i) => s + i.risk, 0) / list.length;
    const roiPct = totalInvestment === 0
      ? (totalValue > 0 ? 100 : 0)
      : Math.max(-100, Math.min(200, (netValue / totalInvestment) * 100));
    const roiNorm = Math.max(0, Math.min(100, (roiPct + 100) / 3));
    score = Math.round(alignAvg * 0.4 + roiNorm * 0.4 + (100 - riskAvg) * 0.2);
  }
  score = Math.max(0, Math.min(100, score));
  const rating: ValueScore['rating'] =
    score >= 80 ? 'STRATEGIC' :
    score >= 60 ? 'HIGH' :
    score >= 35 ? 'MEDIUM' : 'LOW';
  return { score, totalValue, totalInvestment, netValue, rating };
}
