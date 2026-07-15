/**
 * Sprint 5.4 · Business Impact Analysis (BIA) — pure.
 */
export interface ProcessInput {
  id?: unknown;
  name?: unknown;
  criticality?: unknown;     // 0-100
  revenueImpact?: unknown;   // 0-100
  customerImpact?: unknown;  // 0-100
  regulatoryImpact?: unknown;// 0-100
  maxToleratedDowntimeHours?: unknown;
}

export interface BIARow {
  id: string;
  name: string;
  criticality: number;
  revenueImpact: number;
  customerImpact: number;
  regulatoryImpact: number;
  maxToleratedDowntimeHours: number;
  impactScore: number;
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4';
}

export function clamp(n: unknown, min: number, max: number): number {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.min(max, x));
}

function tierOf(score: number): BIARow['tier'] {
  if (score >= 80) return 'TIER_1';
  if (score >= 60) return 'TIER_2';
  if (score >= 40) return 'TIER_3';
  return 'TIER_4';
}

export function analyzeBusinessImpact(list: readonly ProcessInput[] | null | undefined): BIARow[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((p): p is ProcessInput => p != null && typeof p === 'object')
    .map((p, i) => {
      const id = typeof p.id === 'string' && p.id ? p.id : `P${i + 1}`;
      const name = typeof p.name === 'string' && p.name ? p.name : id;
      const criticality = clamp(p.criticality, 0, 100);
      const revenueImpact = clamp(p.revenueImpact, 0, 100);
      const customerImpact = clamp(p.customerImpact, 0, 100);
      const regulatoryImpact = clamp(p.regulatoryImpact, 0, 100);
      const mtd = clamp(p.maxToleratedDowntimeHours, 0, 720);
      const impactScore = Math.round(
        criticality * 0.35 +
        revenueImpact * 0.25 +
        customerImpact * 0.2 +
        regulatoryImpact * 0.2,
      );
      return {
        id, name, criticality, revenueImpact, customerImpact, regulatoryImpact,
        maxToleratedDowntimeHours: mtd, impactScore, tier: tierOf(impactScore),
      };
    })
    .sort((a, b) => (b.impactScore - a.impactScore) || a.id.localeCompare(b.id));
}
