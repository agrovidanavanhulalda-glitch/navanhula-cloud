/**
 * Sprint 4.8 · Benefit Realization Engine (pure).
 */
export interface BenefitItem {
  id: string;
  expected?: number;
  realized?: number;
  confidence?: number;
}

export interface BenefitRealizationReport {
  realizationRate: number; // %
  expectedTotal: number;
  realizedTotal: number;
  gap: number;
  rating: 'FAILING' | 'PARTIAL' | 'ON_TRACK' | 'EXCEEDING';
}

const num = (n: unknown): number =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0;

export function evaluateBenefits(items: BenefitItem[] = []): BenefitRealizationReport {
  const list = Array.isArray(items) ? items : [];
  const expectedTotal = list.reduce((s, i) => s + num(i.expected), 0);
  const realizedTotal = list.reduce((s, i) => s + num(i.realized), 0);
  const rate = expectedTotal === 0
    ? (realizedTotal > 0 ? 100 : 0)
    : Math.round((realizedTotal / expectedTotal) * 100);
  const realizationRate = Math.max(0, Math.min(200, rate));
  const gap = expectedTotal - realizedTotal;
  const rating: BenefitRealizationReport['rating'] =
    realizationRate >= 100 ? 'EXCEEDING' :
    realizationRate >= 75 ? 'ON_TRACK' :
    realizationRate >= 40 ? 'PARTIAL' : 'FAILING';
  return { realizationRate, expectedTotal, realizedTotal, gap, rating };
}
