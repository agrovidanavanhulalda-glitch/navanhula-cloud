import { FeedbackEntry, safeRating } from './types';
export const isPromoter = (r: number) => safeRating(r) >= 9;
export const countPromoters = (entries: readonly FeedbackEntry[]): number =>
  entries.reduce((n, e) => n + (isPromoter(e.rating) ? 1 : 0), 0);
