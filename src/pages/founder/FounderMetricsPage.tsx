import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { rpcWithMetrics } from '@/lib/telemetry/rpcWithMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Building2, Users, CreditCard, Clock, DollarSign, Store } from 'lucide-react';

const money = (n: unknown) =>
  `${Number(n ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;
const num = (n: unknown) => Number(n ?? 0).toLocaleString('pt-PT');

const Metric: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; hint?: string }> = ({
  icon: Icon, label, value, hint,
}) => (
  <Card className="p-4">
    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
      <Icon className="h-4 w-4" />
    </div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-2xl font-black mt-1">{value}</p>
    {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
  </Card>
);

export const FounderMetricsPage: React.FC = () => {
  const platform = useQuery({
    queryKey: ['founder', 'platform-metrics'],
    queryFn: async () => {
      const { data, error } = await rpcWithMetrics<Record<string, number>>('founder_platform_stats');
      if (error) throw error;
      return (data ?? {}) as Record<string, number>;
    },
    refetchInterval: 30_000,
  });

  if (platform.isLoading) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  }

  const s = platform.data ?? {};
  const mrr = Number(s.revenue_month ?? 0);
  const arr = mrr * 12;
  const active = Number(s.subscriptions_active ?? 0);
  const trials = Number(s.trials_active ?? 0);
  const conv = trials + active > 0 ? Math.round((active / (trials + active)) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Receita</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={DollarSign} label="Receita Total" value={money(s.revenue_total)} />
          <Metric icon={TrendingUp} label="MRR" value={money(mrr)} hint="Receita mensal recorrente" />
          <Metric icon={TrendingUp} label="ARR" value={money(arr)} hint="Estimativa anual" />
          <Metric icon={CreditCard} label="ARPU" value={money(active > 0 ? mrr / active : 0)} hint="Receita média por conta" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Assinaturas</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={CreditCard} label="Ativas" value={num(active)} />
          <Metric icon={Clock} label="Trials Ativos" value={num(trials)} />
          <Metric icon={Clock} label="Trials Expirados" value={num(s.trials_expired)} />
          <Metric icon={TrendingUp} label="Conversão Trial→Pago" value={`${conv}%`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Operações</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Building2} label="Empresas" value={num(s.companies_total)} hint={`${num(s.companies_active)} ativas`} />
          <Metric icon={Store} label="Lojas" value={num(s.stores_total)} />
          <Metric icon={Users} label="Utilizadores" value={num(s.users_total)} />
          <Metric icon={Users} label="Clientes" value={num(s.customers_total)} />
        </CardContent>
      </Card>
    </div>
  );
};

export default FounderMetricsPage;
