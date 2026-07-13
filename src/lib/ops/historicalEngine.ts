/**
 * Sprint 3.2 · Historical Engine (READ-ONLY).
 * Consolidates time-series counts across platform tables using head:true `count`
 * queries. Never writes. Degrades gracefully per slice.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const REFRESH_MS = 120_000;

export type Window = '24h' | '7d' | '30d' | '90d' | '365d';
export const WINDOWS: Window[] = ['24h', '7d', '30d', '90d', '365d'];
export const WINDOW_DAYS: Record<Window, number> = {
  '24h': 1, '7d': 7, '30d': 30, '90d': 90, '365d': 365,
};

export type SeriesKey =
  | 'companies' | 'users' | 'sales' | 'fiscalDocs'
  | 'telemetry' | 'backgroundTasks';

export interface HistoricalSlice {
  key: SeriesKey;
  total: number;
  byWindow: Record<Window, number>;
  ok: boolean;
  error?: string;
}

export interface HistoricalSnapshot {
  slices: Record<SeriesKey, HistoricalSlice>;
  source: 'live' | 'degraded' | 'offline';
  fetchedAt: string;
  errors: string[];
}

const TABLES: Record<SeriesKey, { table: string; tsCol: string }> = {
  companies: { table: 'companies', tsCol: 'created_at' },
  users: { table: 'profiles', tsCol: 'created_at' },
  sales: { table: 'sales', tsCol: 'created_at' },
  fiscalDocs: { table: 'fiscal_documents', tsCol: 'created_at' },
  telemetry: { table: 'telemetry_events', tsCol: 'event_ts' },
  backgroundTasks: { table: 'background_tasks', tsCol: 'created_at' },
};

async function count(table: string, filter?: (q: any) => any) {
  try {
    let q: any = (supabase.from as any)(table).select('id', { count: 'exact', head: true });
    if (filter) q = filter(q);
    const { count, error } = await q;
    if (error) return { count: 0, ok: false, error: error.message };
    return { count: count ?? 0, ok: true };
  } catch (e: any) {
    return { count: 0, ok: false, error: e?.message ?? String(e) };
  }
}

async function fetchSlice(key: SeriesKey): Promise<HistoricalSlice> {
  const cfg = TABLES[key];
  const now = Date.now();
  const totalRes = await count(cfg.table);
  const byWindow: Record<Window, number> = { '24h': 0, '7d': 0, '30d': 0, '90d': 0, '365d': 0 };
  const errs: string[] = [];
  await Promise.all(
    WINDOWS.map(async (w) => {
      const iso = new Date(now - WINDOW_DAYS[w] * 86_400_000).toISOString();
      const r = await count(cfg.table, (q) => q.gte(cfg.tsCol, iso));
      if (!r.ok && r.error) errs.push(`${key}:${w} ${r.error}`);
      byWindow[w] = r.count;
    }),
  );
  return {
    key,
    total: totalRes.count,
    byWindow,
    ok: totalRes.ok && errs.length === 0,
    error: !totalRes.ok ? totalRes.error : errs[0],
  };
}

export function useHistoricalEngine(pollMs: number = REFRESH_MS) {
  return useQuery<HistoricalSnapshot>({
    queryKey: ['historical-engine'],
    queryFn: async () => {
      const keys = Object.keys(TABLES) as SeriesKey[];
      const results = await Promise.all(keys.map(fetchSlice));
      const slices = Object.fromEntries(results.map((s) => [s.key, s])) as Record<SeriesKey, HistoricalSlice>;
      const ok = results.filter((r) => r.ok).length;
      const source: HistoricalSnapshot['source'] =
        ok === results.length ? 'live' : ok === 0 ? 'offline' : 'degraded';
      return {
        slices,
        source,
        fetchedAt: new Date().toISOString(),
        errors: results.filter((r) => !r.ok).map((r) => r.error!).filter(Boolean),
      };
    },
    refetchInterval: pollMs,
    staleTime: pollMs / 2,
    retry: 1,
  });
}
