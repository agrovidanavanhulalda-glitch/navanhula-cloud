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
  Store, TrendingUp, DollarSign, Users, AlertTriangle,
  Wifi, WifiOff, BarChart3, Package, ShoppingCart, RefreshCw,
  Receipt, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
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

const CHART_COLORS = [
  'hsl(217, 91%, 60%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)',
  'hsl(199, 89%, 48%)', 'hsl(0, 84%, 60%)', 'hsl(160, 84%, 39%)',
];

const FISCAL_RATE = 0.17; // 17% IVA Mozambique

const CEOKPICard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  highlight?: 'primary' | 'success' | 'warning' | 'profit';
  trend?: { value: string; up: boolean };
}> = ({ icon: Icon, label, value, sub, highlight, trend }) => (
  <Card className="p-5 transition-all duration-150 hover:border-primary/30 hover:shadow-lg group">
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
        highlight === 'success' ? 'bg-success/10' :
        highlight === 'warning' ? 'bg-warning/10' :
        highlight === 'profit' ? 'bg-profit/10' :
        'bg-primary/10'
      }`}>
        <Icon className={`w-4 h-4 ${
          highlight === 'success' ? 'text-success' :
          highlight === 'warning' ? 'text-warning' :
          highlight === 'profit' ? 'text-profit' :
          'text-primary'
        }`} />
      </div>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-2xl lg:text-3xl font-bold tracking-tight ${
      highlight === 'warning' ? 'text-warning' :
      highlight === 'profit' ? 'text-profit' :
      highlight === 'success' ? 'text-success' : ''
    }`}>{value}</p>
    {(sub || trend) && (
      <div className="mt-2 flex items-center gap-2 text-xs">
        {trend && (
          <span className={`flex items-center gap-0.5 font-medium ${trend.up ? 'text-success' : 'text-destructive'}`}>
            {trend.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}
          </span>
        )}
        {sub && <span className="text-muted-foreground">{sub}</span>}
      </div>
    )}
  </Card>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border p-3 shadow-lg" style={{ background: 'hsl(222, 47%, 14%)' }}>
      <p className="text-xs font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs text-muted-foreground">
          {p.name}: <span className="font-semibold text-foreground">{formatCurrency(p.value)}</span>
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
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
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

  useEffect(() => {
    const channel = supabase
      .channel('ceo-sales-realtime')
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
          <p className="text-muted-foreground">Este painel é exclusivo para CEO e Administradores.</p>
        </Card>
      </div>
    );
  }

  const consolidatedRevenue = stats?.revenue_month ?? 0;
  const consolidatedProfit = stats?.profit_month ?? 0;
  const estimatedTax = consolidatedRevenue * FISCAL_RATE;

  const paymentPieData = storeData.length > 0 ? [
    { name: 'Dinheiro', value: storeData.reduce((s, d) => s + Number(d.cash_revenue), 0) },
    { name: 'M-Pesa', value: storeData.reduce((s, d) => s + Number(d.mpesa_revenue), 0) },
    { name: 'E-mola', value: storeData.reduce((s, d) => s + Number(d.emola_revenue), 0) },
    { name: 'Cartão', value: storeData.reduce((s, d) => s + Number(d.card_revenue), 0) },
  ].filter(d => d.value > 0) : [];

  // Skeleton loading
  if (loading && !stats) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        <div className="h-8 w-48 rounded bg-muted/50 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map(i => <SkeletonKPI key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><SkeletonChart /></div>
          <SkeletonChart height={250} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonList rows={4} />
          <SkeletonList rows={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Painel Executivo</h1>
          <p className="text-sm text-muted-foreground">{company?.name || 'NAVANHULA'} — Visão Nacional</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* KPI Grid - Large Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <CEOKPICard
          icon={Store}
          label="Lojas"
          value={stats?.total_stores ?? 0}
          highlight="primary"
          sub={<><span className="inline-block w-1.5 h-1.5 rounded-full bg-success mr-1 animate-pulse" />{stats?.stores_online ?? 0} online</>}
        />
        <CEOKPICard
          icon={ShoppingCart}
          label="Vendas Hoje"
          value={stats?.total_sales_today ?? 0}
          sub={`${stats?.active_registers ?? 0} caixas`}
        />
        <CEOKPICard
          icon={DollarSign}
          label="Receita Hoje"
          value={formatCurrency(stats?.revenue_today ?? 0)}
          highlight="primary"
        />
        <CEOKPICard
          icon={TrendingUp}
          label="Receita Mensal"
          value={formatCurrency(consolidatedRevenue)}
          highlight="success"
        />
        <CEOKPICard
          icon={TrendingUp}
          label="Lucro Mensal"
          value={formatCurrency(consolidatedProfit)}
          highlight="profit"
        />
        <CEOKPICard
          icon={Receipt}
          label="IVA Estimado"
          value={formatCurrency(estimatedTax)}
          highlight="warning"
          sub="17% s/ receita"
        />
      </div>

      {/* Low stock alert */}
      {(stats?.low_stock_count ?? 0) > 0 && (
        <Card className="p-3 border-warning/40 bg-warning/5">
          <div className="flex items-center gap-2 text-sm text-warning font-medium">
            <AlertTriangle className="w-4 h-4" />
            {stats?.low_stock_count} produtos com estoque baixo de {stats?.total_products ?? 0} total
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={period} onValueChange={v => setPeriod(v as any)}>
        <TabsList className="grid w-full max-w-xs grid-cols-3">
          <TabsTrigger value="today">Hoje</TabsTrigger>
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="month">Mês</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-6 mt-4">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Receita por Loja
                </CardTitle>
              </CardHeader>
              <CardContent>
                {storeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={storeData} barSize={32}>
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
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total_revenue" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} name="Receita" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={BarChart3} title="Sem dados" description="Nenhuma venda registrada para este período." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Métodos de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie 
                        data={paymentPieData} 
                        cx="50%" cy="45%" 
                        innerRadius={50} outerRadius={80}
                        dataKey="value" 
                        strokeWidth={2}
                        stroke="hsl(222, 47%, 11%)"
                      >
                        {paymentPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Legend 
                        verticalAlign="bottom" 
                        formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                      />
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={DollarSign} title="Sem dados" description="Nenhum pagamento registrado." />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Store Status + Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary" />
                  Status das Lojas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {storeData.length > 0 ? (
                  <div className="space-y-2 max-h-[360px] overflow-auto">
                    {storeData.map(store => {
                      const isOnline = store.last_online_at && new Date(store.last_online_at).getTime() > Date.now() - 10 * 60 * 1000;
                      return (
                        <div key={store.store_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors duration-150">
                          <div className="flex items-center gap-3 min-w-0">
                            {isOnline 
                              ? <Wifi className="w-4 h-4 text-success flex-shrink-0" /> 
                              : <WifiOff className="w-4 h-4 text-destructive flex-shrink-0" />
                            }
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{store.store_name}</p>
                              <p className="text-xs text-muted-foreground">{store.city || '—'}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <p className="font-bold text-sm font-mono">{formatCurrency(store.total_revenue)}</p>
                            <p className="text-xs text-muted-foreground">{store.total_sales} vendas</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState icon={Store} title="Sem lojas" description="Nenhuma loja encontrada." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Top Produtos (Mês)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topProducts.length > 0 ? (
                  <div className="space-y-2 max-h-[360px] overflow-auto">
                    {topProducts.map((product, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors duration-150">
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant="secondary" className="w-6 h-6 rounded-full flex items-center justify-center p-0 text-xs font-bold flex-shrink-0">{i + 1}</Badge>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{product.product_name}</p>
                            <p className="text-xs text-muted-foreground">{product.total_quantity} unidades</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="font-bold text-sm font-mono">{formatCurrency(product.total_revenue)}</p>
                          <p className="text-xs text-profit font-medium">+{formatCurrency(product.total_profit ?? 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Package} title="Sem dados" description="Nenhum produto vendido neste período." />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CEODashboardPage;
