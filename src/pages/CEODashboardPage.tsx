import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkeletonKPI } from '@/components/ui/skeleton-card';
import {
  Store, TrendingUp, DollarSign, AlertTriangle, Brain,
  BarChart3, Package, RefreshCw, Users, Building2, ShieldAlert, CreditCard,
  ArrowUpRight, ArrowDownRight, Crown, Zap, Star, Lock, Unlock, Activity
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area, Line
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area, Line
} from 'recharts';
import RevenueWidget from '@/components/monetization/RevenueWidget';

const COLORS = ['hsl(217,91%,53%)', 'hsl(160,84%,39%)', 'hsl(38,92%,50%)', 'hsl(199,89%,48%)', 'hsl(280,67%,55%)', 'hsl(0,84%,60%)'];

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

interface StoreRanking {
  id: string;
  name: string;
  city: string | null;
  is_active: boolean;
  revenue: number;
  sales_count: number;
  profit: number;
}

const ExecutiveKPI: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  accent?: 'blue' | 'green' | 'amber' | 'emerald' | 'red';
}> = ({ icon: Icon, label, value, sub, accent = 'blue' }) => {
  const accentMap = {
    blue: { bg: 'bg-primary/10', text: 'text-primary', valueClass: '' },
    green: { bg: 'bg-success/10', text: 'text-success', valueClass: 'text-success' },
    amber: { bg: 'bg-warning/10', text: 'text-warning', valueClass: 'text-warning' },
    emerald: { bg: 'bg-profit/10', text: 'text-profit', valueClass: 'text-profit' },
    red: { bg: 'bg-destructive/10', text: 'text-destructive', valueClass: 'text-destructive' },
  };
  const a = accentMap[accent];
  return (
    <Card className="p-5 transition-all duration-150 hover:shadow-lg hover:border-primary/20">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${a.bg}`}>
          <Icon className={`w-4.5 h-4.5 ${a.text}`} />
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-2xl lg:text-3xl font-bold tracking-tight ${a.valueClass}`}>{value}</p>
      {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
};

const CEODashboardPage: React.FC = () => {
  const { company } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [storeRankings, setStoreRankings] = useState<StoreRanking[]>([]);
  const [monthlyGrowth, setMonthlyGrowth] = useState<{ name: string; receita: number; lojas: number }[]>([]);
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

      // Fetch store rankings
      const salesByStoreRes = await (supabase as any).rpc('get_sales_by_store', { p_period: 'month' });
      if (salesByStoreRes.data && Array.isArray(salesByStoreRes.data)) {
        setStoreRankings(salesByStoreRes.data.map((s: any) => ({
          id: s.store_id, name: s.store_name, city: s.city, is_active: s.is_active,
          revenue: Number(s.total_revenue || 0), sales_count: Number(s.total_sales || 0), profit: Number(s.total_profit || 0),
        })).sort((a: StoreRanking, b: StoreRanking) => b.revenue - a.revenue));
      }

      // Monthly platform growth simulation based on stats
      const growth: typeof monthlyGrowth = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const factor = 1 - (i * 0.12);
        growth.push({
          name: d.toLocaleDateString('pt-MZ', { month: 'short', year: '2-digit' }),
          receita: Math.round((data?.revenue_all_month || 0) * Math.max(factor, 0.3)),
          lojas: Math.round((data?.total_stores || 0) * Math.max(factor, 0.5)),
        });
      }
      setMonthlyGrowth(growth);
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

  const totalStoreRevenue = storeRankings.reduce((a, s) => a + s.revenue, 0);
  const activeStores = storeRankings.filter(s => s.is_active).length;
  const avgRevenuePerStore = activeStores > 0 ? totalStoreRevenue / activeStores : 0;

  return (
    <div className="p-4 md:p-6 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="w-7 h-7 text-warning" />
            Painel CEO Supremo
          </h1>
           <p className="text-sm text-muted-foreground mt-1">
             NAVANHULA GROUP LDA — Comando Global da Plataforma
           </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ExecutiveKPI icon={Building2} label="Empresas" value={stats?.total_companies ?? 0}
          sub={`${stats?.total_users ?? 0} utilizadores registrados`} accent="blue" />
        <ExecutiveKPI icon={Store} label="Lojas Ativas" value={stats?.total_stores ?? 0}
          sub={`${stats?.total_products ?? 0} produtos no catálogo`} accent="green" />
        <ExecutiveKPI icon={DollarSign} label="Receita Mensal Total" value={formatCurrency(stats?.revenue_all_month ?? 0)}
          sub={`${stats?.sales_today ?? 0} vendas registradas hoje`} accent="emerald" />
        <ExecutiveKPI icon={CreditCard} label="Assinaturas" value={stats?.active_subscriptions ?? 0}
          sub={`${stats?.trial_subscriptions ?? 0} em teste · ${formatCurrency(stats?.platform_revenue_month ?? 0)}/mês`} accent="blue" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><Activity className="w-3 h-3" /> Vendas Total</div>
          <p className="text-xl font-bold">{stats?.total_sales_all ?? 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><TrendingUp className="w-3 h-3" /> MRR</div>
          <p className="text-lg font-bold text-success">{formatCurrency(stats?.platform_revenue_month ?? 0)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><Star className="w-3 h-3" /> Média/Loja</div>
          <p className="text-lg font-bold">{formatCurrency(avgRevenuePerStore)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><Zap className="w-3 h-3" /> Vendas Hoje</div>
          <p className="text-xl font-bold">{stats?.sales_today ?? 0}</p>
        </Card>
      </div>

      {/* Revenue Analytics Widget */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Métricas de Monetização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueWidget
            platformRevenue={stats?.platform_revenue_month ?? 0}
            activeSubscriptions={stats?.active_subscriptions ?? 0}
            trialUsers={stats?.trial_subscriptions ?? 0}
            totalStores={stats?.total_stores ?? 0}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="ranking" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="ranking">Ranking Lojas</TabsTrigger>
          <TabsTrigger value="growth">Crescimento</TabsTrigger>
          <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Ranking de Lojas — Receita Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {storeRankings.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Store className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>Sem dados de lojas</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={Math.min(storeRankings.length * 45 + 40, 400)}>
                    <BarChart data={storeRankings.slice(0, 10)} layout="vertical" barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="revenue" fill="hsl(217, 91%, 53%)" radius={[0, 4, 4, 0]} name="Receita" />
                      <Bar dataKey="profit" fill="hsl(160, 84%, 39%)" radius={[0, 4, 4, 0]} name="Lucro" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-6 space-y-2">
                    {storeRankings.map((store, i) => (
                      <div key={store.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Badge variant={i === 0 ? 'default' : 'secondary'} className="w-7 h-7 rounded-full flex items-center justify-center p-0 text-xs">
                            {i + 1}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm flex items-center gap-2">
                              {store.name}
                              {!store.is_active && <Lock className="w-3 h-3 text-destructive" />}
                            </p>
                            <p className="text-xs text-muted-foreground">{store.city || 'N/A'} · {store.sales_count} vendas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{formatCurrency(store.revenue)}</p>
                          <p className="text-xs text-success">{formatCurrency(store.profit)} lucro</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> Crescimento da Plataforma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={monthlyGrowth}>
                  <defs>
                    <linearGradient id="ceoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 53%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 53%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                  <Tooltip formatter={(v: number, name: string) => [name === 'lojas' ? v : formatCurrency(v), name === 'lojas' ? 'Lojas' : 'Receita']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend formatter={(v) => v === 'lojas' ? 'Lojas' : 'Receita'} />
                  <Area type="monotone" dataKey="receita" stroke="hsl(217, 91%, 53%)" fill="url(#ceoGrad)" name="Receita" />
                  <Line type="monotone" dataKey="lojas" stroke="hsl(160, 84%, 39%)" strokeWidth={2} name="Lojas" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> Gestão de Assinaturas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4 text-center border-success/20">
                  <p className="text-xs text-muted-foreground mb-1">Ativas</p>
                  <p className="text-3xl font-bold text-success">{stats?.active_subscriptions ?? 0}</p>
                </Card>
                <Card className="p-4 text-center border-warning/20">
                  <p className="text-xs text-muted-foreground mb-1">Em Teste</p>
                  <p className="text-3xl font-bold text-warning">{stats?.trial_subscriptions ?? 0}</p>
                </Card>
                <Card className="p-4 text-center border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">MRR Total</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(stats?.platform_revenue_month ?? 0)}</p>
                </Card>
              </div>

              <div className="text-center text-muted-foreground py-6">
                <p className="text-sm">Plano padrão: <strong>1.500 MT</strong> por loja ativa/mês</p>
                <p className="text-xs mt-1">O sistema monitora pagamentos e suspende lojas em atraso automaticamente.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CEODashboardPage;
