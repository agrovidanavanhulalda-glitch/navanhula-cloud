/**
 * Sprint 3.3 · Correlation Engine (READ-ONLY, pure).
 * Computes a simple normalized correlation matrix between operational signals.
 */

export type SignalKey =
  | 'storage' | 'telemetry' | 'rpc' | 'realtime' | 'workers'
  | 'queue' | 'dlq' | 'fiscal' | 'billing' | 'database'
  | 'companies' | 'users' | 'sales';

export interface SignalSnapshot {
  key: SignalKey;
  value: number;      // current normalized level (0..1 recommended)
  delta: number;      // recent growth/change
}

export interface CorrelationEdge {
  a: SignalKey;
  b: SignalKey;
  score: number; // -1..1
}

/** Cosine similarity over [value, delta] vectors — simple, deterministic. */
function sim(a: SignalSnapshot, b: SignalSnapshot): number {
  const va = [a.value, a.delta];
  const vb = [b.value, b.delta];
  const dot = va[0] * vb[0] + va[1] * vb[1];
  const na = Math.hypot(...va);
  const nb = Math.hypot(...vb);
  if (!na || !nb) return 0;
  return Math.max(-1, Math.min(1, dot / (na * nb)));
}

export function correlate(signals: SignalSnapshot[]): CorrelationEdge[] {
  const out: CorrelationEdge[] = [];
  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      out.push({ a: signals[i].key, b: signals[j].key, score: sim(signals[i], signals[j]) });
    }
  }
  return out.sort((x, y) => Math.abs(y.score) - Math.abs(x.score));
}
