/**
 * Sprint 7.3 · Defensive numeric helpers.
 */
export const num = (n: unknown): number =>
  typeof n === 'number' && Number.isFinite(n) ? n : 0;

export const clamp = (n: number, min = 0, max = 100): number => {
  const v = num(n);
  return Math.max(min, Math.min(max, v));
};

export const clamp01 = (n: number): number => clamp(n, 0, 1);

export const daysUntil = (iso: string, now: Date = new Date()): number => {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.round((t - now.getTime()) / 86_400_000);
};

export const round = (n: number, decimals = 0): number => {
  const p = 10 ** decimals;
  return Math.round(num(n) * p) / p;
};
