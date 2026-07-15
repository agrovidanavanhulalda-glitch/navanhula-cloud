/**
 * Sprint 4.8 · Strategic Alignment Engine (pure).
 */
export interface AlignmentInitiative {
  id: string;
  objectiveId: string;
  impact: number;
  confidence: number;
}

export interface AlignmentResult {
  score: number;
  aligned: number;
  misaligned: number;
  coverage: number;
  perObjective: Record<string, { count: number; avgImpact: number }>;
}

const clamp = (n: unknown, min = 0, max = 100): number => {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.min(max, x));
};

export function evaluateAlignment(
  initiatives: AlignmentInitiative[] = [],
  objectiveIds: string[] = [],
): AlignmentResult {
  const list = Array.isArray(initiatives) ? initiatives.filter(Boolean) : [];
  const objectives = Array.isArray(objectiveIds) ? objectiveIds : [];
  const perObjective: Record<string, { count: number; avgImpact: number; _sum: number }> = {};
  let aligned = 0;
  let misaligned = 0;
  for (const i of list) {
    const impact = clamp(i.impact, 0, 10);
    const confidence = clamp(i.confidence);
    const strong = impact >= 5 && confidence >= 50;
    if (strong) aligned++; else misaligned++;
    const key = i.objectiveId || '_orphan';
    if (!perObjective[key]) perObjective[key] = { count: 0, avgImpact: 0, _sum: 0 };
    perObjective[key].count++;
    perObjective[key]._sum += impact;
  }
  for (const k of Object.keys(perObjective)) {
    const o = perObjective[k];
    o.avgImpact = o.count === 0 ? 0 : Math.round((o._sum / o.count) * 10) / 10;
  }
  const covered = objectives.filter(o => perObjective[o]?.count > 0).length;
  const coverage = objectives.length === 0 ? (list.length > 0 ? 100 : 0) : Math.round((covered / objectives.length) * 100);
  const total = list.length;
  const alignRatio = total === 0 ? 0 : (aligned / total) * 100;
  const score = Math.round((alignRatio * 0.6) + (coverage * 0.4));
  const clean: Record<string, { count: number; avgImpact: number }> = {};
  for (const [k, v] of Object.entries(perObjective)) clean[k] = { count: v.count, avgImpact: v.avgImpact };
  return { score, aligned, misaligned, coverage, perObjective: clean };
}
