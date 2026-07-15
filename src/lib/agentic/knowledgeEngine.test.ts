import { describe, it, expect } from 'vitest';
import type { ApprovalWorkflow } from './approvalWorkflow';
import { buildKnowledgeReport } from './knowledgeEngine';
import { computeMemoryStats, groupDecisions } from './memoryEngine';
import { detectPatterns } from './patternEngine';
import { computeLearning } from './learningEngine';
import { computeKnowledgeScore, classifyKnowledge } from './knowledgeScore';
import { buildDecisionTimeline, buildEvolution } from './historyEngine';
import { buildRecommendations } from './recommendationMemory';
import { summarizeKnowledge } from './knowledgeSummary';
import { mergeDecisions } from './decisionMemory';

function wf(id: string, over: Partial<ApprovalWorkflow> = {}): ApprovalWorkflow {
  const now = new Date().toISOString();
  return {
    workflowId: id,
    planId: id,
    problemTitle: over.problemTitle ?? 'Otimizar POS',
    status: over.status ?? 'APPROVED',
    currentVersion: 1,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
    expiresAt: now,
    riskScore: over.riskScore ?? 20,
    executionScore: over.executionScore ?? 80,
    rollbackScore: over.rollbackScore ?? 100,
    confidence: over.confidence ?? 75,
    auditId: null,
    ...over,
  };
}

describe('Sprint 4.4 · Knowledge & Memory', () => {
  it('handles empty dataset', () => {
    const r = buildKnowledgeReport({ workflows: [], audit: [] });
    expect(r.decisions).toEqual([]);
    expect(r.memory.total).toBe(0);
    expect(r.patterns).toEqual([]);
    expect(r.learning.total).toBe(0);
    expect(r.score.score).toBeGreaterThanOrEqual(0);
    expect(r.summary.alerts.length).toBeGreaterThan(0);
  });

  it('handles one decision', () => {
    const r = buildKnowledgeReport({ workflows: [wf('a')] });
    expect(r.decisions).toHaveLength(1);
    expect(r.learning.successRate).toBe(100);
    expect(r.score.rating).not.toBe('POOR');
  });

  it('handles 100 decisions', () => {
    const list = Array.from({ length: 100 }, (_, i) =>
      wf(`w-${i}`, { status: i % 3 === 0 ? 'REJECTED' : 'APPROVED', problemTitle: `Plan ${i % 5}` }),
    );
    const r = buildKnowledgeReport({ workflows: list });
    expect(r.memory.uniqueTitles).toBe(5);
    expect(r.learning.total).toBe(100);
    expect(r.score.score).toBeGreaterThan(0);
  });

  it('is resilient to NaN/Infinity/null', () => {
    const bad = wf('bad', {
      riskScore: NaN as unknown as number,
      confidence: Infinity as unknown as number,
      executionScore: null as unknown as number,
    });
    const l = computeLearning([...mergeDecisions([bad])]);
    expect(Number.isFinite(l.avgRisk)).toBe(true);
    expect(Number.isFinite(l.avgConfidence)).toBe(true);
  });

  it('deduplicates via mergeDecisions', () => {
    const list = mergeDecisions([wf('dup'), wf('dup')]);
    expect(list).toHaveLength(1);
  });

  it('detects recurring pattern (>=3)', () => {
    const list = Array.from({ length: 4 }, (_, i) => wf(`r-${i}`, { problemTitle: 'Same' }));
    const p = detectPatterns(mergeDecisions(list));
    expect(p.some((x) => x.kind === 'RECURRING_PLAN')).toBe(true);
  });

  it('detects frequent rejection', () => {
    const list = [
      wf('x1', { status: 'REJECTED', problemTitle: 'X' }),
      wf('x2', { status: 'REJECTED', problemTitle: 'X' }),
    ];
    const p = detectPatterns(mergeDecisions(list));
    expect(p.some((x) => x.kind === 'FREQUENT_REJECTION')).toBe(true);
  });

  it('classifies knowledge rating', () => {
    expect(classifyKnowledge(0)).toBe('POOR');
    expect(classifyKnowledge(50)).toBe('FAIR');
    expect(classifyKnowledge(60)).toBe('GOOD');
    expect(classifyKnowledge(75)).toBe('VERY_GOOD');
    expect(classifyKnowledge(90)).toBe('EXCELLENT');
    expect(classifyKnowledge(NaN as unknown as number)).toBe('POOR');
  });

  it('memory groups + stats', () => {
    const decisions = mergeDecisions([wf('a', { problemTitle: 'P' }), wf('b', { problemTitle: 'P' })]);
    const g = groupDecisions(decisions);
    expect(g[0].size).toBe(2);
    expect(computeMemoryStats(decisions).memorySize).toBe(2);
  });

  it('history: timeline + evolution respect invalid dates', () => {
    const decisions = mergeDecisions([
      wf('a', { updatedAt: 'not-a-date' as unknown as string }),
      wf('b'),
    ]);
    const tl = buildDecisionTimeline(decisions);
    expect(tl.length).toBe(2);
    const ev = buildEvolution(decisions);
    expect(ev.length).toBeGreaterThanOrEqual(1);
  });

  it('recommendations + summary produced for cancelled/expired', () => {
    const decisions = mergeDecisions([
      wf('c1', { status: 'CANCELLED', problemTitle: 'Q' }),
      wf('c2', { status: 'EXPIRED', problemTitle: 'Q' }),
    ]);
    const l = computeLearning(decisions);
    const s = computeKnowledgeScore(l);
    const p = detectPatterns(decisions);
    const recs = buildRecommendations(p);
    const sum = summarizeKnowledge(l, s, p, recs);
    expect(sum).toBeTruthy();
    expect(['INITIAL','DEVELOPING','DEFINED','MANAGED','OPTIMIZED']).toContain(sum.maturity);
  });
});
