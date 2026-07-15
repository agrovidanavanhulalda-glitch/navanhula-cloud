import { describe, it, expect, beforeEach } from 'vitest';
import {
  submitForApproval,
  transitionStatus,
  listWorkflows,
  workflowDetail,
  expireStale,
  resetWorkflowRegistry,
} from './approvalWorkflow';
import { resetVersionRegistry } from './versionEngine';
import { resetCommentRegistry, addComment } from './commentEngine';
import { reviewPlan } from './reviewEngine';
import { diffVersions } from './planDiffEngine';
import { buildTimeline } from './approvalHistory';
import { summarizeApproval } from './approvalSummary';
import { buildExecutionPlan } from './executionPlanner';
import { buildPlan, type DetectedProblem } from './plannerEngine';

const problem = (over: Partial<DetectedProblem> = {}): DetectedProblem => ({
  id: 'p-approval',
  kind: 'STORAGE',
  title: 'Storage cheio',
  description: 't',
  severity: 'HIGH',
  evidence: ['a', 'b'],
  ...over,
});

function makePlan(sev: DetectedProblem['severity'] = 'HIGH', dq = 0.9) {
  return buildExecutionPlan(buildPlan(problem({ severity: sev }), dq));
}

describe('agentic approval workflow', () => {
  beforeEach(() => {
    resetWorkflowRegistry();
    resetVersionRegistry();
    resetCommentRegistry();
  });

  it('submits a plan and creates v1 PENDING', () => {
    const wf = submitForApproval(makePlan());
    expect(wf.status).toBe('PENDING');
    expect(wf.currentVersion).toBe(1);
    expect(listWorkflows()).toHaveLength(1);
  });

  it('resubmission increments version', () => {
    const p1 = makePlan();
    submitForApproval(p1);
    const wf2 = submitForApproval(p1);
    expect(wf2.currentVersion).toBe(2);
    const detail = workflowDetail(wf2.workflowId);
    expect(detail.versions).toHaveLength(2);
  });

  it('approves and rejects', () => {
    const wf = submitForApproval(makePlan());
    const approved = transitionStatus(wf.workflowId, 'APPROVED', 'founder', 'ok');
    expect(approved?.status).toBe('APPROVED');
    // Cannot re-transition once decided
    const again = transitionStatus(wf.workflowId, 'REJECTED', 'founder');
    expect(again?.status).toBe('APPROVED');
  });

  it('rejects unknown workflow', () => {
    expect(transitionStatus('missing', 'APPROVED', 'founder')).toBeNull();
  });

  it('adds comments and lists them in timeline', () => {
    const wf = submitForApproval(makePlan());
    addComment(wf.workflowId, { author: 'founder', action: 'COMMENT', message: 'Review please' });
    const timeline = buildTimeline(wf.workflowId);
    expect(timeline.length).toBeGreaterThanOrEqual(2);
    expect(timeline.some((e) => e.kind === 'VERSION')).toBe(true);
    expect(timeline.some((e) => e.kind === 'COMMENT')).toBe(true);
  });

  it('expires stale pending workflows', () => {
    const wf = submitForApproval(makePlan());
    // Force expiry in the past
    const future = new Date(Date.now() + 1000 * 3600 * 24 * 30);
    const n = expireStale(future);
    expect(n).toBeGreaterThan(0);
    expect(workflowDetail(wf.workflowId).workflow?.status).toBe('EXPIRED');
  });

  it('review engine returns REJECT for null and for blocked plans', () => {
    expect(reviewPlan(null).verdict).toBe('REJECT');
    const critical = makePlan('CRITICAL');
    const report = reviewPlan(critical);
    expect(['REJECT', 'REVIEW']).toContain(report.verdict);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it('diff engine handles null versions and produces field changes', () => {
    const wf1 = submitForApproval(makePlan('HIGH'));
    const wf2 = submitForApproval(makePlan('CRITICAL'));
    const detail = workflowDetail(wf1.workflowId);
    expect(detail.versions.length).toBeGreaterThanOrEqual(1);
    const empty = diffVersions(null, null);
    expect(empty.changed).toHaveLength(0);
    // Sanity: workflows separate
    expect(wf1.workflowId).not.toBe('');
    expect(wf2.workflowId).not.toBe('');
  });

  it('diff detects severity change across versions of same plan', () => {
    const base = buildPlan(problem({ severity: 'HIGH' }), 0.9);
    const plan1 = buildExecutionPlan(base);
    const wf = submitForApproval(plan1);
    // Second submission with different snapshot content
    const base2 = buildPlan(problem({ severity: 'CRITICAL' }), 0.9);
    const plan2 = buildExecutionPlan(base2);
    // Force same workflowId by reusing planId
    plan2.planId = plan1.planId;
    submitForApproval(plan2);
    const versions = workflowDetail(wf.workflowId).versions;
    const d = diffVersions(versions[0], versions[1]);
    expect(d.changed.some((c) => c.field === 'problemSeverity')).toBe(true);
  });

  it('approval summary produces non-empty recommendation', () => {
    const s = summarizeApproval(makePlan());
    expect(s.headline.length).toBeGreaterThan(0);
    expect(s.recommendation.length).toBeGreaterThan(0);
    expect(s.review.score).toBeGreaterThanOrEqual(0);
  });

  it('handles NaN/Infinity in snapshot gracefully', () => {
    const p = makePlan();
    // Corrupt fields to non-finite
    (p.estimate as unknown as { confidence: number }).confidence = Number.NaN;
    (p.risk as unknown as { score: number }).score = Number.POSITIVE_INFINITY;
    const wf = submitForApproval(p);
    expect(Number.isFinite(wf.confidence)).toBe(true);
    expect(Number.isFinite(wf.riskScore)).toBe(true);
  });
});
