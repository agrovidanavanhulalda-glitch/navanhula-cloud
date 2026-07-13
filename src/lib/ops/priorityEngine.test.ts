import { describe, it, expect } from 'vitest';
import { classifyPriority, rankByPriority } from './priorityEngine';

describe('priorityEngine.classifyPriority', () => {
  it('classifies LOW at zero signals', () => {
    const r = classifyPriority({ impact: 0, urgency: 0, risk: 0, growth: 0, cost: 0 });
    expect(r.score).toBe(0);
    expect(r.level).toBe('LOW');
  });
  it('classifies CRITICAL at max signals', () => {
    const r = classifyPriority({ impact: 100, urgency: 100, risk: 100, growth: 100, cost: 100 });
    expect(r.score).toBe(100);
    expect(r.level).toBe('CRITICAL');
  });
  it('clamps out-of-range inputs', () => {
    const r = classifyPriority({ impact: 999, urgency: -50, risk: 200, growth: 0, cost: 0 });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
  it('produces expected level thresholds', () => {
    expect(classifyPriority({ impact: 80, urgency: 80, risk: 80, growth: 80, cost: 80 }).level).toBe('CRITICAL');
    expect(classifyPriority({ impact: 60, urgency: 60, risk: 60, growth: 60, cost: 60 }).level).toBe('HIGH');
    expect(classifyPriority({ impact: 40, urgency: 40, risk: 40, growth: 40, cost: 40 }).level).toBe('MEDIUM');
  });
});

describe('priorityEngine.rankByPriority', () => {
  it('sorts by descending score', () => {
    const ranked = rankByPriority([
      { item: 'a', signals: { impact: 10, urgency: 10, risk: 10, growth: 10, cost: 10 } },
      { item: 'b', signals: { impact: 90, urgency: 90, risk: 90, growth: 90, cost: 90 } },
    ]);
    expect(ranked[0].item).toBe('b');
    expect(ranked[1].item).toBe('a');
  });
  it('handles empty list', () => {
    expect(rankByPriority([])).toEqual([]);
  });
});
