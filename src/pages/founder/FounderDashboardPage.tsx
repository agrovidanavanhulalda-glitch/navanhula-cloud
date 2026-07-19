import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { rpcWithMetrics } from '@/lib/telemetry/rpcWithMetrics';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Store, Users, UserCheck, CreditCard, Clock, XCircle, CheckCircle2,
  Database, Table as TableIcon, Eye, FunctionSquare as FunctionIcon, Shield, Zap, HardDrive,
  Activity, Wifi, TrendingUp, AlertTriangle, Timer, Package,
} from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';

type Stats = Record<string, number | string>;

const formatNumber = (n: unknown) => {
  const v = Number(n ?? 0);
  return v.toLocaleString('pt-PT');
};

const formatMoney = (n: unknown) => {
  const v = Number(n ?? 0);
  return `${v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;
};

const formatBytes = (bytes: unknown) => {
  const b = Number(bytes ?? 0);
  if (b < 1024) return `${b} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = b / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(2)} ${units[i]}`;
};

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'gold';
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, hint, tone = 'default' }) => {
  const toneClasses = {
    default: 'from-primary/10 to-primary/5 text-primary',
    success: 'from-success/15 to-success/5 text-success',
    warning: 'from-warning/15 to-warning/5 text-warning',
    danger:  'from-destructive/15 to-destructive/5 text-destructive',
    gold:    'from-gold/20 to-accent/5 text-accent-foreground',
  }[tone];
  return (
    <Card className="p-4 border-border/60 hover:border-primary/40 transition-colors">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${toneClasses} mb-3`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-black text-foreground mt-1 leading-tight">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </Card>
  );
};

function useRpcStats(fn: 'founder_platform_stats' | 'founder_infrastructure_stats' | 'founder_monitoring_stats') {
  return useQuery({
    queryKey: ['founder', fn],
    queryFn: async () => {
      const { data, error } = await rpcWithMetrics<Stats>(fn);
      if (error) throw error;
      return (data ?? {}) as Stats;
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

const LoadingGrid: React.FC = () => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
  </div>
);

const ErrorPanel: React.FC<{ error: unknown }> = ({ error }) => (
  <Card className="p-6 border-destructive/40 bg-destructive/5 text-sm text-destructive">
    <div className="flex items-center gap-2 font-bold mb-1"><AlertTriangle className="h-4 w-4" /> Erro ao carregar dados</div>
    <code className="text-xs opacity-80">{(error as Error)?.message ?? String(error)}</code>
  </Card>
);

// -------- Platform tab --------
const PlatformTab: React.FC = () => {
  const { data, isLoading, error } = useRpcStats('founder_platform_stats');
  if (isLoading) return <LoadingGrid />;
  if (error) return <ErrorPanel error={error} />;
  const s = data ?? {};
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Building2}   label="Empresas Totais"    value={formatNumber(s.companies_total)} />
      <StatCard icon={CheckCircle2} label="Empresas Ativas"   value={formatNumber(s.companies_active)} tone="success" />
      <StatCard icon={XCircle}     label="Empresas Bloqueadas" value={formatNumber(s.companies_blocked)} tone="danger" />
      <StatCard icon={Store}       label="Lojas"              value={formatNumber(s.stores_total)} />
      <StatCard icon={Users}       label="Utilizadores"       value={formatNumber(s.users_total)} />
      <StatCard icon={UserCheck}   label="Clientes"           value={formatNumber(s.customers_total)} />
      <StatCard icon={CreditCard}  label="Assinaturas Ativas" value={formatNumber(s.subscriptions_active)} tone="success" />
      <StatCard icon={Clock}       label="Trial Ativos"       value={formatNumber(s.trials_active)} tone="warning" />
      <StatCard icon={Clock}       label="Trial Expirados"    value={formatNumber(s.trials_expired)} tone="danger" />
      <StatCard icon={TrendingUp}  label="Receita Mensal"     value={formatMoney(s.revenue_month)} tone="gold" />
      <StatCard icon={TrendingUp}  label="Receita Total"      value={formatMoney(s.revenue_total)} tone="gold" />
      <StatCard icon={Building2}   label="Filiais"            value={formatNumber(s.branches_total)} />
    </div>
  );
};

// -------- Infrastructure tab --------
const InfraTab: React.FC = () => {
  const { data, isLoading, error } = useRpcStats('founder_infrastructure_stats');
  if (isLoading) return <LoadingGrid />;
  if (error) return <ErrorPanel error={error} />;
  const s = data ?? {};
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={HardDrive}    label="Tamanho da BD"   value={formatBytes(s.db_size_bytes)} tone="gold" />
      <StatCard icon={TableIcon}    label="Tabelas"         value={formatNumber(s.tables_count)} />
      <StatCard icon={Eye}          label="Vistas (Views)"  value={formatNumber(s.views_count)} />
      <StatCard icon={FunctionIcon} label="Funções / RPCs"  value={formatNumber(s.functions_count)} />
      <StatCard icon={Shield}       label="Políticas RLS"   value={formatNumber(s.policies_count)} tone="success" />
      <StatCard icon={Zap}          label="Triggers"        value={formatNumber(s.triggers_count)} />
      <StatCard icon={Package}      label="Storage Buckets" value={formatNumber(s.buckets_count)} />
      <StatCard icon={Database}     label="Extensões"       value={formatNumber(s.extensions_count)} />
    </div>
  );
};

