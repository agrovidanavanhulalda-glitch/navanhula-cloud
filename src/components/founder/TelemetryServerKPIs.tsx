/**
 * Sprint 2.6 · Founder-only server-side telemetry KPIs & health alerts (read-only).
 * Queries public.telemetry_events (RLS restricts to founders).
 * Zero writes, zero business logic changes.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, Timer, TrendingUp } from 'lucide-react';

interface Row {
  kind: string;
  name: string;
  duration_ms: number;
  success: boolean;
  timeout: boolean | null;
  event_ts: string;
}

const WINDOW_MIN = 15;

function pct(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

export const TelemetryServerKPIs: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['telemetry_events', WINDOW_MIN],
    queryFn: async () => {
      const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
      const { data, error } = await supabase
        .from('telemetry_events')
        .select('kind,name,duration_ms,success,timeout,event_ts')
        .gte('event_ts', since)
        .order('event_ts', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  if (isLoading) return <Card className="p-4 text-xs text-muted-foreground">A carregar telemetria...</Card>;
  if (error) {
    return (
      <Card className="p-4 border-destructive/40 bg-destructive/5 text-xs text-destructive">
        Sem acesso a telemetria server-side ou tabela vazia. {(error as Error).message}
      </Card>
    );
  }
  const rows = data ?? [];
  const total = rows.length;
  const durs = rows.map(r => r.duration_ms).sort((a, b) => a - b);
  const errors = rows.filter(r => !r.success).length;
  const errorRate = total ? (errors / total) * 100 : 0;
  const rpm = total / WINDOW_MIN;

  const byName = new Map<string, { count: number; sum: number; max: number; errs: number }>();
  for (const r of rows) {
    const key = `${r.kind}:${r.name}`;
    const prev = byName.get(key) ?? { count: 0, sum: 0, max: 0, errs: 0 };
    prev.count += 1;
    prev.sum += r.duration_ms;
    prev.max = Math.max(prev.max, r.duration_ms);
    if (!r.success) prev.errs += 1;
    byName.set(key, prev);
  }
  const topByCount = [...byName.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  const slowest = [...byName.entries()].sort((a, b) => (b[1].sum / b[1].count) - (a[1].sum / a[1].count)).slice(0, 5);

  const alerts: { level: 'warn' | 'danger'; msg: string }[] = [];
  if (pct(durs, 95) > 500) alerts.push({ level: 'warn', msg: `p95 elevado: ${pct(durs, 95).toFixed(0)} ms` });
  if (errorRate > 5) alerts.push({ level: 'danger', msg: `Erro > 5% (${errorRate.toFixed(1)}%)` });
  if (rows.some(r => r.timeout)) alerts.push({ level: 'warn', msg: 'Timeouts detectados na janela' });

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Telemetria server-side · últimos {WINDOW_MIN} min
            <Badge variant="outline" className="ml-auto text-[10px]">{total} eventos</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <KPI icon={Activity} label="Requests / min" value={rpm.toFixed(1)} />
          <KPI icon={Timer} label="p50" value={`${pct(durs, 50).toFixed(0)} ms`} />
          <KPI icon={Timer} label="p95" value={`${pct(durs, 95).toFixed(0)} ms`} />
          <KPI icon={Timer} label="p99" value={`${pct(durs, 99).toFixed(0)} ms`} />
          <KPI icon={AlertTriangle} label="Error rate" value={`${errorRate.toFixed(1)} %`}
               tone={errorRate > 5 ? 'danger' : errorRate > 1 ? 'warn' : 'ok'} />
          <KPI icon={AlertTriangle} label="Erros" value={String(errors)}
               tone={errors > 0 ? 'warn' : 'ok'} />
          <KPI icon={Timer} label="Máx" value={`${(durs[durs.length - 1] ?? 0).toFixed(0)} ms`} />
          <KPI icon={Activity} label="Chamadas únicas" value={String(byName.size)} />
        </CardContent>
      </Card>

      {alerts.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Health Alerts (Founder)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {alerts.map((a, i) => (
              <Badge key={i} variant={a.level === 'danger' ? 'destructive' : 'outline'}
                     className="text-[11px]">{a.msg}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <TableCard title="Top RPCs (por volume)" rows={topByCount} />
        <TableCard title="Mais lentas (por média)" rows={slowest} />
      </div>
    </div>
  );
};

const KPI: React.FC<{ icon: React.ElementType; label: string; value: string; tone?: 'ok' | 'warn' | 'danger' }> = ({ icon: Icon, label, value, tone = 'ok' }) => (
  <div className="rounded-lg border border-border/60 p-3">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-3.5 w-3.5" /> <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </div>
    <div className={`mt-1 text-lg font-black ${tone === 'danger' ? 'text-destructive' : tone === 'warn' ? 'text-warning' : 'text-foreground'}`}>
      {value}
    </div>
  </div>
);

const TableCard: React.FC<{ title: string; rows: [string, { count: number; sum: number; max: number; errs: number }][] }> = ({ title, rows }) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
    <CardContent>
      {rows.length === 0 ? <p className="text-xs text-muted-foreground">Sem dados.</p> : (
        <table className="w-full text-xs">
          <thead className="text-muted-foreground border-b">
            <tr><th className="text-left py-1">Chamada</th><th className="text-right">N</th><th className="text-right">Média</th><th className="text-right">Máx</th><th className="text-right">Err</th></tr>
          </thead>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b last:border-0">
                <td className="py-1 font-mono truncate max-w-[220px]" title={k}>{k}</td>
                <td className="text-right">{v.count}</td>
                <td className="text-right">{(v.sum / v.count).toFixed(0)} ms</td>
                <td className="text-right">{v.max.toFixed(0)} ms</td>
                <td className="text-right">{v.errs > 0 ? <Badge variant="destructive" className="text-[10px]">{v.errs}</Badge> : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CardContent>
  </Card>
);

export default TelemetryServerKPIs;
