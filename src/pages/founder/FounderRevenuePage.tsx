import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign, TrendingUp, TrendingDown, Users, Clock,
  AlertTriangle, XCircle, PauseCircle, Activity, Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

interface RevenueStats {
  mrr: number; arr: number;
  revenue_month: number; revenue_total: number;
  active: number; trial: number; past_due: number;
  cancelled: number; suspended: number;
  churn_rate: number; arpu: number; ltv: number;
  by_plan: Array<{ plan: string; count: number; mrr: number }>;
  revenue_12m: Array<{ month: string; revenue: number }>;
}

const money = (n: unknown) =>
  `${Number(n ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;
const num = (n: unknown) => Number(n ?? 0).toLocaleString('pt-PT');

const KPI: React.FC<{
  icon: React.ElementType; label: string; value: React.ReactNode; hint?: string; tone?: string;
}> = ({ icon: Icon, label, value, hint, tone = 'text-primary bg-primary/10' }) => (
  <Card className="p-4">
    <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg mb-2 ${tone}`}>
      <Icon className="h-4 w-4" />
    </div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-2xl font-black mt-1">{value}</p>
    {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
  </Card>
);

const FounderRevenuePage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['founder', 'revenue-stats'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('founder_revenue_stats');
      if (error) throw error;
      return data as RevenueStats;
    },
    refetchInterval: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">Revenue Engine</h2>
        <p className="text-sm text-muted-foreground">
          MRR, ARR, churn, LTV e receita mensal em tempo real.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI icon={TrendingUp} label="MRR" value={money(data.mrr)} hint="Receita recorrente mensal" />
        <KPI icon={DollarSign} label="ARR" value={money(data.arr)} hint="Receita anual projetada" tone="text-emerald-500 bg-emerald-500/10" />
        <KPI icon={Wallet} label="Receita do Mês" value={money(data.revenue_month)} tone="text-blue-500 bg-blue-500/10" />
        <KPI icon={Activity} label="Receita Total" value={money(data.revenue_total)} tone="text-purple-500 bg-purple-500/10" />

        <KPI icon={Users} label="Assinaturas Ativas" value={num(data.active)} />
        <KPI icon={Clock} label="Em Trial" value={num(data.trial)} tone="text-amber-500 bg-amber-500/10" />
        <KPI icon={AlertTriangle} label="Past Due" value={num(data.past_due)} tone="text-orange-500 bg-orange-500/10" />
        <KPI icon={PauseCircle} label="Suspensas" value={num(data.suspended)} tone="text-slate-500 bg-slate-500/10" />

        <KPI icon={XCircle} label="Canceladas" value={num(data.cancelled)} tone="text-rose-500 bg-rose-500/10" />
        <KPI icon={TrendingDown} label="Churn Rate" value={`${data.churn_rate}%`} tone="text-red-500 bg-red-500/10" />
        <KPI icon={DollarSign} label="ARPU" value={money(data.arpu)} hint="Receita média por cliente" />
        <KPI icon={TrendingUp} label="LTV (24m)" value={money(data.ltv)} hint="Lifetime Value estimado" tone="text-emerald-500 bg-emerald-500/10" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-sm font-bold mb-3">Receita — últimos 12 meses</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenue_12m}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => money(v)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-bold mb-3">MRR por Plano</h3>
          <div className="space-y-3">
            {data.by_plan.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem assinaturas ativas.</p>
            ) : (
              data.by_plan.map((p) => (
                <div key={p.plan} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div>
                    <p className="text-sm font-bold uppercase">{p.plan}</p>
                    <p className="text-xs text-muted-foreground">{num(p.count)} assinaturas</p>
                  </div>
                  <p className="text-lg font-black text-primary">{money(p.mrr)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default FounderRevenuePage;
