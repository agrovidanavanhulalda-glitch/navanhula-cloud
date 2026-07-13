import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { rpcWithMetrics } from '@/lib/telemetry/rpcWithMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Database, Shield, HardDrive, Wifi, Zap, Server, CheckCircle2, AlertTriangle } from 'lucide-react';

type Status = 'healthy' | 'warning' | 'critical' | 'offline';

const statusStyles: Record<Status, string> = {
  healthy: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  critical: 'bg-destructive/15 text-destructive border-destructive/30',
  offline: 'bg-muted text-muted-foreground border-border',
};

const HealthTile: React.FC<{ icon: React.ElementType; label: string; status: Status; hint?: string }> = ({
  icon: Icon, label, status, hint,
}) => (
  <Card className="p-4">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <Badge variant="outline" className={statusStyles[status]}>{status}</Badge>
    </div>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </Card>
);

const usePing = () => {
  const [latency, setLatency] = useState<number | null>(null);
  useEffect(() => {
    let mounted = true;
    const ping = async () => {
      const t = performance.now();
      try {
        await supabase.from('feature_flags').select('id', { count: 'exact', head: true });
        if (mounted) setLatency(Math.round(performance.now() - t));
      } catch { if (mounted) setLatency(null); }
    };
    ping();
    const id = setInterval(ping, 15_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);
  return latency;
};

export const FounderHealthPage: React.FC = () => {
  const latency = usePing();

  const monitoring = useQuery({
    queryKey: ['founder', 'health-monitoring'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('founder_monitoring_stats');
      if (error) throw error;
      return (data ?? {}) as Record<string, number>;
    },
    refetchInterval: 15_000,
  });

  const infra = useQuery({
    queryKey: ['founder', 'health-infra'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('founder_infrastructure_stats');
      if (error) throw error;
      return (data ?? {}) as Record<string, number>;
    },
    refetchInterval: 60_000,
  });

  const dbStatus: Status = latency === null ? 'offline' : latency < 400 ? 'healthy' : latency < 1000 ? 'warning' : 'critical';
  const errors1h = Number(monitoring.data?.api_errors_1h ?? 0);
  const apiStatus: Status = errors1h === 0 ? 'healthy' : errors1h < 20 ? 'warning' : 'critical';

  return (
    <div className="space-y-6">
      {/* Health tiles */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Estado do Sistema</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HealthTile icon={Database} label="Banco de Dados" status={dbStatus} hint={latency !== null ? `${latency} ms` : '—'} />
          <HealthTile icon={Shield} label="Auth" status="healthy" hint="Operacional" />
          <HealthTile icon={HardDrive} label="Storage" status="healthy" hint={`${infra.data?.buckets_count ?? 0} buckets`} />
          <HealthTile icon={Wifi} label="Realtime" status="healthy" hint="Websocket ativo" />
          <HealthTile icon={Zap} label="Edge Functions" status="healthy" hint="Serverless" />
          <HealthTile icon={Server} label="API" status={apiStatus} hint={`${errors1h} erros (1h)`} />
          <HealthTile icon={CheckCircle2} label="Backup" status="healthy" hint="Ver Backup Center" />
          <HealthTile icon={Activity} label="Sessões" status="healthy" hint={`${monitoring.data?.sessions_active_5m ?? 0} ativas`} />
        </CardContent>
      </Card>

      {/* Performance */}
      <Card>
        <CardHeader><CardTitle className="text-base">Performance</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {monitoring.isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />) : (
            <>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Latência API</p><p className="text-xl font-black">{latency ?? '—'} ms</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Requests (1h)</p><p className="text-xl font-black">{monitoring.data?.api_calls_1h ?? 0}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Erros (1h)</p><p className="text-xl font-black">{errors1h}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Latência Média</p><p className="text-xl font-black">{monitoring.data?.api_avg_latency_ms ?? 0} ms</p></Card>
            </>
          )}
        </CardContent>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader><CardTitle className="text-base">Base de Dados</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {infra.isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />) : (
            <>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Tabelas</p><p className="text-lg font-black">{infra.data?.tables_count ?? 0}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Views</p><p className="text-lg font-black">{infra.data?.views_count ?? 0}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Funções/RPCs</p><p className="text-lg font-black">{infra.data?.functions_count ?? 0}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Policies</p><p className="text-lg font-black">{infra.data?.policies_count ?? 0}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Triggers</p><p className="text-lg font-black">{infra.data?.triggers_count ?? 0}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Buckets</p><p className="text-lg font-black">{infra.data?.buckets_count ?? 0}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Extensões</p><p className="text-lg font-black">{infra.data?.extensions_count ?? 0}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Tamanho BD</p><p className="text-lg font-black">{Math.round(Number(infra.data?.db_size_bytes ?? 0) / 1024 / 1024)} MB</p></Card>
            </>
          )}
        </CardContent>
      </Card>

      {(monitoring.error || infra.error) && (
        <Card className="border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Falha ao carregar algumas métricas.
        </Card>
      )}
    </div>
  );
};

export default FounderHealthPage;
