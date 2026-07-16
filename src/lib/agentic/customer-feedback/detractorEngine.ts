import { FeedbackEntry, safeRating } from './types';
export const isDetractor = (r: number) => safeRating(r) <= 6;
export const countDetractors = (entries: readonly FeedbackEntry[]): number =>
  entries.reduce((n, e) => n + (isDetractor(e.rating) ? 1 : 0), 0);
