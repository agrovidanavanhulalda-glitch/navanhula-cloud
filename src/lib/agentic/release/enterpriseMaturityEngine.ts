/**
 * Sprint 5.6 · Enterprise Maturity Engine — pure.
 */
export type MaturityLevel = 'FOUNDATION' | 'GROWTH' | 'SCALE' | 'ENTERPRISE' | 'WORLD_CLASS' | 'AAA_ENTERPRISE';

export interface MaturityReport {
  readonly level: MaturityLevel;
  readonly score: number;
  readonly nextLevel: MaturityLevel | null;
  readonly pointsToNext: number;
}

const THRESHOLDS: Array<{ level: MaturityLevel; min: number }> = [
  { level: 'AAA_ENTERPRISE', min: 95 },
  { level: 'WORLD_CLASS', min: 88 },
  { level: 'ENTERPRISE', min: 78 },
  { level: 'SCALE', min: 65 },
  { level: 'GROWTH', min: 50 },
  { level: 'FOUNDATION', min: 0 },
];

export function computeEnterpriseMaturity(overallScore: number): MaturityReport {
  const score = Math.max(0, Math.min(100, Number.isFinite(overallScore) ? overallScore : 0));
  const idx = THRESHOLDS.findIndex((t) => score >= t.min);
  const level = THRESHOLDS[idx].level;
  const nextLevel = idx > 0 ? THRESHOLDS[idx - 1].level : null;
  const pointsToNext = idx > 0 ? Math.max(0, THRESHOLDS[idx - 1].min - score) : 0;
  return { level, score, nextLevel, pointsToNext };
}
