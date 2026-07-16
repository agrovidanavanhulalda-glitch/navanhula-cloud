/**
 * Sprint 7.2 · Customer Feedback Aggregator (pure, O(n)).
 */
import type { FeedbackEntry } from './types';
import { computeNps, type NpsResult } from './npsEngine';
import { computeSatisfaction, type SatisfactionResult } from './satisfactionEngine';
import { aggregateSentiment, type SentimentSummary } from './sentimentEngine';
import { computeLoyalty, type LoyaltyResult } from './loyaltyEngine';
import { breakdownByCategory, type CategoryBreakdown } from './feedbackCategoryEngine';
import { monthlyTrend, type MonthlyTrendPoint } from './feedbackTrendEngine';
import { extractCustomerVoice, type CustomerVoice } from './customerVoiceEngine';
import { identifyOpportunities, type Opportunity } from './improvementOpportunityEngine';
import { computeFeedbackScore, type FeedbackScore } from './feedbackScoreEngine';
import { summarize, type FeedbackSummary } from './feedbackSummaryEngine';
import { summarizeFeedback, type FeedbackStats } from './feedbackEngine';

export interface FeedbackPortfolio {
  readonly stats: FeedbackStats;
  readonly nps: NpsResult;
  readonly satisfaction: SatisfactionResult;
  readonly sentiment: SentimentSummary;
  readonly loyalty: LoyaltyResult;
  readonly score: FeedbackScore;
  readonly categories: CategoryBreakdown[];
  readonly trend: MonthlyTrendPoint[];
  readonly voice: CustomerVoice;
  readonly opportunities: Opportunity[];
  readonly summary: FeedbackSummary;
}

export function assessFeedbackPortfolio(entries: readonly FeedbackEntry[]): FeedbackPortfolio {
  const stats = summarizeFeedback(entries);
  const nps = computeNps(entries);
  const satisfaction = computeSatisfaction(entries);
  const sentiment = aggregateSentiment(entries);
  const loyalty = computeLoyalty(entries);
  const score = computeFeedbackScore(entries);
  const categories = breakdownByCategory(entries);
  const trend = monthlyTrend(entries);
  const voice = extractCustomerVoice(entries);
  const opportunities = identifyOpportunities(entries);
  const summary = summarize(score, nps);
  return { stats, nps, satisfaction, sentiment, loyalty, score, categories, trend, voice, opportunities, summary };
}
