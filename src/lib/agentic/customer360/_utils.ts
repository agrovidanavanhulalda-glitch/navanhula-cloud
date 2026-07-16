export const num = (n: unknown): number =>
  typeof n === 'number' && Number.isFinite(n) ? n : 0;

export const clamp = (n: number, min = 0, max = 100): number => {
  const v = num(n);
  return Math.max(min, Math.min(max, v));
};

export const clamp01 = (n: number): number => clamp(n, 0, 1);

export const round = (n: number, decimals = 0): number => {
  const p = 10 ** decimals;
  return Math.round(num(n) * p) / p;
};

export const avg = (nums: readonly number[]): number => {
  if (!nums.length) return 0;
  let s = 0;
  for (const n of nums) s += num(n);
  return s / nums.length;
};
