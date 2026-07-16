/**
 * Composite Customer Feedback Score (0-100) combining NPS, CSAT, Sentiment and Loyalty.
 */
import { FeedbackEntry, clamp } from './types';
import { computeNps } from './npsEngine';
import { computeSatisfaction } from './satisfactionEngine';
import { aggregateSentiment } from './sentimentEngine';
import { computeLoyalty } from './loyaltyEngine';

export interface FeedbackScore {
  readonly score: number;
  readonly npsNormalized: number;
  readonly csat: number;
  readonly sentiment: number;
  readonly loyalty: number;
}

export function computeFeedbackScore(entries: readonly FeedbackEntry[]): FeedbackScore {
  const nps = computeNps(entries);
  const csat = computeSatisfaction(entries).csat;
  const sentiment = aggregateSentiment(entries).score;
  const loyalty = computeLoyalty(entries).score;
  const npsNormalized = clamp(Math.round((nps.nps + 100) / 2));
  const score = clamp(Math.round(
    npsNormalized * 0.35 + csat * 0.30 + sentiment * 0.20 + loyalty * 0.15,
  ));
  return { score, npsNormalized, csat, sentiment, loyalty };
}
