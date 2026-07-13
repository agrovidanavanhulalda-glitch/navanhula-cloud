/**
 * Sprint 2.8 · Live Ops Metrics (read-only).
 * Aggregates real signals from background_tasks + telemetry_events + system_errors.
 * Never writes. Never mutates business tables. Fails silently → degraded mode.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const WINDOW_MIN = 15;
const REFRESH_MS = 30_000;

function pct(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

export interface QueueMetrics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retry: number;
  dlq: number;
  depth: number;
  avgDurationMs: number | null;
  maxDurationMs: number | null;
  successRate: number | null;
  throughputPerMin: number | null;
}

export interface RpcMetrics {
  total: number;
  rpm: number;
  p50: number | null;
  p90: number | null;
  p95: number | null;
  p99: number | null;
  errorRate: number | null;
  timeoutRate: number | null;
  slowCalls: Array<{ name: string; avg: number; count: number }>;
  topErrors: Array<{ name: string; errs: number }>;
}

export interface LiveOpsSnapshot {
  queue: QueueMetrics;
  rpc: RpcMetrics;
  errors24h: number;
  fetchedAt: number;
  source: 'live' | 'degraded';
  message?: string;
}

export function useLiveOpsMetrics() {
  return useQuery<LiveOpsSnapshot>({
    queryKey: ['live-ops-metrics', WINDOW_MIN],
    queryFn: async () => {
      const now = Date.now();
      const sinceIso = new Date(now - WINDOW_MIN * 60_000).toISOString();
      const since24 = new Date(now - 24 * 3_600_000).toISOString();

      // Read-only fetches in parallel. Any failure degrades that slice, not the whole page.
      const [tasksRes, telRes, errRes] = await Promise.allSettled([
        supabase
          .from('background_tasks')
          .select('status,attempts,max_attempts,started_at,completed_at,created_at')
          .gte('created_at', since24)
          .limit(2000),
        supabase
          .from('telemetry_events')
          .select('kind,name,duration_ms,success,timeout,event_ts')
          .gte('event_ts', sinceIso)
          .order('event_ts', { ascending: false })
          .limit(5000),
        supabase
          .from('system_errors')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', since24),
      ]);

      const queue: QueueMetrics = {
        pending: 0, processing: 0, completed: 0, failed: 0, retry: 0, dlq: 0,
        depth: 0, avgDurationMs: null, maxDurationMs: null, successRate: null, throughputPerMin: null,
      };
      let degraded = false;
      let message: string | undefined;

      if (tasksRes.status === 'fulfilled' && !tasksRes.value.error) {
        const rows = (tasksRes.value.data ?? []) as any[];
        const durs: number[] = [];
        for (const r of rows) {
          const s = (r.status ?? '').toUpperCase();
          if (s === 'PENDING') queue.pending++;
          else if (s === 'PROCESSING') queue.processing++;
          else if (s === 'COMPLETED') queue.completed++;
          else if (s === 'FAILED') {
            queue.failed++;
            if ((r.attempts ?? 0) >= (r.max_attempts ?? 3)) queue.dlq++;
          } else if (s === 'RETRY') queue.retry++;
          if (r.started_at && r.completed_at) {
            durs.push(new Date(r.completed_at).getTime() - new Date(r.started_at).getTime());
          }
        }
        queue.depth = queue.pending + queue.processing + queue.retry;
        if (durs.length) {
          queue.avgDurationMs = durs.reduce((a, b) => a + b, 0) / durs.length;
          queue.maxDurationMs = Math.max(...durs);
        }
        const done = queue.completed + queue.failed;
        queue.successRate = done ? queue.completed / done : null;
        queue.throughputPerMin = queue.completed / (24 * 60);
      } else {
        degraded = true; message = 'background_tasks indisponível';
      }

      const rpc: RpcMetrics = {
        total: 0, rpm: 0, p50: null, p90: null, p95: null, p99: null,
        errorRate: null, timeoutRate: null, slowCalls: [], topErrors: [],
      };
      if (telRes.status === 'fulfilled' && !telRes.value.error) {
        const rows = (telRes.value.data ?? []) as any[];
        rpc.total = rows.length;
        rpc.rpm = rows.length / WINDOW_MIN;
        const durs = rows.map(r => r.duration_ms).sort((a, b) => a - b);
        rpc.p50 = pct(durs, 50);
        rpc.p90 = pct(durs, 90);
        rpc.p95 = pct(durs, 95);
        rpc.p99 = pct(durs, 99);
        const errs = rows.filter(r => !r.success).length;
        rpc.errorRate = rows.length ? errs / rows.length : null;
        rpc.timeoutRate = rows.length ? rows.filter(r => r.timeout).length / rows.length : null;
        const byName = new Map<string, { count: number; sum: number; errs: number }>();
        for (const r of rows) {
          const key = `${r.kind}:${r.name}`;
          const prev = byName.get(key) ?? { count: 0, sum: 0, errs: 0 };
          prev.count++; prev.sum += r.duration_ms; if (!r.success) prev.errs++;
          byName.set(key, prev);
        }
        rpc.slowCalls = [...byName.entries()]
          .map(([name, v]) => ({ name, avg: v.sum / v.count, count: v.count }))
          .sort((a, b) => b.avg - a.avg).slice(0, 5);
        rpc.topErrors = [...byName.entries()]
          .filter(([, v]) => v.errs > 0)
          .map(([name, v]) => ({ name, errs: v.errs }))
          .sort((a, b) => b.errs - a.errs).slice(0, 5);
      } else {
        degraded = true; message = message ?? 'telemetry_events indisponível';
      }

      const errors24h = errRes.status === 'fulfilled' ? (errRes.value.count ?? 0) : 0;
      if (errRes.status === 'rejected' || (errRes.status === 'fulfilled' && errRes.value.error)) {
        degraded = true;
      }

      return {
        queue, rpc, errors24h,
        fetchedAt: Date.now(),
        source: degraded ? 'degraded' : 'live',
        message,
      };
    },
    refetchInterval: REFRESH_MS,
    staleTime: REFRESH_MS / 2,
    retry: 1,
  });
}
