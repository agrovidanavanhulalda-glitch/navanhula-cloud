/**
 * Sprint 5.6.3 · Enterprise Maturity V3 — evidence-driven maturity level.
 */
export type MaturityLevelV3 =
  | 'FOUNDATION' | 'GROWTH' | 'SCALE' | 'ENTERPRISE' | 'WORLD_CLASS' | 'AAA_ENTERPRISE';

export interface MaturityV3Report {
  readonly level: MaturityLevelV3;
  readonly score: number;
  readonly nextLevel: MaturityLevelV3 | null;
  readonly pointsToNext: number;
}

const ORDER: readonly { level: MaturityLevelV3; min: number }[] = [
  { level: 'FOUNDATION', min: 0 },
  { level: 'GROWTH', min: 50 },
  { level: 'SCALE', min: 70 },
  { level: 'ENTERPRISE', min: 80 },
  { level: 'WORLD_CLASS', min: 90 },
  { level: 'AAA_ENTERPRISE', min: 95 },
];

export function computeMaturityV3(score: number): MaturityV3Report {
  const s = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  let current = ORDER[0];
  let next: typeof ORDER[number] | null = null;
  for (let i = 0; i < ORDER.length; i++) {
    if (s >= ORDER[i].min) {
      current = ORDER[i];
      next = ORDER[i + 1] ?? null;
    }
  }
  return {
    level: current.level,
    score: s,
    nextLevel: next?.level ?? null,
    pointsToNext: next ? Math.max(0, next.min - s) : 0,
  };
}
