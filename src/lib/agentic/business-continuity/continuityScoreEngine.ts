/**
 * Sprint 5.4 · Continuity Score Engine — pure.
 */
export interface ContinuityScoreInput {
  readiness: number;
  resilience: number;
  availability: number;
  backups: number;
  scenarios: number; // avg severity 0-100 (penalty)
}

export interface ContinuityScore {
  total: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'READY' | 'PARTIAL' | 'AT_RISK';
}

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

function gradeOf(score: number): ContinuityScore['grade'] {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function statusOf(score: number): ContinuityScore['status'] {
  if (score >= 75) return 'READY';
  if (score >= 50) return 'PARTIAL';
  return 'AT_RISK';
}

export function computeContinuityScore(i: ContinuityScoreInput): ContinuityScore {
  const readiness = clamp(i.readiness);
  const resilience = clamp(i.resilience);
  const availability = clamp(i.availability);
  const backups = clamp(i.backups);
  const scenarioPenalty = clamp(i.scenarios) * 0.15;
  const raw =
    readiness * 0.35 +
    resilience * 0.25 +
    availability * 0.2 +
    backups * 0.2 -
    scenarioPenalty;
  const total = Math.max(0, Math.min(100, Math.round(raw)));
  return { total, grade: gradeOf(total), status: statusOf(total) };
}
