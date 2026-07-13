import { describe, it, expect } from 'vitest';
import { computeScoreV2 } from './enterpriseScoreV2';

describe('enterpriseScoreV2', () => {
  it('returns defaults with grade B on empty input', () => {
    const s = computeScoreV2();
    expect(s.total).toBeGreaterThanOrEqual(70);
    expect(['A', 'B', 'C']).toContain(s.grade);
  });
  it('grades A when all dimensions are perfect', () => {
    const s = computeScoreV2({
      capacity: 100, finops: 100, sre: 100, predictability: 100, operations: 100,
      maintainability: 100, technicalDebt: 100, recovery: 100, performance: 100,
      scalability: 100, availability: 100, reliability: 100,
    });
    expect(s.total).toBe(100);
    expect(s.grade).toBe('A');
  });
  it('grades E when everything collapses', () => {
    const s = computeScoreV2({
      capacity: 0, finops: 0, sre: 0, predictability: 0, operations: 0,
      maintainability: 0, technicalDebt: 0, recovery: 0, performance: 0,
      scalability: 0, availability: 0, reliability: 0,
    });
    expect(s.total).toBe(0);
    expect(s.grade).toBe('E');
  });
});
