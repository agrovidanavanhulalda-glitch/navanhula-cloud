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
  Wifi, WifiOff, BarChart3, Package, RefreshCw,
  Receipt, Landmark, Building2
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

interface DashboardStats {
  total_stores: number;
  total_sales_today: number;
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;
  profit_month: number;
  total_products: number;
  low_stock_count: number;
  stores_online: number;
  active_registers: number;
}

interface StoreData {
  store_id: string;
  store_name: string;
  city: string | null;
  is_active: boolean;
  last_online_at: string | null;
  total_sales: number;
  total_revenue: number;
  total_profit: number;
  cash_revenue: number;
  mpesa_revenue: number;
  emola_revenue: number;
  card_revenue: number;
}

interface TopProduct {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  total_profit: number;
}

const FISCAL_RATE = 0.16;

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

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border p-3 shadow-xl" style={{ background: 'hsl(var(--card))' }}>
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs text-muted-foreground">
          {p.name}: <span className="font-bold text-foreground">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

const CEODashboardPage: React.FC = () => {
  const { role, company } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [storeData, setStoreData] = useState<StoreData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month');
  const [loading, setLoading] = useState(true);

  const isCEO = (role as string) === 'ceo' || role === 'admin';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, storesRes, productsRes] = await Promise.all([
        supabase.rpc('get_ceo_dashboard_stats'),
        supabase.rpc('get_sales_by_store', { p_period: period }),
        supabase.rpc('get_top_products_national', { p_limit: 10 }),
      ]);

      if (statsRes.data && !(statsRes.data as any).error) setStats(statsRes.data as unknown as DashboardStats);
      if (storesRes.data) setStoreData(storesRes.data as unknown as StoreData[]);
      if (productsRes.data) setTopProducts(productsRes.data as unknown as TopProduct[]);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: atualiza ao registrar vendas
  useEffect(() => {
    const channel = supabase
      .channel('executive-dashboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  if (!isCEO) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center p-8">
          <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Painel exclusivo para a direcção executiva.</p>
        </Card>
      </div>
    );
  }

  const totalRevenue = stats?.revenue_month ?? 0;
  const totalProfit = stats?.profit_month ?? 0;
  const estimatedTax = totalRevenue * FISCAL_RATE;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  // Skeleton
  if (loading && !stats) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        <div className="h-8 w-64 rounded bg-muted/50 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1,2,3,4].map(i => <SkeletonKPI key={i} />)}
        </div>
        <SkeletonChart />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonList rows={4} />
          <SkeletonList rows={4} />
        </div>
      </div>
    );
  }

  const periodLabel = period === 'today' ? 'Hoje' : period === 'week' ? 'Esta Semana' : 'Este Mês';

  return (
    <div className="p-4 md:p-6 space-y-8 animate-fade-in">
      {/* Header Executivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Painel Executivo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {company?.name || 'NAVANHULA'} — Consolidado Nacional
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={period} onValueChange={v => setPeriod(v as any)}>
            <TabsList>
              <TabsTrigger value="today">Hoje</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mês</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* 4 KPIs Executivos Grandes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <ExecutiveKPI
          icon={DollarSign}
          label="Receita Total"
          value={formatCurrency(totalRevenue)}
          sub={`${stats?.total_sales_today ?? 0} vendas realizadas hoje`}
          accent="blue"
        />
        <ExecutiveKPI
          icon={TrendingUp}
          label="Lucro Consolidado"
          value={formatCurrency(totalProfit)}
          sub={`Margem de ${profitMargin}% sobre receita`}
          accent="emerald"
        />
        <ExecutiveKPI
          icon={Landmark}
          label="Impostos Estimados"
          value={formatCurrency(estimatedTax)}
          sub="IVA 16% sobre a receita bruta"
          accent="amber"
        />
        <ExecutiveKPI
          icon={Building2}
          label="Unidades Activas"
          value={stats?.total_stores ?? 0}
          sub={<><span className="inline-block w-1.5 h-1.5 rounded-full bg-success mr-1 animate-pulse" />{stats?.stores_online ?? 0} operando agora</>}
          accent="green"
        />
      </div>

      {/* Alerta de estoque */}
      {(stats?.low_stock_count ?? 0) > 0 && (
        <Card className="p-3 border-warning/40 bg-warning/5">
          <div className="flex items-center gap-2 text-sm text-warning font-medium">
            <AlertTriangle className="w-4 h-4" />
            {stats?.low_stock_count} produtos necessitam reposição
          </div>
        </Card>
      )}

      {/* Gráfico: Receita e Lucro por Loja */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Desempenho por Unidade — {periodLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {storeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={storeData} barGap={4} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 22%)" vertical={false} />
                <XAxis
                  dataKey="store_name"
                  tick={{ fontSize: 11, fill: 'hsl(215, 20%, 65%)' }}
                  axisLine={{ stroke: 'hsl(217, 33%, 25%)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(215, 20%, 65%)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-muted-foreground ml-1">{value}</span>}
                />
                <Bar dataKey="total_revenue" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} name="Receita" />
                <Bar dataKey="total_profit" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Lucro" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart3} title="Sem movimentação" description="Nenhuma venda registrada neste período." />
          )}
        </CardContent>
      </Card>

      {/* Detalhamento: Unidades + Produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumo por Unidade */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              Resumo por Unidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {storeData.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {storeData.map(store => {
                  const isOnline = store.last_online_at && new Date(store.last_online_at).getTime() > Date.now() - 10 * 60 * 1000;
                  const margin = Number(store.total_revenue) > 0
                    ? ((Number(store.total_profit) / Number(store.total_revenue)) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <div key={store.store_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors duration-150">
                      <div className="flex items-center gap-3 min-w-0">
                        {isOnline
                          ? <Wifi className="w-4 h-4 text-success flex-shrink-0" />
                          : <WifiOff className="w-4 h-4 text-destructive flex-shrink-0" />
                        }
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{store.store_name}</p>
                          <p className="text-xs text-muted-foreground">{store.city || '—'} · {store.total_sales} vendas</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="font-bold text-sm font-mono">{formatCurrency(store.total_revenue)}</p>
                        <p className="text-xs text-profit font-medium">
                          {formatCurrency(Number(store.total_profit))} · {margin}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={Store} title="Sem unidades" description="Nenhuma unidade registrada." />
            )}
          </CardContent>
        </Card>

        {/* Produtos mais vendidos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Produtos com Maior Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {topProducts.map((product, i) => {
                  const margin = product.total_revenue > 0
                    ? ((product.total_profit / product.total_revenue) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors duration-150">
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant="secondary" className="w-6 h-6 rounded-full flex items-center justify-center p-0 text-xs font-bold flex-shrink-0">{i + 1}</Badge>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{product.product_name}</p>
                          <p className="text-xs text-muted-foreground">{product.total_quantity} unidades vendidas</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="font-bold text-sm font-mono">{formatCurrency(product.total_revenue)}</p>
                        <p className="text-xs text-profit font-medium">
                          +{formatCurrency(product.total_profit ?? 0)} · {margin}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={Package} title="Sem movimentação" description="Nenhum produto vendido neste período." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CEODashboardPage;
