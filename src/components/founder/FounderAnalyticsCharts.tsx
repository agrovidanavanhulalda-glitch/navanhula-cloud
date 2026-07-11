import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';

interface Point {
  month: string;
  receita: number;
  mrr: number;
  arr: number;
  faturas: number;
  novos_clientes: number;
  cancelamentos: number;
  churn: number;
  conversoes: number;
}

const fmtMoney = (n: number) =>
  `${Number(n ?? 0).toLocaleString('pt-PT', { maximumFractionDigits: 0 })} MT`;

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Card className="p-4">
    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">{title}</h3>
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">{children as any}</ResponsiveContainer>
    </div>
  </Card>
);

const axisProps = {
  stroke: 'hsl(var(--muted-foreground))',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};
const tooltipStyle = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    fontSize: 12,
  },
};

export const FounderAnalyticsCharts: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['founder-business-analytics', 12],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('founder_business_analytics', { p_months: 12 });
      if (error) throw error;
      return (data?.series ?? []) as Point[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (isLoading) return (
    <div className="grid gap-3 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[320px]" />)}
    </div>
  );
  if (error) return (
    <Card className="p-6 border-destructive/40 bg-destructive/5 text-sm text-destructive">
      <div className="flex items-center gap-2 font-bold mb-1"><AlertTriangle className="h-4 w-4" /> Erro ao carregar</div>
      <code className="text-xs opacity-80">{(error as Error).message}</code>
    </Card>
  );

  const series = data ?? [];

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <ChartCard title="Receita Mensal / MRR (últimos 12 meses)">
        <AreaChart data={series}>
          <defs>
            <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} tickFormatter={(v) => `${Math.round(v/1000)}k`} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => fmtMoney(v)} />
          <Area type="monotone" dataKey="receita" name="Receita" stroke="hsl(var(--primary))" fill="url(#gRev)" strokeWidth={2} />
        </AreaChart>
      </ChartCard>

      <ChartCard title="ARR Projetado (MRR × 12)">
        <LineChart data={series}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} tickFormatter={(v) => `${Math.round(v/1000)}k`} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => fmtMoney(v)} />
          <Line type="monotone" dataKey="arr" name="ARR" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ChartCard>

      <ChartCard title="Novos Clientes vs Cancelamentos">
        <BarChart data={series}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="novos_clientes" name="Novos" fill="hsl(var(--success))" radius={[4,4,0,0]} />
          <Bar dataKey="cancelamentos" name="Cancelados" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Taxa de Churn (%)">
        <LineChart data={series}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} tickFormatter={(v) => `${v}%`} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => `${v}%`} />
          <Line type="monotone" dataKey="churn" name="Churn" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ChartCard>

      <ChartCard title="Conversões de Leads">
        <BarChart data={series}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey="conversoes" name="Conversões" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Faturas Emitidas por Mês">
        <BarChart data={series}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey="faturas" name="Faturas" fill="hsl(var(--accent))" radius={[4,4,0,0]} />
        </BarChart>
      </ChartCard>
    </div>
  );
};

export default FounderAnalyticsCharts;
