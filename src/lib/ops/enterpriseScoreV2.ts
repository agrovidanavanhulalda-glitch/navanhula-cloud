/**
 * Sprint 3.0 · Enterprise Score V2 (pure aggregation, 0-100).
 */
export interface ScoreDimensions {
  capacity: number;
  finops: number;
  sre: number;
  predictability: number;
  operations: number;
  maintainability: number;
  technicalDebt: number;
  recovery: number;
  performance: number;
  scalability: number;
  availability: number;
  reliability: number;
}

export interface EnterpriseScoreV2 {
  total: number;
  dimensions: ScoreDimensions;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
}

export function computeScoreV2(d: Partial<ScoreDimensions> = {}): EnterpriseScoreV2 {
  const dims: ScoreDimensions = {
    capacity: 80, finops: 75, sre: 82, predictability: 78, operations: 85,
    maintainability: 88, technicalDebt: 70, recovery: 84, performance: 86,
    scalability: 74, availability: 92, reliability: 90, ...d,
  };
  const values = Object.values(dims);
  const total = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const grade: EnterpriseScoreV2['grade'] =
    total >= 90 ? 'A' : total >= 80 ? 'B' : total >= 70 ? 'C' : total >= 60 ? 'D' : 'E';
  return { total, dimensions: dims, grade };
}
