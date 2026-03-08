import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonKPI, SkeletonChart, SkeletonList } from '@/components/ui/skeleton-card';
import {
  Store, TrendingUp, DollarSign, AlertTriangle,
  BarChart3, Package, RefreshCw, Users, Building2, ShieldAlert, CreditCard
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

interface PlatformStats {
  total_companies: number;
  total_stores: number;
  total_users: number;
  total_sales_all: number;
  revenue_all_month: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  platform_revenue_month: number;
  total_products: number;
  sales_today: number;
}

const ExecutiveKPI: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  accent?: 'blue' | 'green' | 'amber' | 'emerald';
}> = ({ icon: Icon, label, value, sub, accent = 'blue' }) => {
  const accentMap = {
    blue: { bg: 'bg-primary/10', text: 'text-primary', valueClass: '' },
    green: { bg: 'bg-success/10', text: 'text-success', valueClass: 'text-success' },
    amber: { bg: 'bg-warning/10', text: 'text-warning', valueClass: 'text-warning' },
    emerald: { bg: 'bg-profit/10', text: 'text-profit', valueClass: 'text-profit' },
  };
  const a = accentMap[accent];
  return (
    <Card className="p-6 transition-all duration-150 hover:shadow-lg hover:border-primary/20">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.bg}`}>
          <Icon className={`w-5 h-5 ${a.text}`} />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-3xl lg:text-4xl font-bold tracking-tight ${a.valueClass}`}>{value}</p>
      {sub && <p className="mt-2 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
};

const CEODashboardPage: React.FC = () => {
  const { company } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_platform_stats');
      if (error) throw error;
      if (data?.error === 'unauthorized') {
        setUnauthorized(true);
        return;
      }
      setStats(data as PlatformStats);
    } catch {
      setUnauthorized(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (unauthorized) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center p-8">
          <ShieldAlert className="w-12 h-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Este painel é exclusivo para a administração da plataforma NAVANHULA GROUP LDA.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Empresas clientes devem utilizar o Dashboard principal para visualizar os seus dados.
          </p>
        </Card>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        <div className="h-8 w-64 rounded bg-muted/50 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3,4,5,6].map(i => <SkeletonKPI key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Painel da Plataforma</h1>
          <p className="text-sm text-muted-foreground mt-1">
            NAVANHULA GROUP LDA — Visão global do ERP SaaS
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <ExecutiveKPI
          icon={Building2}
          label="Empresas Cadastradas"
          value={stats?.total_companies ?? 0}
          sub={`${stats?.total_users ?? 0} utilizadores registrados`}
          accent="blue"
        />
        <ExecutiveKPI
          icon={Store}
          label="Total de Lojas"
          value={stats?.total_stores ?? 0}
          sub={`${stats?.total_products ?? 0} produtos no sistema`}
          accent="green"
        />
        <ExecutiveKPI
          icon={DollarSign}
          label="Vendas Totais (Mês)"
          value={formatCurrency(stats?.revenue_all_month ?? 0)}
          sub={`${stats?.sales_today ?? 0} vendas registradas hoje`}
          accent="emerald"
        />
        <ExecutiveKPI
          icon={CreditCard}
          label="Assinaturas Ativas"
          value={stats?.active_subscriptions ?? 0}
          sub={`${stats?.trial_subscriptions ?? 0} em período de teste`}
          accent="blue"
        />
        <ExecutiveKPI
          icon={TrendingUp}
          label="Receita Mensal SaaS"
          value={formatCurrency(stats?.platform_revenue_month ?? 0)}
          sub="Receita recorrente das assinaturas"
          accent="emerald"
        />
        <ExecutiveKPI
          icon={BarChart3}
          label="Vendas no Sistema"
          value={stats?.total_sales_all ?? 0}
          sub="Total de transações completadas"
          accent="amber"
        />
      </div>

      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-primary/40" />
          <p className="font-medium">Gráficos detalhados em desenvolvimento</p>
          <p className="text-sm mt-1">Análises de crescimento, churn e MRR estarão disponíveis em breve.</p>
        </div>
      </Card>
    </div>
  );
};

export default CEODashboardPage;
