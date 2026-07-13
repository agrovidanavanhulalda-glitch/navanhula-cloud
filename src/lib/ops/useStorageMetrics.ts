/**
 * Sprint 2.9 · Read-only Storage metrics for Founder Ops.
 * Calls the SECURITY DEFINER `founder_storage_metrics` RPC (Founder-gated).
 * Never writes. Falls back to `degraded` when the RPC is unavailable.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BUCKET_RETENTION } from '@/lib/telemetry/retention';

export interface BucketMetric {
  bucket: string;
  objects: number;
  bytes: number;
  lastUpload: string | null;
  firstUpload: string | null;
  bytes24h: number;
  bytes7d: number;
  bytes30d: number;
}

export interface StorageForecast {
  dailyBytes: number;
  weeklyBytes: number;
  monthlyBytes: number;
  proj30dBytes: number;
  proj90dBytes: number;
  proj1yBytes: number;
}

export interface StorageAlert {
  level: 'info' | 'warning' | 'critical';
  bucket: string;
  message: string;
}

export interface StorageSnapshot {
  buckets: BucketMetric[];
  totals: { objects: number; bytes: number; buckets: number; emptyBuckets: number };
  largest: BucketMetric | null;
  forecast: StorageForecast;
  alerts: StorageAlert[];
  fetchedAt: string;
  source: 'live' | 'degraded' | 'offline';
}

const SPIKE_RATIO = 3; // 24h > 3x average daily
const BUCKET_SOFT_LIMIT = 5 * 1024 * 1024 * 1024; // 5 GB soft cap for alert bands

function buildForecast(buckets: BucketMetric[]): StorageForecast {
  const daily = buckets.reduce((n, b) => n + b.bytes24h, 0);
  const weekly = buckets.reduce((n, b) => n + b.bytes7d, 0);
  const monthly = buckets.reduce((n, b) => n + b.bytes30d, 0);
  const perDay = monthly / 30 || daily;
  return {
    dailyBytes: daily,
    weeklyBytes: weekly,
    monthlyBytes: monthly,
    proj30dBytes: perDay * 30,
    proj90dBytes: perDay * 90,
    proj1yBytes: perDay * 365,
  };
}

function buildAlerts(buckets: BucketMetric[], forecast: StorageForecast): StorageAlert[] {
  const alerts: StorageAlert[] = [];
  const avgDaily = forecast.monthlyBytes / 30;
  for (const b of buckets) {
    const pct = b.bytes / BUCKET_SOFT_LIMIT;
    if (pct >= 0.9) alerts.push({ level: 'critical', bucket: b.bucket, message: `Bucket acima de 90% do limite operacional (${(pct * 100).toFixed(0)}%)` });
    else if (pct >= 0.8) alerts.push({ level: 'warning', bucket: b.bucket, message: `Bucket acima de 80% do limite operacional (${(pct * 100).toFixed(0)}%)` });
    if (avgDaily > 0 && b.bytes24h > avgDaily * SPIKE_RATIO) {
      alerts.push({ level: 'warning', bucket: b.bucket, message: `Pico de crescimento nas últimas 24h (${SPIKE_RATIO}× média)` });
    }
    if (b.objects === 0) alerts.push({ level: 'info', bucket: b.bucket, message: 'Bucket vazio' });
  }
  return alerts;
}

export function summarize(rows: BucketMetric[]): StorageSnapshot {
  const totalBytes = rows.reduce((n, b) => n + b.bytes, 0);
  const totalObjects = rows.reduce((n, b) => n + b.objects, 0);
  const emptyBuckets = rows.filter(b => b.objects === 0).length;
  const largest = rows.reduce<BucketMetric | null>((acc, b) => (!acc || b.bytes > acc.bytes ? b : acc), null);
  const forecast = buildForecast(rows);
  return {
    buckets: rows.sort((a, b) => b.bytes - a.bytes),
    totals: { objects: totalObjects, bytes: totalBytes, buckets: rows.length, emptyBuckets },
    largest,
    forecast,
    alerts: buildAlerts(rows, forecast),
    fetchedAt: new Date().toISOString(),
    source: 'live',
  };
}

export function useStorageMetrics(pollMs: number = 60_000) {
  const [data, setData] = useState<StorageSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: rows, error: rpcErr } = await (supabase.rpc as any)('founder_storage_metrics');
        if (rpcErr) throw rpcErr;
        const mapped: BucketMetric[] = (rows ?? []).map((r: any) => ({
          bucket: r.bucket_id,
          objects: Number(r.objects ?? 0),
          bytes: Number(r.bytes ?? 0),
          lastUpload: r.last_upload,
          firstUpload: r.first_upload,
          bytes24h: Number(r.bytes_last_24h ?? 0),
          bytes7d: Number(r.bytes_last_7d ?? 0),
          bytes30d: Number(r.bytes_last_30d ?? 0),
        }));
        if (!cancelled) { setData(summarize(mapped)); setError(null); }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? String(e));
          setData(prev => prev ? { ...prev, source: 'degraded' } : {
            buckets: [], totals: { objects: 0, bytes: 0, buckets: 0, emptyBuckets: 0 },
            largest: null, forecast: buildForecast([]), alerts: [],
            fetchedAt: new Date().toISOString(), source: 'offline',
          });
        }
      }
    };
    load();
    const id = setInterval(load, pollMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [pollMs]);

  return { data, error, retention: BUCKET_RETENTION };
}
