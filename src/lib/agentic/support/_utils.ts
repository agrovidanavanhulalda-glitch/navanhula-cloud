/**
 * Sprint 7.4 · Defensive helpers.
 */
export const num = (n: unknown): number =>
  typeof n === 'number' && Number.isFinite(n) ? n : 0;

export const clamp = (n: number, min = 0, max = 100): number => {
  const v = num(n);
  return Math.max(min, Math.min(max, v));
};

export const minutesBetween = (a: string | null, b: string | null): number => {
  if (!a || !b) return 0;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0;
  return Math.max(0, Math.round((tb - ta) / 60_000));
};

export const round = (n: number, decimals = 0): number => {
  const p = 10 ** decimals;
  return Math.round(num(n) * p) / p;
};

export const avg = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((s, x) => s + num(x), 0) / xs.length;
