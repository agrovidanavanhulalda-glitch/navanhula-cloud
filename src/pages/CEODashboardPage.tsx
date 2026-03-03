import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Store, TrendingUp, DollarSign, Users, AlertTriangle,
  Wifi, WifiOff, BarChart3, Package, ShoppingCart, RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
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
  'hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)',
  'hsl(199, 89%, 48%)', 'hsl(0, 84%, 60%)', 'hsl(160, 84%, 39%)',
];

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
      console.error('CEO Dashboard error:', e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime subscription on sales
  useEffect(() => {
    const channel = supabase
      .channel('ceo-sales-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchData();
      })
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

  const paymentPieData = storeData.length > 0 ? [
    { name: 'Dinheiro', value: storeData.reduce((s, d) => s + Number(d.cash_revenue), 0) },
    { name: 'M-Pesa', value: storeData.reduce((s, d) => s + Number(d.mpesa_revenue), 0) },
    { name: 'E-mola', value: storeData.reduce((s, d) => s + Number(d.emola_revenue), 0) },
    { name: 'Cartão', value: storeData.reduce((s, d) => s + Number(d.card_revenue), 0) },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Painel CEO</h1>
          <p className="text-muted-foreground">{company?.name || 'NAVANHULA'} — Visão Nacional</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { icon: Store, label: 'Lojas Ativas', value: stats?.total_stores ?? 0, sub: <><Wifi className="w-3 h-3 text-success" /> <span className="text-success">{stats?.stores_online ?? 0} online</span></> },
          { icon: ShoppingCart, label: 'Vendas Hoje', value: stats?.total_sales_today ?? 0, sub: `${stats?.active_registers ?? 0} caixas abertos` },
          { icon: DollarSign, label: 'Receita Hoje', value: formatCurrency(stats?.revenue_today ?? 0), highlight: true },
          { icon: TrendingUp, label: 'Receita Mês', value: formatCurrency(stats?.revenue_month ?? 0), sub: <span className="text-success">Lucro: {formatCurrency(stats?.profit_month ?? 0)}</span> },
          { icon: Package, label: 'Estoque Baixo', value: stats?.low_stock_count ?? 0, warn: (stats?.low_stock_count ?? 0) > 0, sub: `${stats?.total_products ?? 0} produtos total` },
        ].map((kpi, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><kpi.icon className="w-4 h-4" /> {kpi.label}</div>
            <p className={`text-2xl font-bold mt-1 ${kpi.highlight ? 'text-primary' : ''} ${kpi.warn ? 'text-warning' : ''}`}>{kpi.value}</p>
            {kpi.sub && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">{kpi.sub}</p>}
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={period} onValueChange={v => setPeriod(v as any)}>
        <TabsList>
          <TabsTrigger value="today">Hoje</TabsTrigger>
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="month">Mês</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Receita por Loja</CardTitle></CardHeader>
              <CardContent>
                {storeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                     <BarChart data={storeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 25%)" />
                      <XAxis dataKey="store_name" tick={{ fontSize: 12, fill: 'hsl(215, 20%, 65%)' }} />
                      <YAxis tick={{ fontSize: 12, fill: 'hsl(215, 20%, 65%)' }} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)} 
                        contentStyle={{ backgroundColor: 'hsl(222, 47%, 14%)', border: '1px solid hsl(217, 33%, 25%)', borderRadius: '8px', color: 'hsl(210, 40%, 98%)' }}
                        labelStyle={{ color: 'hsl(210, 40%, 98%)' }}
                      />
                      <Bar dataKey="total_revenue" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} name="Receita" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">Sem dados de vendas para o período</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Métodos de Pagamento</CardTitle></CardHeader>
              <CardContent>
                {paymentPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                     <PieChart>
                      <Pie data={paymentPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: 'hsl(215, 20%, 65%)' }}>
                        {paymentPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)} 
                        contentStyle={{ backgroundColor: 'hsl(222, 47%, 14%)', border: '1px solid hsl(217, 33%, 25%)', borderRadius: '8px', color: 'hsl(210, 40%, 98%)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Store className="w-5 h-5" /> Status das Lojas</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[350px] overflow-auto">
                  {storeData.map(store => {
                    const isOnline = store.last_online_at && new Date(store.last_online_at).getTime() > Date.now() - 10 * 60 * 1000;
                    return (
                      <div key={store.store_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          {isOnline ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-destructive" />}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{store.store_name}</p>
                            <p className="text-xs text-muted-foreground">{store.city || 'Sem cidade'}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-sm">{formatCurrency(store.total_revenue)}</p>
                          <p className="text-xs text-muted-foreground">{store.total_sales} vendas</p>
                        </div>
                      </div>
                    );
                  })}
                  {storeData.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma loja encontrada</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Package className="w-5 h-5" /> Produtos Mais Vendidos (Mês)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[350px] overflow-auto">
                  {topProducts.map((product, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="w-7 h-7 rounded-full flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                        <div>
                          <p className="font-medium text-sm">{product.product_name}</p>
                          <p className="text-xs text-muted-foreground">{product.total_quantity} unidades</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatCurrency(product.total_revenue)}</p>
                        <p className="text-xs text-profit">Lucro: {formatCurrency(product.total_profit ?? 0)}</p>
                      </div>
                    </div>
                  ))}
                  {topProducts.length === 0 && <p className="text-center text-muted-foreground py-8">Sem dados de vendas</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CEODashboardPage;
