/**
 * Sprint 5.2 · Risk Portfolio Engine (pure).
 */
import type { NormalizedRisk, RiskCategory } from './enterpriseRiskEngine';
import { inherentRisk } from './enterpriseRiskEngine';

export interface PortfolioSlice {
  category: RiskCategory;
  count: number;
  avgScore: number;
  peakScore: number;
}

export interface PortfolioReport {
  slices: PortfolioSlice[];
  concentration: number; // 0-100: HHI-style
  diversified: boolean;
}

export function analyzePortfolio(list: NormalizedRisk[]): PortfolioReport {
  const buckets = new Map<RiskCategory, NormalizedRisk[]>();
  for (const r of list) {
    const arr = buckets.get(r.category) ?? [];
    arr.push(r);
    buckets.set(r.category, arr);
  }
  const slices: PortfolioSlice[] = Array.from(buckets.entries())
    .map(([category, items]) => {
      const scores = items.map(inherentRisk);
      const avg = scores.length === 0 ? 0 : Math.round(scores.reduce((s, n) => s + n, 0) / scores.length);
      const peak = scores.reduce((m, n) => (n > m ? n : m), 0);
      return { category, count: items.length, avgScore: avg, peakScore: peak };
    })
    .sort((a, b) => (b.avgScore - a.avgScore) || a.category.localeCompare(b.category));

  const total = list.length;
  let hhi = 0;
  if (total > 0) {
    for (const s of slices) {
      const share = s.count / total;
      hhi += share * share;
    }
  }
  const concentration = Math.round(hhi * 100);
  return { slices, concentration, diversified: concentration <= 40 };
}
