import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, TrendingUp, Building2, Users, Activity, Target,
  CheckCircle2, Clock, XCircle, AlertTriangle, Trophy, Receipt,
} from 'lucide-react';
import FounderAnalyticsCharts from '@/components/founder/FounderAnalyticsCharts';
import GlobalFiltersBar from '@/components/filters/GlobalFiltersBar';
import { useGlobalFilters } from '@/contexts/GlobalFiltersContext';

const fmtMoney = (n: unknown) =>
  `${Number(n ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;
const fmtNum = (n: unknown) => Number(n ?? 0).toLocaleString('pt-PT');

interface StatProps { icon: React.ElementType; label: string; value: React.ReactNode; tone?: 'default'|'success'|'warning'|'danger'|'gold' }
const Stat: React.FC<StatProps> = ({ icon: Icon, label, value, tone = 'default' }) => {
  const toneCls = {
    default: 'from-primary/10 to-primary/5 text-primary',
    success: 'from-success/15 to-success/5 text-success',
    warning: 'from-warning/15 to-warning/5 text-warning',
    danger:  'from-destructive/15 to-destructive/5 text-destructive',
    gold:    'from-gold/20 to-accent/5 text-accent-foreground',
  }[tone];
  return (
    <Card className="p-4">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${toneCls} mb-3`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-black mt-1">{value}</p>
    </Card>
  );
};

export default function FounderGlobalDashboardPage() {
  const { range } = useGlobalFilters();
  const { data, isLoading, error } = useQuery({
    queryKey: ['founder-global-dashboard', range.from?.toISOString(), range.to?.toISOString()],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('founder_global_dashboard_stats');
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  if (isLoading) return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
    </div>
  );
  if (error) return (
    <Card className="p-6 border-destructive/40 bg-destructive/5 text-sm text-destructive">
      <div className="flex items-center gap-2 font-bold mb-1"><AlertTriangle className="h-4 w-4" /> Erro ao carregar</div>
      <code className="text-xs opacity-80">{(error as Error).message}</code>
    </Card>
  );

  const d = data ?? {};
  const r = d.receita ?? {}; const c = d.empresas ?? {}; const u = d.utilizadores ?? {};
  const crm = d.crm ?? {}; const fin = d.financeiro ?? {}; const tops = (d.top_empresas ?? []) as any[];
  const revByPlan = (fin.receita_por_plano ?? {}) as Record<string, number>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">Dashboard Global do Founder</h1>
        <p className="text-sm text-muted-foreground">Visão consolidada da plataforma em tempo real</p>
      </header>

      <section>
        <h2 className="text-xs font-bold uppercase text-muted-foreground mb-2">Receita</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat icon={DollarSign} label="MRR" value={fmtMoney(r.mrr)} tone="gold" />
          <Stat icon={TrendingUp} label="ARR" value={fmtMoney(r.arr)} tone="gold" />
          <Stat icon={DollarSign} label="Receita Total" value={fmtMoney(r.total)} tone="success" />
          <Stat icon={DollarSign} label="Este Mês" value={fmtMoney(r.mes)} />
          <Stat icon={DollarSign} label="Hoje" value={fmtMoney(r.dia)} />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase text-muted-foreground mb-2">Empresas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Stat icon={Building2} label="Total" value={fmtNum(c.total)} />
          <Stat icon={CheckCircle2} label="Ativas" value={fmtNum(c.ativas)} tone="success" />
          <Stat icon={Clock} label="Trial" value={fmtNum(c.trial)} tone="warning" />
          <Stat icon={XCircle} label="Suspensas" value={fmtNum(c.suspensas)} tone="danger" />
          <Stat icon={XCircle} label="Canceladas" value={fmtNum(c.canceladas)} tone="danger" />
          <Stat icon={Building2} label="Novas (30d)" value={fmtNum(c.novas)} tone="success" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase text-muted-foreground mb-2">Utilizadores</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Users} label="Total" value={fmtNum(u.total)} />
          <Stat icon={Activity} label="Ativos (30d)" value={fmtNum(u.ativos)} tone="success" />
          <Stat icon={Activity} label="Online" value={fmtNum(u.online)} tone="success" />
          <Stat icon={Users} label="Novos (30d)" value={fmtNum(u.novos)} />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase text-muted-foreground mb-2">CRM Global</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat icon={Target} label="Leads Total" value={fmtNum(crm.leads_total)} />
          <Stat icon={CheckCircle2} label="Convertidos" value={fmtNum(crm.convertidos)} tone="success" />
          <Stat icon={XCircle} label="Perdidos" value={fmtNum(crm.perdidos)} tone="danger" />
          <Stat icon={DollarSign} label="Pipeline Global" value={fmtMoney(crm.pipeline_global)} tone="gold" />
          <Stat icon={TrendingUp} label="Taxa Conversão" value={`${Number(crm.taxa_conversao ?? 0).toFixed(1)}%`} tone="success" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase text-muted-foreground mb-2">Financeiro</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Receipt} label="Faturas Emitidas" value={fmtNum(fin.faturas_emitidas)} />
          <Stat icon={CheckCircle2} label="Faturas Pagas" value={fmtNum(fin.faturas_pagas)} tone="success" />
          <Stat icon={Clock} label="Pendentes" value={fmtNum(fin.faturas_pendentes)} tone="warning" />
          <Stat icon={DollarSign} label="Valor Pendente" value={fmtMoney(fin.pendente_valor)} tone="warning" />
        </div>
        {Object.keys(revByPlan).length > 0 && (
          <Card className="p-4 mt-3">
            <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3">Receita por Plano</h3>
            <div className="space-y-2">
              {Object.entries(revByPlan).map(([plan, val]) => (
                <div key={plan} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50">
                  <Badge variant="outline" className="capitalize">{plan}</Badge>
                  <span className="font-bold text-gold">{fmtMoney(val)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase text-muted-foreground mb-2">Business Analytics</h2>
        <FounderAnalyticsCharts />
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
          <Trophy className="h-4 w-4" /> Top 10 Empresas por Receita
        </h2>
        <Card className="p-4">
          {tops.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem dados.</p>
          ) : (
            <div className="space-y-2">
              {tops.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 justify-center font-bold">{i + 1}</Badge>
                    <span className="font-medium">{t.name}</span>
                  </div>
                  <span className="font-bold text-gold">{fmtMoney(t.receita)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
