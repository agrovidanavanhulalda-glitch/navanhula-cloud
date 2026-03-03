import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Clock, TrendingUp, Award, RefreshCw, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface SellerPerformance {
  user_id: string;
  full_name: string;
  total_sales: number;
  total_revenue: number;
  total_profit: number;
  commission_rate: number;
  commission_earned: number;
}

interface HourlyData {
  hour: number;
  count: number;
  revenue: number;
}

interface ProductMargin {
  name: string;
  cost_price: number;
  sale_price: number;
  margin_percent: number;
  total_sold: number;
  total_profit: number;
}

const BIDashboardPage: React.FC = () => {
  const { role } = useAuth();
  const [sellers, setSellers] = useState<SellerPerformance[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [marginData, setMarginData] = useState<ProductMargin[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = role === 'admin' || role === 'ceo' || role === 'manager';

  const loadData = async () => {
    setLoading(true);
    try {
      // Seller performance
      const { data: salesData } = await supabase
        .from('sales')
        .select('user_id, total, created_at')
        .eq('status', 'completed')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, commission_rate');

      const { data: saleItemsData } = await supabase
        .from('sale_items')
        .select('sale_id, profit, quantity');

      // Build seller performance
      if (salesData && profilesData) {
        const profitBySale: Record<string, number> = {};
        saleItemsData?.forEach(si => {
          profitBySale[si.sale_id] = (profitBySale[si.sale_id] || 0) + Number(si.profit || 0);
        });

        const sellerMap: Record<string, SellerPerformance> = {};
        salesData.forEach(s => {
          if (!sellerMap[s.user_id]) {
            const profile = profilesData.find(p => p.id === s.user_id);
            sellerMap[s.user_id] = {
              user_id: s.user_id,
              full_name: profile?.full_name || 'Desconhecido',
              total_sales: 0,
              total_revenue: 0,
              total_profit: 0,
              commission_rate: Number(profile?.commission_rate || 0),
              commission_earned: 0,
            };
          }
          sellerMap[s.user_id].total_sales++;
          sellerMap[s.user_id].total_revenue += Number(s.total);
          sellerMap[s.user_id].total_profit += profitBySale[s.user_id] || 0;
        });

        const sellersList = Object.values(sellerMap).map(s => ({
          ...s,
          commission_earned: s.total_revenue * (s.commission_rate / 100),
        }));
        sellersList.sort((a, b) => b.total_revenue - a.total_revenue);
        setSellers(sellersList);

        // Hourly distribution
        const hourMap: Record<number, { count: number; revenue: number }> = {};
        for (let i = 0; i < 24; i++) hourMap[i] = { count: 0, revenue: 0 };
        salesData.forEach(s => {
          const hour = new Date(s.created_at).getHours();
          hourMap[hour].count++;
          hourMap[hour].revenue += Number(s.total);
        });
        setHourlyData(Object.entries(hourMap).map(([h, v]) => ({ hour: Number(h), count: v.count, revenue: v.revenue })));
      }

      // Product margins
      const { data: products } = await supabase
        .from('products')
        .select('id, name, cost_price, sale_price')
        .eq('is_active', true);

      if (products && saleItemsData) {
        const soldMap: Record<string, { qty: number; profit: number }> = {};
        saleItemsData.forEach(si => {
          // We need product_id from sale_items
        });

        const { data: itemsWithProduct } = await supabase
          .from('sale_items')
          .select('product_id, quantity, profit')
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

        const productSold: Record<string, { qty: number; profit: number }> = {};
        itemsWithProduct?.forEach(i => {
          if (!productSold[i.product_id]) productSold[i.product_id] = { qty: 0, profit: 0 };
          productSold[i.product_id].qty += i.quantity;
          productSold[i.product_id].profit += Number(i.profit || 0);
        });

        const margins = products.map(p => ({
          name: p.name,
          cost_price: Number(p.cost_price),
          sale_price: Number(p.sale_price),
          margin_percent: p.sale_price > 0 ? ((p.sale_price - p.cost_price) / p.sale_price) * 100 : 0,
          total_sold: productSold[p.id]?.qty || 0,
          total_profit: productSold[p.id]?.profit || 0,
        }));
        margins.sort((a, b) => b.total_profit - a.total_profit);
        setMarginData(margins.slice(0, 20));
      }
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Business Intelligence</h1>
          <p className="text-muted-foreground">Performance, margens e análise avançada</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="w-4 h-4" /> Vendedores Ativos</div>
          <p className="text-2xl font-bold">{sellers.length}</p>
        </Card>
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Clock className="w-4 h-4" /> Hora de Pico</div>
          <p className="text-2xl font-bold">{peakHour.hour}:00</p>
          <p className="text-xs text-muted-foreground">{peakHour.count} vendas</p>
        </Card>
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Award className="w-4 h-4" /> Top Vendedor</div>
          <p className="text-lg font-bold truncate">{sellers[0]?.full_name || '-'}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(sellers[0]?.total_revenue || 0)}</p>
        </Card>
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Percent className="w-4 h-4" /> Margem Média</div>
          <p className="text-2xl font-bold">
            {marginData.length > 0 ? (marginData.reduce((s, m) => s + m.margin_percent, 0) / marginData.length).toFixed(1) : 0}%
          </p>
        </Card>
      </div>

      <Tabs defaultValue="sellers">
        <TabsList>
          <TabsTrigger value="sellers">Performance Vendedores</TabsTrigger>
          <TabsTrigger value="hours">Horários de Pico</TabsTrigger>
          <TabsTrigger value="margins">Margens por Produto</TabsTrigger>
        </TabsList>

        <TabsContent value="sellers" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Ranking de Vendedores (Mês)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sellers.map((s, i) => (
                  <div key={s.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="w-7 h-7 rounded-full flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                      <div>
                        <p className="font-medium text-sm">{s.full_name}</p>
                        <p className="text-xs text-muted-foreground">{s.total_sales} vendas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm pos-money">{formatCurrency(s.total_revenue)}</p>
                      {s.commission_rate > 0 && (
                        <p className="text-xs text-success">Comissão: {formatCurrency(s.commission_earned)} ({s.commission_rate}%)</p>
                      )}
                    </div>
                  </div>
                ))}
                {sellers.length === 0 && <p className="text-center text-muted-foreground py-8">Sem dados de vendas</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5" /> Distribuição por Hora</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={hourlyData.filter(h => h.count > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 22%)" />
                  <XAxis dataKey="hour" tickFormatter={h => `${h}h`} tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'hsl(222, 47%, 14%)', border: '1px solid hsl(217, 33%, 22%)' }} formatter={(v: number, name: string) => [name === 'count' ? `${v} vendas` : formatCurrency(v), name === 'count' ? 'Vendas' : 'Receita']} />
                  <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} name="Vendas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margins" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Margem Real por Produto</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left p-3">Produto</th>
                      <th className="text-right p-3">Custo</th>
                      <th className="text-right p-3">Venda</th>
                      <th className="text-right p-3">Margem</th>
                      <th className="text-right p-3">Vendidos</th>
                      <th className="text-right p-3">Lucro Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marginData.map((m, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-3 font-medium">{m.name}</td>
                        <td className="p-3 text-right">{formatCurrency(m.cost_price)}</td>
                        <td className="p-3 text-right">{formatCurrency(m.sale_price)}</td>
                        <td className="p-3 text-right">
                          <span className={m.margin_percent >= 30 ? 'text-success' : m.margin_percent >= 15 ? 'text-warning' : 'text-destructive'}>
                            {m.margin_percent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-right">{m.total_sold}</td>
                        <td className="p-3 text-right font-bold pos-money">{formatCurrency(m.total_profit)}</td>
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
