/**
 * Sprint 5.3 · Compliance Trend Engine (pure).
 */
export type TrendWindow = '24h' | '7d' | '30d' | '90d' | '365d';

export interface ComplianceSnapshot {
  readonly at: string;
  readonly score: number;
}

export interface TrendPoint {
  readonly window: TrendWindow;
  readonly average: number;
  readonly delta: number;
  readonly samples: number;
}

const WINDOWS: Record<TrendWindow, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  '365d': 365 * 24 * 60 * 60 * 1000,
};

function safeScore(n: number | null | undefined): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function computeTrend(
  snapshots: readonly ComplianceSnapshot[],
  now: number = Date.now(),
): TrendPoint[] {
  const list = snapshots ?? [];
  const parsed = list
    .map((s) => ({ ts: Date.parse(s.at), score: safeScore(s.score) }))
    .filter((s) => Number.isFinite(s.ts));

  return (Object.keys(WINDOWS) as TrendWindow[]).map((window) => {
    const cutoff = now - WINDOWS[window];
    const within = parsed.filter((s) => s.ts >= cutoff);
    if (within.length === 0) return { window, average: 0, delta: 0, samples: 0 };
    const avg = within.reduce((a, b) => a + b.score, 0) / within.length;
    const sorted = [...within].sort((a, b) => a.ts - b.ts);
    const delta = sorted[sorted.length - 1].score - sorted[0].score;
    return {
      window,
      average: Math.round(avg * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      samples: within.length,
    };
  });
}
