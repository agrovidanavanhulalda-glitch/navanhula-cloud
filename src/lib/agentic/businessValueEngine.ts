/**
 * Sprint 4.8 · Business Value Engine (pure).
 */
export interface BusinessValueInput {
  impact?: number;      // 0-10
  confidence?: number;  // 0-100
  strategicWeight?: number; // 0-10
  risk?: number;        // 0-10
}

export interface BusinessValueResult {
  score: number;         // 0-100
  tier: 'LOW' | 'MEDIUM' | 'HIGH' | 'STRATEGIC';
}

const clamp = (n: unknown, min: number, max: number): number => {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.min(max, x));
};

export function computeBusinessValue(input: BusinessValueInput = {}): BusinessValueResult {
  const impact = clamp(input.impact, 0, 10);
  const confidence = clamp(input.confidence, 0, 100);
  const weight = clamp(input.strategicWeight, 0, 10);
  const risk = clamp(input.risk, 0, 10);
  const raw = ((impact * 10) * 0.4) + (confidence * 0.3) + ((weight * 10) * 0.3) - (risk * 3);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const tier: BusinessValueResult['tier'] =
    score >= 80 ? 'STRATEGIC' :
    score >= 60 ? 'HIGH' :
    score >= 35 ? 'MEDIUM' : 'LOW';
  return { score, tier };
}

export function aggregateBusinessValue(items: BusinessValueInput[] = []): { avg: number; total: number; count: number } {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return { avg: 0, total: 0, count: 0 };
  const scores = list.map(i => computeBusinessValue(i).score);
  const total = scores.reduce((s, v) => s + v, 0);
  return { avg: Math.round(total / list.length), total, count: list.length };
}
