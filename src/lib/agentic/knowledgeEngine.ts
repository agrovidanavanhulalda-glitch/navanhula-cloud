/**
 * Sprint 4.4 · Knowledge Engine (pure orchestrator).
 * Aggregates memory + patterns + learning + insights + summary.
 * ADVISORY ONLY — no side effects.
 */
import type { ApprovalWorkflow } from './approvalWorkflow';
import type { AgenticAuditRow } from './agenticAuditService';
import { mergeDecisions, type DecisionRecord } from './decisionMemory';
import { computeMemoryStats, type MemoryStats } from './memoryEngine';
import { detectPatterns, type DetectedPattern } from './patternEngine';
import { computeLearning, type LearningMetrics } from './learningEngine';
import { computeKnowledgeScore, type KnowledgeScoreResult } from './knowledgeScore';
import { buildRecommendations, type Recommendation } from './recommendationMemory';
import { computeInsights, type TopInsights } from './insightEngine';
import { summarizeKnowledge, type KnowledgeSummary } from './knowledgeSummary';
import { buildDecisionTimeline, buildEvolution, type HistoryEvent, type EvolutionBucket } from './historyEngine';

export interface KnowledgeReport {
  decisions: DecisionRecord[];
  memory: MemoryStats;
  patterns: DetectedPattern[];
  learning: LearningMetrics;
  score: KnowledgeScoreResult;
  recommendations: Recommendation[];
  insights: TopInsights;
  summary: KnowledgeSummary;
  timeline: HistoryEvent[];
  evolution: EvolutionBucket[];
}

export function buildKnowledgeReport(input: {
  workflows?: ApprovalWorkflow[];
  audit?: AgenticAuditRow[];
}): KnowledgeReport {
  const decisions = mergeDecisions(input.workflows ?? [], input.audit ?? []);
  const memory = computeMemoryStats(decisions);
  const patterns = detectPatterns(decisions);
  const learning = computeLearning(decisions);
  const score = computeKnowledgeScore(learning);
  const recommendations = buildRecommendations(patterns);
  const insights = computeInsights(decisions, patterns);
  const summary = summarizeKnowledge(learning, score, patterns, recommendations);
  const timeline = buildDecisionTimeline(decisions);
  const evolution = buildEvolution(decisions);
  return { decisions, memory, patterns, learning, score, recommendations, insights, summary, timeline, evolution };
}
