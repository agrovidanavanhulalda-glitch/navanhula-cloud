/**
 * Sprint 7.2 · Customer Feedback types (pure, read-only).
 */
export type FeedbackCategory =
  | 'usability' | 'performance' | 'pricing' | 'support' | 'features'
  | 'reliability' | 'onboarding' | 'other';

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface FeedbackEntry {
  readonly id: string;
  readonly customerId: string;
  readonly customerName?: string;
  /** NPS-style rating 0-10. */
  readonly rating: number;
  readonly category: FeedbackCategory;
  readonly comment?: string;
  /** ISO date. */
  readonly createdAt: string;
}

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  'usability', 'performance', 'pricing', 'support', 'features',
  'reliability', 'onboarding', 'other',
];

export const clamp = (n: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));

export const safeRating = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
};
