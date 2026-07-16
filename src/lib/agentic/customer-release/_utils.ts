export const num = (n: unknown): number =>
  typeof n === 'number' && Number.isFinite(n) ? n : 0;

export const clamp = (n: unknown, min = 0, max = 100): number => {
  const v = num(n);
  return Math.max(min, Math.min(max, v));
};

export const round = (n: number, d = 0): number => {
  const p = 10 ** d;
  return Math.round(num(n) * p) / p;
};

export const avg = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((s, x) => s + num(x), 0) / xs.length;
