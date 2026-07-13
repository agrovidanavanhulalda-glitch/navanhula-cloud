/**
 * Sprint 3.1 · Live Enterprise Metrics (READ-ONLY).
 * Aggregates real counts and growth deltas from platform tables using
 * head:true `count` queries so no row payload is transferred.
 * Never writes. Fails silently → degraded / offline source.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const REFRESH_MS = 60_000;

export type LiveSource = 'live' | 'degraded' | 'offline';

export interface EnterpriseCounts {
  companies: number;
  users: number;
  sales: number;
  salesToday: number;
  sales7d: number;
  sales30d: number;
  fiscalDocs: number;
  fiscalDocs30d: number;
  telemetryEvents30d: number;
  telemetryEvents24h: number;
  backgroundTasks30d: number;
  backgroundTasks24h: number;
}

export interface EnterpriseLiveSnapshot {
  counts: EnterpriseCounts;
  perDay: {
    sales: number;
    fiscal: number;
    telemetry: number;
    tasks: number;
  };
  source: LiveSource;
  fetchedAt: string;
  errors: string[];
}

async function safeCount(
  table: string,
  build?: (q: any) => any,
): Promise<{ count: number; ok: boolean; error?: string }> {
  try {
    let q: any = (supabase.from as any)(table).select('id', { count: 'exact', head: true });
    if (build) q = build(q);
    const { count, error } = await q;
    if (error) return { count: 0, ok: false, error: error.message };
    return { count: count ?? 0, ok: true };
  } catch (e: any) {
    return { count: 0, ok: false, error: e?.message ?? String(e) };
  }
}

export function useLiveEnterpriseMetrics(pollMs: number = REFRESH_MS) {
  return useQuery<EnterpriseLiveSnapshot>({
    queryKey: ['live-enterprise-metrics'],
    queryFn: async () => {
      const now = Date.now();
      const iso = (ms: number) => new Date(now - ms).toISOString();
      const d1 = iso(24 * 3_600_000);
      const d7 = iso(7 * 86_400_000);
      const d30 = iso(30 * 86_400_000);
      const today = new Date(now); today.setHours(0, 0, 0, 0);
      const isoToday = today.toISOString();

      const [
        companies, users,
        sales, salesToday, sales7d, sales30d,
        fiscalDocs, fiscalDocs30d,
        telemetry30d, telemetry24h,
        tasks30d, tasks24h,
      ] = await Promise.all([
        safeCount('companies'),
        safeCount('profiles'),
        safeCount('sales'),
        safeCount('sales', q => q.gte('created_at', isoToday)),
        safeCount('sales', q => q.gte('created_at', d7)),
        safeCount('sales', q => q.gte('created_at', d30)),
        safeCount('fiscal_documents'),
        safeCount('fiscal_documents', q => q.gte('created_at', d30)),
        safeCount('telemetry_events', q => q.gte('event_ts', d30)),
        safeCount('telemetry_events', q => q.gte('event_ts', d1)),
        safeCount('background_tasks', q => q.gte('created_at', d30)),
        safeCount('background_tasks', q => q.gte('created_at', d1)),
      ]);

      const results = [
        companies, users, sales, salesToday, sales7d, sales30d,
        fiscalDocs, fiscalDocs30d, telemetry30d, telemetry24h, tasks30d, tasks24h,
      ];
      const errors = results.filter(r => !r.ok).map(r => r.error!).filter(Boolean);
      const okCount = results.filter(r => r.ok).length;
      const source: LiveSource =
        okCount === results.length ? 'live'
        : okCount === 0 ? 'offline'
        : 'degraded';

      const counts: EnterpriseCounts = {
        companies: companies.count,
        users: users.count,
        sales: sales.count,
        salesToday: salesToday.count,
        sales7d: sales7d.count,
        sales30d: sales30d.count,
        fiscalDocs: fiscalDocs.count,
        fiscalDocs30d: fiscalDocs30d.count,
        telemetryEvents30d: telemetry30d.count,
        telemetryEvents24h: telemetry24h.count,
        backgroundTasks30d: tasks30d.count,
        backgroundTasks24h: tasks24h.count,
      };

      return {
        counts,
        perDay: {
          sales: counts.sales30d / 30,
          fiscal: counts.fiscalDocs30d / 30,
          telemetry: counts.telemetryEvents30d / 30,
          tasks: counts.backgroundTasks30d / 30,
        },
        source,
        fetchedAt: new Date().toISOString(),
        errors,
      };
    },
    refetchInterval: pollMs,
    staleTime: pollMs / 2,
    retry: 1,
  });
}
