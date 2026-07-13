/**
 * Sprint 2.4 · Enterprise Telemetry Buffer
 * Passive, async, non-blocking, idempotent.
 * Opt-in: nothing imports this by default. No behavior change.
 */

export type TelemetryKind =
  | 'rpc'
  | 'realtime'
  | 'storage'
  | 'edge_function'
  | 'sync'
  | 'worker';

export interface TelemetryEvent {
  kind: TelemetryKind;
  name: string;
  duration_ms: number;
  success: boolean;
  error_code?: string | null;
  retries?: number;
  timeout?: boolean;
  payload_size?: number;
  response_size?: number;
  ts: number;
}

const MAX_EVENTS = 100;
const FLUSH_MS = 60_000;

const buffer: TelemetryEvent[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

function safeFlushHandler(events: TelemetryEvent[]) {
  // Fire-and-forget hook. Default: no-op.
  // Consumers may replace via setTelemetrySink().
  try {
    sink?.(events);
  } catch {
    /* swallow */
  }
}

let sink: ((events: TelemetryEvent[]) => void) | null = null;
export function setTelemetrySink(fn: (events: TelemetryEvent[]) => void) {
  sink = fn;
}

export function recordTelemetry(evt: Omit<TelemetryEvent, 'ts'>) {
  try {
    buffer.push({ ...evt, ts: Date.now() });
    if (buffer.length >= MAX_EVENTS) flushTelemetry();
    ensureTimer();
  } catch {
    /* never throw */
  }
}

export function flushTelemetry() {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0, buffer.length);
  // Async: never block caller
  queueMicrotask(() => safeFlushHandler(batch));
}

function ensureTimer() {
  if (timer || typeof window === 'undefined') return;
  timer = setInterval(() => flushTelemetry(), FLUSH_MS);
}

// ---- Percentile aggregations (per name, in-memory only) ----

export interface Aggregate {
  count: number;
  errors: number;
  retries: number;
  timeouts: number;
  avg: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
  error_rate: number;
  retry_rate: number;
  timeout_rate: number;
}

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export function aggregate(events: TelemetryEvent[]): Record<string, Aggregate> {
  const groups = new Map<string, TelemetryEvent[]>();
  for (const e of events) {
    const key = `${e.kind}:${e.name}`;
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  }
  const out: Record<string, Aggregate> = {};
  for (const [key, arr] of groups) {
    const durs = arr.map(e => e.duration_ms).sort((a, b) => a - b);
    const errors = arr.filter(e => !e.success).length;
    const retries = arr.reduce((s, e) => s + (e.retries ?? 0), 0);
    const timeouts = arr.filter(e => e.timeout).length;
    const sum = durs.reduce((a, b) => a + b, 0);
    out[key] = {
      count: arr.length,
      errors,
      retries,
      timeouts,
      avg: sum / arr.length,
      p50: pct(durs, 50),
      p90: pct(durs, 90),
      p95: pct(durs, 95),
      p99: pct(durs, 99),
      max: durs[durs.length - 1] ?? 0,
      error_rate: errors / arr.length,
      retry_rate: retries / arr.length,
      timeout_rate: timeouts / arr.length,
    };
  }
  return out;
}
