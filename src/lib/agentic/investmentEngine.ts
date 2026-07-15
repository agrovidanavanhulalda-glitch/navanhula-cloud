/**
 * Sprint 4.8 · Investment Engine (pure).
 */
export interface InvestmentItem {
  id: string;
  cost?: number;
  benefit?: number;
  effort?: number;
}

export interface InvestmentReport {
  totalCost: number;
  totalBenefit: number;
  netValue: number;
  roi: number;         // %
  paybackScore: number; // 0-100
  rating: 'LOSS' | 'BREAK_EVEN' | 'POSITIVE' | 'EXCELLENT';
}

const num = (n: unknown): number =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0;

export function analyzeInvestment(items: InvestmentItem[] = []): InvestmentReport {
  const list = Array.isArray(items) ? items : [];
  const totalCost = list.reduce((s, i) => s + num(i.cost), 0);
  const totalBenefit = list.reduce((s, i) => s + num(i.benefit), 0);
  const netValue = totalBenefit - totalCost;
  const roi = totalCost === 0 ? (totalBenefit > 0 ? 100 : 0) : Math.round((netValue / totalCost) * 100);
  const paybackScore = Math.max(0, Math.min(100, Math.round(50 + roi / 4)));
  const rating: InvestmentReport['rating'] =
    roi >= 100 ? 'EXCELLENT' :
    roi >= 20 ? 'POSITIVE' :
    roi >= 0 ? 'BREAK_EVEN' : 'LOSS';
  return { totalCost, totalBenefit, netValue, roi, paybackScore, rating };
}
