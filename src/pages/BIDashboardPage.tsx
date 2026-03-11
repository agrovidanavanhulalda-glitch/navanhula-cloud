import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3, Users, Clock, TrendingUp, Award, RefreshCw, Percent,
  Package, Target, ArrowUpRight, ArrowDownRight, ShoppingCart, Zap
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['hsl(217,91%,53%)', 'hsl(160,84%,39%)', 'hsl(38,92%,50%)', 'hsl(199,89%,48%)', 'hsl(280,67%,55%)', 'hsl(0,84%,60%)'];

interface SellerPerformance {
  user_id: string; full_name: string; total_sales: number; total_revenue: number;
  total_profit: number; commission_rate: number; commission_earned: number;
}

interface ProductMargin {
  name: string; cost_price: number; sale_price: number; margin_percent: number;
  total_sold: number; total_profit: number;
}

const BIDashboardPage: React.FC = () => {
  const { role } = useAuth();
  const [sellers, setSellers] = useState<SellerPerformance[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: number; count: number; revenue: number }[]>([]);
  const [marginData, setMarginData] = useState<ProductMargin[]>([]);
  const [monthlyGrowth, setMonthlyGrowth] = useState<{ name: string; receita: number; vendas: number }[]>([]);
  const [topCustomers, setTopCustomers] = useState<{ name: string; spent: number; purchases: number; level: string }[]>([]);
  const [forecast, setForecast] = useState<{ name: string; real: number; previsao: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = role === 'admin' || role === 'ceo' || role === 'manager';

  const loadData = async () => {
    setLoading(true);
    try {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [salesRes, profilesRes, itemsRes, productsRes, customersRes] = await Promise.all([
        supabase.from('sales').select('user_id, total, created_at, customer_name, profit, cost_total').eq('status', 'completed'),
        supabase.from('profiles').select('id, full_name, commission_rate'),
        supabase.from('sale_items').select('sale_id, product_id, quantity, profit, created_at'),
        supabase.from('products').select('id, name, cost_price, sale_price').eq('is_active', true),
        supabase.from('customers').select('full_name, total_spent, total_purchases, vip_level').order('total_spent', { ascending: false }).limit(10),
      ]);

      const salesData = salesRes.data || [];
      const profilesData = profilesRes.data || [];
      const itemsData = itemsRes.data || [];
      const products = productsRes.data || [];

      // Seller performance
      const sellerMap: Record<string, SellerPerformance> = {};
      const monthSales = salesData.filter(s => s.created_at >= monthStart);
      monthSales.forEach(s => {
        if (!sellerMap[s.user_id]) {
          const p = profilesData.find(p => p.id === s.user_id);
          sellerMap[s.user_id] = { user_id: s.user_id, full_name: p?.full_name || 'Desconhecido', total_sales: 0, total_revenue: 0, total_profit: 0, commission_rate: Number(p?.commission_rate || 0), commission_earned: 0 };
        }
        sellerMap[s.user_id].total_sales++;
        sellerMap[s.user_id].total_revenue += Number(s.total);
        sellerMap[s.user_id].total_profit += Number(s.profit || 0);
      });
      const sellersList = Object.values(sellerMap).map(s => ({ ...s, commission_earned: s.total_revenue * (s.commission_rate / 100) }));
      sellersList.sort((a, b) => b.total_revenue - a.total_revenue);
      setSellers(sellersList);

      // Hourly distribution
      const hourMap: Record<number, { count: number; revenue: number }> = {};
      for (let i = 0; i < 24; i++) hourMap[i] = { count: 0, revenue: 0 };
      monthSales.forEach(s => { const h = new Date(s.created_at).getHours(); hourMap[h].count++; hourMap[h].revenue += Number(s.total); });
      setHourlyData(Object.entries(hourMap).map(([h, v]) => ({ hour: Number(h), ...v })));

      // Product margins
      const monthItems = itemsData.filter(i => i.created_at && i.created_at >= monthStart);
      const productSold: Record<string, { qty: number; profit: number }> = {};
      monthItems.forEach(i => {
        if (!productSold[i.product_id]) productSold[i.product_id] = { qty: 0, profit: 0 };
        productSold[i.product_id].qty += i.quantity;
        productSold[i.product_id].profit += Number(i.profit || 0);
      });
      const margins = products.map(p => ({
        name: p.name, cost_price: Number(p.cost_price), sale_price: Number(p.sale_price),
        margin_percent: p.sale_price > 0 ? ((p.sale_price - p.cost_price) / p.sale_price) * 100 : 0,
        total_sold: productSold[p.id]?.qty || 0, total_profit: productSold[p.id]?.profit || 0,
      })).sort((a, b) => b.total_profit - a.total_profit).slice(0, 20);
      setMarginData(margins);

      // Monthly growth (last 6 months)
      const growth: typeof monthlyGrowth = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const ms = new Date(d.getFullYear(), d.getMonth(), 1);
        const me = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const mSales = salesData.filter(s => new Date(s.created_at) >= ms && new Date(s.created_at) <= me);
        growth.push({ name: d.toLocaleDateString('pt-MZ', { month: 'short', year: '2-digit' }), receita: mSales.reduce((a, s) => a + Number(s.total), 0), vendas: mSales.length });
      }
      setMonthlyGrowth(growth);

      // Sales forecast (next 3 months based on trend)
      const forecastData: typeof forecast = growth.map(g => ({ name: g.name, real: g.receita, previsao: 0 }));
      if (growth.length >= 3) {
        const lastThree = growth.slice(-3);
        const avgGrowthRate = lastThree.length > 1 ? lastThree.reduce((a, g, i) => i > 0 && lastThree[i - 1].receita > 0 ? a + (g.receita - lastThree[i - 1].receita) / lastThree[i - 1].receita : a, 0) / (lastThree.length - 1) : 0.05;
        let lastRev = growth[growth.length - 1].receita;
        for (let i = 1; i <= 3; i++) {
          const d = new Date(); d.setMonth(d.getMonth() + i);
          lastRev = lastRev * (1 + Math.max(avgGrowthRate, 0.02));
          forecastData.push({ name: d.toLocaleDateString('pt-MZ', { month: 'short', year: '2-digit' }), real: 0, previsao: Math.round(lastRev) });
        }
      }
      setForecast(forecastData);

      // Top customers
      setTopCustomers((customersRes.data || []).map(c => ({
        name: c.full_name, spent: Number(c.total_spent || 0), purchases: Number(c.total_purchases || 0), level: c.vip_level || 'regular',
      })));
    } catch (e) {
      console.error('BI load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (!isAdmin) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center p-8">
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Este painel é exclusivo para gestores.</p>
        </Card>
      </div>
    );
  }

  const peakHour = hourlyData.reduce((max, h) => h.count > max.count ? h : max, { hour: 0, count: 0, revenue: 0 });
  const totalMonthRevenue = sellers.reduce((a, s) => a + s.total_revenue, 0);
  const totalMonthProfit = sellers.reduce((a, s) => a + s.total_profit, 0);
  const avgMargin = marginData.length > 0 ? marginData.reduce((s, m) => s + m.margin_percent, 0) / marginData.length : 0;

  const vipLevelColors: Record<string, string> = { platinum: 'bg-primary/15 text-primary', gold: 'bg-warning/15 text-warning', silver: 'bg-muted text-muted-foreground', regular: 'bg-muted/50 text-muted-foreground' };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Business Intelligence</h1>
          <p className="text-muted-foreground text-sm">Rankings, previsões e análise avançada de performance</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Users className="w-3.5 h-3.5" /> Vendedores</div>
          <p className="text-2xl font-bold">{sellers.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><ShoppingCart className="w-3.5 h-3.5" /> Receita Mês</div>
          <p className="text-lg font-bold">{formatCurrency(totalMonthRevenue)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="w-3.5 h-3.5" /> Lucro Mês</div>
          <p className="text-lg font-bold text-success">{formatCurrency(totalMonthProfit)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Clock className="w-3.5 h-3.5" /> Hora Pico</div>
          <p className="text-2xl font-bold">{peakHour.hour}:00</p>
          <p className="text-[10px] text-muted-foreground">{peakHour.count} vendas</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Award className="w-3.5 h-3.5" /> Top Vendedor</div>
          <p className="text-sm font-bold truncate">{sellers[0]?.full_name || '-'}</p>
          <p className="text-[10px] text-muted-foreground">{formatCurrency(sellers[0]?.total_revenue || 0)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Percent className="w-3.5 h-3.5" /> Margem Média</div>
          <p className="text-2xl font-bold">{avgMargin.toFixed(1)}%</p>
        </Card>
      </div>

      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="growth">Crescimento</TabsTrigger>
          <TabsTrigger value="forecast">Previsão</TabsTrigger>
          <TabsTrigger value="sellers">Vendedores</TabsTrigger>
          <TabsTrigger value="customers">Clientes VIP</TabsTrigger>
          <TabsTrigger value="hours">Horários</TabsTrigger>
          <TabsTrigger value="margins">Margens</TabsTrigger>
        </TabsList>

        <TabsContent value="growth">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Crescimento de Receita (6 Meses)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={monthlyGrowth}>
                  <defs>
                    <linearGradient id="biGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 53%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 53%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                  <Tooltip formatter={(v: number, name: string) => [name === 'vendas' ? v : formatCurrency(v), name === 'vendas' ? 'Vendas' : 'Receita']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="receita" stroke="hsl(217, 91%, 53%)" fill="url(#biGrad)" name="Receita" />
                  <Line type="monotone" dataKey="vendas" stroke="hsl(160, 84%, 39%)" strokeWidth={2} yAxisId={0} name="Vendas" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-warning" /> Previsão de Vendas (3 Meses)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={forecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                  <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === 'real' ? 'Real' : 'Previsão']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="real" stroke="hsl(217, 91%, 53%)" strokeWidth={2} dot={{ r: 4 }} name="Real" connectNulls={false} />
                  <Line type="monotone" dataKey="previsao" stroke="hsl(38, 92%, 50%)" strokeWidth={2} strokeDasharray="8 4" dot={{ r: 4 }} name="Previsão" />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Previsão baseada na taxa de crescimento média dos últimos 3 meses
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sellers">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Ranking de Vendedores (Mês)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sellers.map((s, i) => (
                  <div key={s.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant={i === 0 ? 'default' : 'secondary'} className="w-7 h-7 rounded-full flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                      <div>
                        <p className="font-medium text-sm">{s.full_name}</p>
                        <p className="text-xs text-muted-foreground">{s.total_sales} vendas · Lucro: {formatCurrency(s.total_profit)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(s.total_revenue)}</p>
                      {s.commission_rate > 0 && (
                        <p className="text-xs text-success">Comissão: {formatCurrency(s.commission_earned)}</p>
                      )}
                    </div>
                  </div>
                ))}
                {sellers.length === 0 && <p className="text-center text-muted-foreground py-8">Sem dados de vendas</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Ranking de Clientes VIP</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="w-7 h-7 rounded-full flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.purchases} compras</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`text-xs capitalize ${vipLevelColors[c.level] || ''}`}>{c.level}</Badge>
                      <p className="font-bold text-sm">{formatCurrency(c.spent)}</p>
                    </div>
                  </div>
                ))}
                {topCustomers.length === 0 && <p className="text-center text-muted-foreground py-8">Sem dados de clientes</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Distribuição por Hora</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={hourlyData.filter(h => h.count > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                  <XAxis dataKey="hour" tickFormatter={h => `${h}h`} tick={{ fill: 'hsl(215, 16%, 47%)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(215, 16%, 47%)', fontSize: 11 }} />
                  <Tooltip formatter={(v: number, name: string) => [name === 'count' ? `${v} vendas` : formatCurrency(v), name === 'count' ? 'Vendas' : 'Receita']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="hsl(217, 91%, 53%)" radius={[4, 4, 0, 0]} name="Vendas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margins">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Margem Real por Produto</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left p-3">Produto</th>
                      <th className="text-right p-3">Custo</th>
                      <th className="text-right p-3">Venda</th>
                      <th className="text-right p-3">Margem</th>
                      <th className="text-right p-3">Qtd</th>
                      <th className="text-right p-3">Lucro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marginData.map((m, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-3 font-medium truncate max-w-[200px]">{m.name}</td>
                        <td className="p-3 text-right">{formatCurrency(m.cost_price)}</td>
                        <td className="p-3 text-right">{formatCurrency(m.sale_price)}</td>
                        <td className="p-3 text-right">
                          <span className={m.margin_percent >= 30 ? 'text-success' : m.margin_percent >= 15 ? 'text-warning' : 'text-destructive'}>
                            {m.margin_percent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-right">{m.total_sold}</td>
                        <td className="p-3 text-right font-bold">{formatCurrency(m.total_profit)}</td>
                      </tr>
                    ))}
                    {marginData.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Sem dados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BIDashboardPage;
