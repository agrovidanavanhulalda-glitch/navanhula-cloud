import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, TrendingDown, Users, DollarSign, Target } from 'lucide-react';
import {
  ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip, Cell,
} from 'recharts';

const STAGES: { key: string; label: string; color: string }[] = [
  { key: 'novo',        label: 'Novos Leads',    color: 'hsl(210 90% 55%)' },
  { key: 'contactado',  label: 'Contactados',    color: 'hsl(200 85% 50%)' },
  { key: 'qualificado', label: 'Qualificados',   color: 'hsl(190 80% 45%)' },
  { key: 'proposta',    label: 'Proposta',       color: 'hsl(40 90% 55%)' },
  { key: 'negociacao',  label: 'Negociação',     color: 'hsl(30 90% 50%)' },
  { key: 'convertido',  label: 'Convertidos',    color: 'hsl(140 70% 45%)' },
];

const fmtMoney = (n: number) =>
  `${Number(n ?? 0).toLocaleString('pt-PT', { maximumFractionDigits: 0 })} MT`;
const fmtNum = (n: number) => Number(n ?? 0).toLocaleString('pt-PT');

interface Lead {
  status: string | null;
  value_estimated: number | null;
  probability: number | null;
}

export default function SalesFunnelPage() {
  const { company } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['sales-funnel', company?.id],
    enabled: !!company?.id,
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('status, value_estimated, probability')
        .eq('company_id', company!.id);
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const { funnel, totals } = useMemo(() => {
    const leads = data ?? [];
    const perdidos = leads.filter(l => l.status === 'perdido').length;
    const totalPipeline = leads
      .filter(l => l.status !== 'perdido' && l.status !== 'convertido')
      .reduce((s, l) => s + Number(l.value_estimated ?? 0), 0);
    const ponderado = leads.reduce(
      (s, l) => s + (Number(l.value_estimated ?? 0) * Number(l.probability ?? 0)) / 100, 0,
    );

    const funnel = STAGES.map((st) => {
      const rows = leads.filter(l => (l.status ?? 'novo') === st.key);
      const valor = rows.reduce((s, l) => s + Number(l.value_estimated ?? 0), 0);
      return { ...st, count: rows.length, valor };
    });

    const topCount = funnel[0].count || 1;
    funnel.forEach((f: any) => { f.taxa = (f.count / topCount) * 100; });

    return {
      funnel,
      totals: {
        total: leads.length,
        perdidos,
        pipeline: totalPipeline,
        ponderado,
        conversao: leads.length ? (funnel[funnel.length - 1].count / leads.length) * 100 : 0,
      },
    };
  }, [data]);

  if (isLoading) return (
    <div className="grid gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
    </div>
  );
  if (error) return (
    <Card className="p-6 border-destructive/40 bg-destructive/5 text-sm text-destructive">
      <div className="flex items-center gap-2 font-bold mb-1"><AlertTriangle className="h-4 w-4" /> Erro ao carregar</div>
      <code className="text-xs opacity-80">{(error as Error).message}</code>
    </Card>
  );

  const chartData = funnel.map(f => ({ name: f.label, value: Math.max(f.count, 0), fill: f.color }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">Funil de Vendas</h1>
        <p className="text-sm text-muted-foreground">Visualização das etapas do processo comercial</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3"><Users className="h-4 w-4" /></div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Leads</p>
          <p className="text-2xl font-black mt-1">{fmtNum(totals.total)}</p>
        </Card>
        <Card className="p-4">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-3"><TrendingDown className="h-4 w-4" /></div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Perdidos</p>
          <p className="text-2xl font-black mt-1">{fmtNum(totals.perdidos)}</p>
        </Card>
        <Card className="p-4">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground mb-3"><DollarSign className="h-4 w-4" /></div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pipeline</p>
          <p className="text-2xl font-black mt-1">{fmtMoney(totals.pipeline)}</p>
        </Card>
        <Card className="p-4">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3"><Target className="h-4 w-4" /></div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ponderado</p>
          <p className="text-2xl font-black mt-1">{fmtMoney(totals.ponderado)}</p>
        </Card>
        <Card className="p-4">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success mb-3"><Target className="h-4 w-4" /></div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Taxa Conversão</p>
          <p className="text-2xl font-black mt-1">{totals.conversao.toFixed(1)}%</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Funil Visual</h3>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8, fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} leads`, '']}
                />
                <Funnel dataKey="value" data={chartData} isAnimationActive>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" fontSize={12} />
                  <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={14} fontWeight="bold" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Detalhamento por Etapa</h3>
          <div className="space-y-3">
            {funnel.map((f: any, i) => {
              const prev = i > 0 ? funnel[i - 1].count : f.count;
              const drop = prev > 0 ? ((prev - f.count) / prev) * 100 : 0;
              return (
                <div key={f.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm" style={{ background: f.color }} />
                      <span className="font-medium">{f.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <Badge variant="outline">{fmtNum(f.count)}</Badge>
                      <span className="text-gold font-bold">{fmtMoney(f.valor)}</span>
                      {i > 0 && drop > 0 && (
                        <span className="text-destructive">−{drop.toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${f.taxa}%`, background: f.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}