// -------- System tab --------
const SystemTab: React.FC = () => {
  const [latency, setLatency] = React.useState<number | null>(null);
  React.useEffect(() => {
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

  const env = import.meta.env.MODE;
  const version = '2.0.0';
  const buildTs = new Date().toISOString().slice(0, 16).replace('T', ' ');

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Package}  label="Versão"    value={version} />
      <StatCard icon={Activity} label="Ambiente"  value={env} tone={env === 'production' ? 'success' : 'warning'} />
      <StatCard icon={Timer}    label="Build"     value={buildTs} />
      <StatCard icon={CheckCircle2} label="Status" value={<Badge variant="outline" className="text-success border-success">Operacional</Badge>} tone="success" />
      <StatCard icon={Wifi}     label="Latência API" value={latency !== null ? `${latency} ms` : '—'} tone={latency !== null && latency < 200 ? 'success' : 'warning'} />
      <StatCard icon={Zap}      label="Runtime"   value="Edge Serverless" />
      <StatCard icon={Database} label="Deploy"    value="Lovable Cloud" tone="gold" />
      <StatCard icon={Shield}   label="SSL"       value="Ativo" tone="success" />
    </div>
  );
};

// -------- Monitoring tab --------
const MonitoringTab: React.FC = () => {
  const { data, isLoading, error } = useRpcStats('founder_monitoring_stats');
  if (isLoading) return <LoadingGrid />;
  if (error) return <ErrorPanel error={error} />;
  const s = data ?? {};
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Activity} label="Sessões Ativas (5m)" value={formatNumber(s.sessions_active_5m)} tone="success" />
        <StatCard icon={Users}    label="Utilizadores Online" value={formatNumber(s.users_online)} tone="success" />
        <StatCard icon={Building2} label="Empresas Online"    value={formatNumber(s.companies_online)} />
        <StatCard icon={Zap}      label="API Calls (1h)"      value={formatNumber(s.api_calls_1h)} />
        <StatCard icon={AlertTriangle} label="API Erros (1h)" value={formatNumber(s.api_errors_1h)} tone="warning" />
        <StatCard icon={Timer}    label="Latência Média"      value={`${formatNumber(s.api_avg_latency_ms)} ms`} />
      </div>
      <Card className="mt-4 p-4 border-dashed">
        <p className="text-xs text-muted-foreground">
          <strong>Nota:</strong> Métricas de CPU / RAM / Storage do host não estão disponíveis
          na infraestrutura serverless da Lovable Cloud. O que é rastreado acima reflete o uso real da plataforma.
        </p>
      </Card>
    </>
  );
};

// -------- Page --------
export const FounderDashboardPage: React.FC = () => {
  return (
    <WorkspaceShell>
      <Tabs defaultValue="platform" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex">
          <TabsTrigger value="platform">Plataforma</TabsTrigger>
          <TabsTrigger value="infra">Infraestrutura</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="monitoring">Monitorização</TabsTrigger>
        </TabsList>
        <TabsContent value="platform"><PlatformTab /></TabsContent>
        <TabsContent value="infra"><InfraTab /></TabsContent>
        <TabsContent value="system"><SystemTab /></TabsContent>
        <TabsContent value="monitoring"><MonitoringTab /></TabsContent>
      </Tabs>
    </WorkspaceShell>
  );
};

export default FounderDashboardPage;
