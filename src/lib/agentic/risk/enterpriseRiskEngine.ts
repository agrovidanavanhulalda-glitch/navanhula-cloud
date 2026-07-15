/**
 * Sprint 5.2 · Enterprise Risk Engine (pure, deterministic, read-only).
 */
export type RiskCategory =
  | 'STRATEGIC'
  | 'OPERATIONAL'
  | 'FINANCIAL'
  | 'COMPLIANCE'
  | 'TECHNOLOGY'
  | 'SECURITY'
  | 'REPUTATIONAL';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskInput {
  id?: unknown;
  name?: unknown;
  category?: unknown;
  probability?: unknown; // 0-100
  impact?: unknown;      // 0-100
  mitigation?: unknown;  // 0-100
  velocity?: unknown;    // 0-100
  detectability?: unknown; // 0-100
}

export interface NormalizedRisk {
  id: string;
  name: string;
  category: RiskCategory;
  probability: number;
  impact: number;
  mitigation: number;
  velocity: number;
  detectability: number;
}

const CATS: RiskCategory[] = [
  'STRATEGIC', 'OPERATIONAL', 'FINANCIAL', 'COMPLIANCE',
  'TECHNOLOGY', 'SECURITY', 'REPUTATIONAL',
];

export function clamp(n: unknown, min: number, max: number): number {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.min(max, x));
}

function normCategory(c: unknown): RiskCategory {
  if (typeof c === 'string') {
    const up = c.toUpperCase() as RiskCategory;
    if (CATS.includes(up)) return up;
  }
  return 'OPERATIONAL';
}

export function normalizeRisks(list: readonly RiskInput[] | null | undefined): NormalizedRisk[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((r): r is RiskInput => r != null && typeof r === 'object')
    .map((r, i) => {
      const id = typeof r.id === 'string' && r.id.length > 0 ? r.id : `R${i + 1}`;
      const name = typeof r.name === 'string' && r.name.length > 0 ? r.name : id;
      return {
        id,
        name,
        category: normCategory(r.category),
        probability: clamp(r.probability, 0, 100),
        impact: clamp(r.impact, 0, 100),
        mitigation: clamp(r.mitigation, 0, 100),
        velocity: clamp(r.velocity, 0, 100),
        detectability: clamp(r.detectability, 0, 100),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function inherentRisk(r: NormalizedRisk): number {
  return Math.round((r.probability * r.impact) / 100);
}
