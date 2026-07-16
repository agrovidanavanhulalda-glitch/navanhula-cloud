/**
 * Sprint 5.6.2 · Quality Normalization — turn raw platform signals into 0–100 scores.
 * Pure. Deterministic. Clamps NaN/Infinity/null/undefined.
 */
const clamp = (n: unknown): number => {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  if (n === Infinity) return 100;
  if (n === -Infinity) return 0;
  return Math.max(0, Math.min(100, n));
};

const safeRatio = (a: unknown, b: unknown): number => {
  const num = typeof a === 'number' && Number.isFinite(a) ? Math.max(0, a) : 0;
  const den = typeof b === 'number' && Number.isFinite(b) && b > 0 ? b : 0;
  return den === 0 ? 0 : Math.max(0, Math.min(1, num / den));
};

export interface RawSignal {
  readonly value?: number;
  readonly passed?: number;
  readonly total?: number;
  readonly ok?: boolean;
}

export function normalizeBoolean(ok: unknown): number {
  return ok === true ? 100 : 0;
}

export function normalizeRatio(passed: unknown, total: unknown): number {
  return Math.round(safeRatio(passed, total) * 100);
}

export function normalizePercent(value: unknown): number {
  return Math.round(clamp(value));
}

export function normalizeSignal(sig: RawSignal | number | boolean | undefined | null): number {
  if (sig === undefined || sig === null) return 0;
  if (typeof sig === 'boolean') return normalizeBoolean(sig);
  if (typeof sig === 'number') return normalizePercent(sig);
  if (typeof sig.ok === 'boolean') return normalizeBoolean(sig.ok);
  if (typeof sig.passed === 'number' && typeof sig.total === 'number') {
    return normalizeRatio(sig.passed, sig.total);
  }
  return normalizePercent(sig.value);
}
