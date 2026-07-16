import { FeedbackEntry, safeRating } from './types';
export const isPassive = (r: number) => {
  const s = safeRating(r);
  return s === 7 || s === 8;
};
export const countPassives = (entries: readonly FeedbackEntry[]): number =>
  entries.reduce((n, e) => n + (isPassive(e.rating) ? 1 : 0), 0);
