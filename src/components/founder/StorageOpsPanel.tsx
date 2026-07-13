/**
 * Sprint 2.9 · Founder Storage Ops widget (read-only).
 * Renders live bucket metrics, capacity forecast and storage alerts.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HardDrive, TrendingUp, AlertTriangle } from 'lucide-react';
import { useStorageMetrics } from '@/lib/ops/useStorageMetrics';

const fmtBytes = (b: number) => {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = b, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 2)} ${u[i]}`;
};

const alertTone = (l: string) =>
  l === 'critical' ? 'bg-destructive/15 text-destructive border-destructive/30'
  : l === 'warning' ? 'bg-warning/15 text-warning border-warning/30'
  : 'bg-muted text-muted-foreground border-border';

export const StorageOpsPanel: React.FC = () => {
  const { data, error, retention } = useStorageMetrics();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <HardDrive className="h-4 w-4" /> Storage Ops · Live
          <Badge variant="outline" className={`ml-auto ${
            data?.source === 'live' ? 'bg-success/15 text-success border-success/30'
            : data?.source === 'degraded' ? 'bg-warning/15 text-warning border-warning/30'
            : 'bg-muted text-muted-foreground border-border'
          }`}>
            {data?.source ?? 'loading'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-[11px] text-warning">RPC degradada: {error}</p>}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="text-lg font-black">{fmtBytes(data?.totals.bytes ?? 0)}</p>
            <p className="text-[11px] text-muted-foreground">{data?.totals.objects ?? 0} objetos · {data?.totals.buckets ?? 0} buckets</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Maior Bucket</p>
            <p className="text-lg font-black">{data?.largest?.bucket ?? '—'}</p>
            <p className="text-[11px] text-muted-foreground">{fmtBytes(data?.largest?.bytes ?? 0)}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Buckets Vazios</p>
            <p className="text-lg font-black">{data?.totals.emptyBuckets ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Crescimento 24h</p>
            <p className="text-lg font-black">{fmtBytes(data?.forecast.dailyBytes ?? 0)}</p>
            <p className="text-[11px] text-muted-foreground">7d: {fmtBytes(data?.forecast.weeklyBytes ?? 0)} · 30d: {fmtBytes(data?.forecast.monthlyBytes ?? 0)}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Projeção 30d</p>
            <p className="text-base font-bold">{fmtBytes(data?.forecast.proj30dBytes ?? 0)}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Projeção 90d</p>
            <p className="text-base font-bold">{fmtBytes(data?.forecast.proj90dBytes ?? 0)}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Projeção 1 ano</p>
            <p className="text-base font-bold">{fmtBytes(data?.forecast.proj1yBytes ?? 0)}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold mb-2">Buckets</p>
          <table className="w-full text-xs">
            <thead className="text-muted-foreground border-b">
              <tr>
                <th className="text-left py-1">Bucket</th>
                <th className="text-right">Objetos</th>
                <th className="text-right">Tamanho</th>
                <th className="text-right">24h</th>
                <th className="text-right">7d</th>
                <th className="text-right">Último upload</th>
                <th className="text-right">Retenção</th>
              </tr>
            </thead>
            <tbody>
              {(data?.buckets ?? []).map(b => {
                const r = retention.find(x => x.bucket === b.bucket);
                return (
                  <tr key={b.bucket} className="border-b last:border-0">
                    <td className="py-1 font-mono">{b.bucket}</td>
                    <td className="text-right">{b.objects}</td>
                    <td className="text-right">{fmtBytes(b.bytes)}</td>
                    <td className="text-right">{fmtBytes(b.bytes24h)}</td>
                    <td className="text-right">{fmtBytes(b.bytes7d)}</td>
                    <td className="text-right">{b.lastUpload ? new Date(b.lastUpload).toLocaleString() : '—'}</td>
                    <td className="text-right">{r ? (r.minRetentionDays ? `${Math.round(r.minRetentionDays / 30)}m` : '∞') : '—'}</td>
                  </tr>
                );
              })}
              {(!data || data.buckets.length === 0) && (
                <tr><td colSpan={7} className="py-3 text-center text-muted-foreground">Sem dados de storage.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <p className="text-xs font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="h-3 w-3" /> Alertas</p>
          {(data?.alerts ?? []).length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Sem alertas ativos.</p>
          ) : (
            <ul className="space-y-1">
              {data!.alerts.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-[11px]">
                  <Badge variant="outline" className={alertTone(a.level)}>{a.level}</Badge>
                  <span className="font-mono">{a.bucket}</span>
                  <span className="text-muted-foreground">— {a.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground text-right">
          Atualizado: {data ? new Date(data.fetchedAt).toLocaleTimeString() : '—'}
        </p>
      </CardContent>
    </Card>
  );
};

export default StorageOpsPanel;
