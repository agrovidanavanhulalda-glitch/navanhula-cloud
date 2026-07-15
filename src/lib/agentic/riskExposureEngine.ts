/**
 * Sprint 4.8 · Risk Exposure Engine (pure).
 */
export interface RiskItem {
  id: string;
  probability?: number; // 0-100
  impact?: number;      // 0-10
  mitigated?: boolean;
}

export interface RiskExposureReport {
  exposure: number;   // 0-100
  peak: number;       // 0-100
  high: number;
  medium: number;
  low: number;
  rating: 'MINIMAL' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'EXTREME';
}

const clamp = (n: unknown, min: number, max: number): number => {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.min(max, x));
};

export function computeRiskExposure(items: RiskItem[] = []): RiskExposureReport {
  const list = Array.isArray(items) ? items : [];
  let sum = 0;
  let peak = 0;
  let high = 0, medium = 0, low = 0;
  for (const r of list) {
    const p = clamp(r.probability, 0, 100);
    const i = clamp(r.impact, 0, 10) * 10;
    const raw = (p + i) / 2;
    const adjusted = r.mitigated ? raw * 0.4 : raw;
    sum += adjusted;
    if (adjusted > peak) peak = adjusted;
    if (adjusted >= 70) high++;
    else if (adjusted >= 40) medium++;
    else low++;
  }
  const exposure = list.length === 0 ? 0 : Math.round(sum / list.length);
  const rating: RiskExposureReport['rating'] =
    exposure >= 80 ? 'EXTREME' :
    exposure >= 60 ? 'HIGH' :
    exposure >= 40 ? 'ELEVATED' :
    exposure >= 20 ? 'MODERATE' : 'MINIMAL';
  return { exposure, peak: Math.round(peak), high, medium, low, rating };
}
