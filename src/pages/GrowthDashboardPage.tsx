import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, UserPlus, UserMinus, DollarSign, Target, BarChart3, Activity } from 'lucide-react';

const GrowthDashboardPage: React.FC = () => {
  const { company } = useAuth();
  const [metrics, setMetrics] = useState({
    totalLeads: 0, newLeads: 0, convertedLeads: 0, lostLeads: 0,
    conversionRate: 0, activeCustomers: 0, totalReferrals: 0, referralConversions: 0,
  });

  useEffect(() => {
    if (!company?.id) return;
    const load = async () => {
      const sb = supabase as any;
      const leadsRes = await sb.from('leads').select('status').eq('company_id', company.id);
      const referralsRes = await sb.from('referrals').select('status');
      const customersRes = await sb.from('customers').select('id', { count: 'exact' }).eq('company_id', company.id);

      const leads = (leadsRes.data || []) as { status: string }[];
      const referrals = (referralsRes.data || []) as { status: string }[];
      const total = leads.length;
      const converted = leads.filter(l => l.status === 'converted').length;
      const lost = leads.filter(l => l.status === 'lost').length;
      const newL = leads.filter(l => l.status === 'new').length;

      setMetrics({
        totalLeads: total,
        newLeads: newL,
        convertedLeads: converted,
        lostLeads: lost,
        conversionRate: total ? Math.round((converted / total) * 100) : 0,
        activeCustomers: customersRes.count || 0,
        totalReferrals: referrals.length,
        referralConversions: referrals.filter(r => r.status === 'converted').length,
      });
    };
    load();
  }, [company?.id]);

  const cards = [
    { title: 'Clientes Ativos', value: metrics.activeCustomers, icon: Users, color: 'text-primary' },
    { title: 'Total Leads', value: metrics.totalLeads, icon: UserPlus, color: 'text-[hsl(var(--warning))]' },
    { title: 'Convertidos', value: metrics.convertedLeads, icon: Target, color: 'text-[hsl(var(--success))]' },
    { title: 'Taxa Conversão', value: `${metrics.conversionRate}%`, icon: TrendingUp, color: 'text-primary' },
    { title: 'Leads Perdidos', value: metrics.lostLeads, icon: UserMinus, color: 'text-destructive' },
    { title: 'Churn Rate', value: metrics.totalLeads ? `${Math.round((metrics.lostLeads / metrics.totalLeads) * 100)}%` : '0%', icon: Activity, color: 'text-destructive' },
    { title: 'Indicações', value: metrics.totalReferrals, icon: Users, color: 'text-primary' },
    { title: 'Indicações Convertidas', value: metrics.referralConversions, icon: Target, color: 'text-[hsl(var(--success))]' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard de Crescimento</h1>
        <p className="text-sm text-muted-foreground">Métricas de aquisição, conversão e retenção</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <Card key={i} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{c.title}</p>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
          </Card>
        ))}
      </div>

      {/* Pipeline Funnel */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Funil de Conversão
        </h2>
        <div className="space-y-3">
          {[
            { label: 'Novos Leads', count: metrics.newLeads, pct: metrics.totalLeads ? (metrics.newLeads / metrics.totalLeads) * 100 : 0, color: 'bg-primary' },
            { label: 'Contactados', count: metrics.totalLeads - metrics.newLeads - metrics.convertedLeads - metrics.lostLeads, pct: 60, color: 'bg-[hsl(var(--warning))]' },
            { label: 'Demonstração', count: Math.round(metrics.convertedLeads * 1.3), pct: 35, color: 'bg-purple-500' },
            { label: 'Convertidos', count: metrics.convertedLeads, pct: metrics.conversionRate, color: 'bg-[hsl(var(--success))]' },
          ].map((stage, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-28">{stage.label}</span>
              <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                <div className={`h-full ${stage.color} rounded-lg flex items-center pl-3 transition-all`}
                  style={{ width: `${Math.max(stage.pct, 5)}%` }}>
                  <span className="text-xs font-medium text-white">{stage.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-3">Métricas de Negócio</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">CAC (Custo de Aquisição)</span><span className="font-medium text-foreground">—</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">LTV (Valor do Cliente)</span><span className="font-medium text-foreground">—</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Taxa de Retenção</span><span className="font-medium text-foreground">{100 - (metrics.totalLeads ? Math.round((metrics.lostLeads / metrics.totalLeads) * 100) : 0)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">LTV/CAC Ratio</span><span className="font-medium text-foreground">—</span></div>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-3">Programa de Indicação</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Convites</span><span className="font-medium text-foreground">{metrics.totalReferrals}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Convertidos</span><span className="font-medium text-foreground">{metrics.referralConversions}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Taxa Conversão</span><span className="font-medium text-foreground">{metrics.totalReferrals ? Math.round((metrics.referralConversions / metrics.totalReferrals) * 100) : 0}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Recompensas Dadas</span><span className="font-medium text-foreground">—</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GrowthDashboardPage;
