import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Users, TrendingUp, Target, DollarSign, Trophy, Phone,
  Mail, MessageSquare, CalendarCheck, StickyNote, AlertTriangle,
} from 'lucide-react';

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

export default function CommercialDashboardPage() {
  const { company } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['commercial-dashboard', company?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('commercial_dashboard_stats', { p_company_id: company!.id });
      if (error) throw error;
      return data as any;
    },
    enabled: !!company?.id,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  if (isLoading) return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
    </div>
  );
  if (error) return (
    <Card className="p-6 border-destructive/40 bg-destructive/5 text-sm text-destructive">
      <div className="flex items-center gap-2 font-bold mb-1"><AlertTriangle className="h-4 w-4" /> Erro ao carregar</div>
      <code className="text-xs opacity-80">{(error as Error).message}</code>
    </Card>
  );

  const d = data ?? {};
  const leads = d.leads ?? {}; const pipe = d.pipeline ?? {}; const conv = d.conversao ?? {};
  const acts = d.atividades ?? {}; const tops = (d.top_sellers ?? []) as any[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">Dashboard Comercial</h1>
        <p className="text-sm text-muted-foreground">Indicadores comerciais em tempo real</p>
      </header>

      <section>
        <h2 className="text-xs font-bold uppercase text-muted-foreground mb-2">Leads</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat icon={Users} label="Total" value={fmtNum(leads.total)} />
          <Stat icon={Users} label="Novos" value={fmtNum(leads.novos)} tone="warning" />
          <Stat icon={Users} label="Ativos" value={fmtNum(leads.ativos)} />
          <Stat icon={Users} label="Perdidos" value={fmtNum(leads.perdidos)} tone="danger" />
          <Stat icon={Users} label="Convertidos" value={fmtNum(leads.convertidos)} tone="success" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase text-muted-foreground mb-2">Pipeline</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={DollarSign} label="Valor Total" value={fmtMoney(pipe.total)} tone="gold" />
          <Stat icon={Target} label="Valor Ponderado" value={fmtMoney(pipe.ponderado)} />
          <Stat icon={TrendingUp} label="Receita Realizada" value={fmtMoney(pipe.receita_realizada)} tone="success" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase text-muted-foreground mb-2">Conversão</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={TrendingUp} label="Taxa de Conversão" value={`${Number(conv.taxa ?? 0).toFixed(1)}%`} tone="success" />
          <Stat icon={CalendarCheck} label="Tempo Médio (dias)" value={fmtNum(conv.tempo_medio_dias)} />
          <Stat icon={DollarSign} label="Ticket Médio" value={fmtMoney(conv.ticket_medio)} tone="gold" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase text-muted-foreground mb-2">Atividades</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat icon={Phone} label="Chamadas" value={fmtNum(acts.chamadas)} />
          <Stat icon={CalendarCheck} label="Reuniões" value={fmtNum(acts.reunioes)} />
          <Stat icon={Mail} label="Emails" value={fmtNum(acts.emails)} />
          <Stat icon={MessageSquare} label="WhatsApp" value={fmtNum(acts.whatsapp)} />
          <Stat icon={StickyNote} label="Notas" value={fmtNum(acts.notas)} />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
          <Trophy className="h-4 w-4" /> Top 10 Vendedores
        </h2>
        <Card className="p-4">
          {tops.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem conversões registadas.</p>
          ) : (
            <div className="space-y-2">
              {tops.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 justify-center font-bold">{i + 1}</Badge>
                    <span className="font-medium">{t.name ?? 'Sem responsável'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">{fmtNum(t.conversoes)} conv.</span>
                    <span className="font-bold text-gold">{fmtMoney(t.valor)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
