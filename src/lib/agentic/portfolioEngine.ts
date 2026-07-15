/**
 * Sprint 4.7 · Portfolio Engine (pure).
 */
import type { Initiative } from './initiativeEngine';
import type { PriorityItem } from './priorityMatrix';

export interface PortfolioView {
  total: number;
  byBand: Record<'P0' | 'P1' | 'P2' | 'P3', number>;
  avgImpact: number;
  avgEffort: number;
  avgRisk: number;
  avgConfidence: number;
  balance: 'BALANCED' | 'RISKY' | 'CONSERVATIVE' | 'EMPTY';
}

export function buildPortfolio(initiatives: Initiative[], priorities: PriorityItem[]): PortfolioView {
  const total = initiatives.length;
  const byBand = { P0: 0, P1: 0, P2: 0, P3: 0 } as PortfolioView['byBand'];
  priorities.forEach((p) => { byBand[p.band]++; });
  if (total === 0) {
    return { total: 0, byBand, avgImpact: 0, avgEffort: 0, avgRisk: 0, avgConfidence: 0, balance: 'EMPTY' };
  }
  const sum = initiatives.reduce(
    (a, i) => ({
      impact: a.impact + i.impact,
      effort: a.effort + i.effort,
      risk: a.risk + i.risk,
      conf: a.conf + i.confidence,
    }),
    { impact: 0, effort: 0, risk: 0, conf: 0 },
  );
  const avgImpact = +(sum.impact / total).toFixed(2);
  const avgEffort = +(sum.effort / total).toFixed(2);
  const avgRisk = +(sum.risk / total).toFixed(2);
  const avgConfidence = Math.round(sum.conf / total);
  let balance: PortfolioView['balance'] = 'BALANCED';
  if (avgRisk >= 7) balance = 'RISKY';
  else if (avgImpact <= 4 && avgRisk <= 3) balance = 'CONSERVATIVE';
  return { total, byBand, avgImpact, avgEffort, avgRisk, avgConfidence, balance };
}
