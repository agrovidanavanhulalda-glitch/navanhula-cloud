/**
 * Sprint 2.8 · Live Operations Panel (read-only).
 * Renders real metrics from useLiveOpsMetrics with degraded/offline indicators.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Timer, AlertTriangle, Database, Wifi, WifiOff } from 'lucide-react';
import { useLiveOpsMetrics } from '@/lib/ops/useLiveOpsMetrics';

const fmt = (v: number | null | undefined, suffix = '') =>
  v == null || Number.isNaN(v) ? '—' : `${Math.round(v).toLocaleString('pt-PT')}${suffix}`;

const pctFmt = (v: number | null | undefined) =>
  v == null ? '—' : `${(v * 100).toFixed(1)}%`;

export const LiveOpsPanel: React.FC = () => {
  const { data, isLoading, error, dataUpdatedAt, isFetching } = useLiveOpsMetrics();

  if (isLoading) {
    return <Card className="p-4 text-xs text-muted-foreground">A ligar às fontes reais…</Card>;
  }
  if (error || !data) {
    return (
      <Card className="p-4 border-destructive/40 bg-destructive/5 text-xs text-destructive flex items-center gap-2">
        <WifiOff className="h-3.5 w-3.5" /> Modo offline — sem acesso às métricas.
      </Card>
    );
  }

  const { queue, rpc, errors24h, source, message } = data;
  const degraded = source === 'degraded';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        {degraded ? <WifiOff className="h-3.5 w-3.5 text-warning" /> : <Wifi className="h-3.5 w-3.5 text-success" />}
        <span>Fonte: <strong className="text-foreground">{degraded ? 'DEGRADADA' : 'LIVE'}</strong></span>
        <span>· Última leitura: {new Date(dataUpdatedAt).toLocaleTimeString()}</span>
        {isFetching && <span>· A actualizar…</span>}
        {message && <span className="text-warning">· {message}</span>}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" /> Background Queue · janela 24 h
            <Badge variant="outline" className="ml-auto text-[10px]">depth {queue.depth}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs">
          <KPI label="Pending" value={fmt(queue.pending)} />
          <KPI label="Processing" value={fmt(queue.processing)} />
          <KPI label="Completed" value={fmt(queue.completed)} />
          <KPI label="Failed" value={fmt(queue.failed)} tone={queue.failed > 0 ? 'warn' : 'ok'} />
          <KPI label="Retry" value={fmt(queue.retry)} />
          <KPI label="DLQ" value={fmt(queue.dlq)} tone={queue.dlq > 0 ? 'danger' : 'ok'} />
          <KPI label="Sucesso" value={pctFmt(queue.successRate)} />
          <KPI label="Duração média" value={fmt(queue.avgDurationMs, ' ms')} />
          <KPI label="Duração máx" value={fmt(queue.maxDurationMs, ' ms')} />
          <KPI label="Throughput" value={`${(queue.throughputPerMin ?? 0).toFixed(2)}/min`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> RPC Telemetria · janela 15 min
            <Badge variant="outline" className="ml-auto text-[10px]">{rpc.total} eventos</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs">
          <KPI icon={Activity} label="RPC/min" value={rpc.rpm.toFixed(1)} />
          <KPI icon={Timer} label="p50" value={fmt(rpc.p50, ' ms')} />
          <KPI icon={Timer} label="p90" value={fmt(rpc.p90, ' ms')} />
          <KPI icon={Timer} label="p95" value={fmt(rpc.p95, ' ms')} />
          <KPI icon={Timer} label="p99" value={fmt(rpc.p99, ' ms')} />
          <KPI icon={AlertTriangle} label="Error rate" value={pctFmt(rpc.errorRate)}
               tone={(rpc.errorRate ?? 0) > 0.05 ? 'danger' : (rpc.errorRate ?? 0) > 0.01 ? 'warn' : 'ok'} />
          <KPI icon={AlertTriangle} label="Timeouts" value={pctFmt(rpc.timeoutRate)}
               tone={(rpc.timeoutRate ?? 0) > 0 ? 'warn' : 'ok'} />
          <KPI icon={AlertTriangle} label="Erros 24 h" value={fmt(errors24h)} tone={errors24h > 0 ? 'warn' : 'ok'} />
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <TableCard title="Chamadas mais lentas"
          headers={['Chamada', 'Média', 'N']}
          rows={rpc.slowCalls.map(s => [s.name, `${s.avg.toFixed(0)} ms`, String(s.count)])} />
        <TableCard title="Top erros"
          headers={['Chamada', 'Erros']}
          rows={rpc.topErrors.map(s => [s.name, String(s.errs)])} />
      </div>
    </div>
  );
};

const KPI: React.FC<{ icon?: React.ElementType; label: string; value: string; tone?: 'ok' | 'warn' | 'danger' }> =
  ({ icon: Icon, label, value, tone = 'ok' }) => (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className={`mt-1 text-lg font-black ${tone === 'danger' ? 'text-destructive' : tone === 'warn' ? 'text-warning' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  );

const TableCard: React.FC<{ title: string; headers: string[]; rows: string[][] }> = ({ title, headers, rows }) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
    <CardContent>
      {rows.length === 0 ? <p className="text-xs text-muted-foreground">Sem dados na janela.</p> : (
        <table className="w-full text-xs">
          <thead className="text-muted-foreground border-b">
            <tr>{headers.map(h => <th key={h} className="text-left py-1">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                {r.map((c, j) => <td key={j} className={`py-1 ${j === 0 ? 'font-mono truncate max-w-[240px]' : ''}`}>{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CardContent>
  </Card>
);

export default LiveOpsPanel;
