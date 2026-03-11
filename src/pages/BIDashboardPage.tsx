import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3, Users, Clock, TrendingUp, Award, RefreshCw, Percent,
  Package, Target, ArrowUpRight, ArrowDownRight, ShoppingCart, Zap,
  Brain, Lightbulb, Star, Activity, AlertTriangle, DollarSign
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
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

interface AIRecommendation {
  icon: React.ElementType;
  type: 'restock' | 'promo' | 'crm' | 'performance' | 'financial';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

const BIDashboardPage: React.FC = () => {
  const { role } = useAuth();
  const [sellers, setSellers] = useState<SellerPerformance[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: number; count: number; revenue: number }[]>([]);
  const [marginData, setMarginData] = useState<ProductMargin[]>([]);
  const [monthlyGrowth, setMonthlyGrowth] = useState<{ name: string; receita: number; vendas: number; lucro: number }[]>([]);
  const [topCustomers, setTopCustomers] = useState<{ name: string; spent: number; purchases: number; level: string; avgTicket: number; frequency: string }[]>([]);
  const [forecast, setForecast] = useState<{ name: string; real: number; previsao: number }[]>([]);
  const [profitForecast, setProfitForecast] = useState<{ name: string; lucroReal: number; lucroPrevisao: number }[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [stockPredictions, setStockPredictions] = useState<{ name: string; stock: number; dailyRate: number; daysLeft: number; action: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = role === 'admin' || role === 'ceo' || role === 'manager';

  const loadData = async () => {
    setLoading(true);
    try {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString();
      const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString();

      const [salesRes, profilesRes, itemsRes, productsRes, customersRes, stockRes] = await Promise.all([
        supabase.from('sales').select('user_id, total, created_at, customer_name, profit, cost_total, payment_method').eq('status', 'completed'),
        supabase.from('profiles').select('id, full_name, commission_rate'),
        supabase.from('sale_items').select('sale_id, product_id, product_name, quantity, profit, created_at'),
        supabase.from('products').select('id, name, cost_price, sale_price, low_stock_threshold').eq('is_active', true),
        supabase.from('customers').select('full_name, total_spent, total_purchases, vip_level, last_purchase_at, created_at').order('total_spent', { ascending: false }).limit(20),
        supabase.from('product_stock').select('product_id, quantity'),
      ]);

      const salesData = salesRes.data || [];
      const profilesData = profilesRes.data || [];
      const itemsData = itemsRes.data || [];
      const products = productsRes.data || [];
      const stockData = stockRes.data || [];

      // Seller performance
      const sellerMap: Record<string, SellerPerformance> = {};
      const monthSales = salesData.filter(s => s.created_at >= monthStart);
      const lastMonthSales = salesData.filter(s => s.created_at >= lastMonthStart && s.created_at <= lastMonthEnd);
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
        growth.push({
          name: d.toLocaleDateString('pt-MZ', { month: 'short', year: '2-digit' }),
          receita: mSales.reduce((a, s) => a + Number(s.total), 0),
          vendas: mSales.length,
          lucro: mSales.reduce((a, s) => a + Number(s.profit || 0), 0),
        });
      }
      setMonthlyGrowth(growth);

      // Sales & Profit forecast (next 3 months)
      const forecastData: typeof forecast = growth.map(g => ({ name: g.name, real: g.receita, previsao: 0 }));
      const profitFData: typeof profitForecast = growth.map(g => ({ name: g.name, lucroReal: g.lucro, lucroPrevisao: 0 }));
      if (growth.length >= 3) {
        const lastThree = growth.slice(-3);
        const avgGrowthRate = lastThree.length > 1 ? lastThree.reduce((a, g, i) => i > 0 && lastThree[i - 1].receita > 0 ? a + (g.receita - lastThree[i - 1].receita) / lastThree[i - 1].receita : a, 0) / (lastThree.length - 1) : 0.05;
        let lastRev = growth[growth.length - 1].receita;
        let lastProfit = growth[growth.length - 1].lucro;
        for (let i = 1; i <= 3; i++) {
          const d = new Date(); d.setMonth(d.getMonth() + i);
          const nm = d.toLocaleDateString('pt-MZ', { month: 'short', year: '2-digit' });
          lastRev = lastRev * (1 + Math.max(avgGrowthRate, 0.02));
          lastProfit = lastProfit * (1 + Math.max(avgGrowthRate, 0.02));
          forecastData.push({ name: nm, real: 0, previsao: Math.round(lastRev) });
          profitFData.push({ name: nm, lucroReal: 0, lucroPrevisao: Math.round(lastProfit) });
        }
      }
      setForecast(forecastData);
      setProfitForecast(profitFData);

      // Top customers with advanced CRM
      setTopCustomers((customersRes.data || []).map(c => {
        const purchases = Number(c.total_purchases || 0);
        const spent = Number(c.total_spent || 0);
        const lastPurchase = c.last_purchase_at ? new Date(c.last_purchase_at) : null;
        const daysSinceLast = lastPurchase ? Math.floor((Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24)) : 999;
        return {
          name: c.full_name,
          spent,
          purchases,
          level: c.vip_level || 'regular',
          avgTicket: purchases > 0 ? spent / purchases : 0,
          frequency: daysSinceLast <= 7 ? 'Frequente' : daysSinceLast <= 30 ? 'Regular' : daysSinceLast <= 90 ? 'Esporádico' : 'Inativo',
        };
      }));

      // Stock predictions
      const daysInMonth = new Date().getDate() || 1;
      const stockPreds = products.map(p => {
        const stock = stockData.filter(s => s.product_id === p.id).reduce((a, s) => a + Number(s.quantity || 0), 0);
        const sold = productSold[p.id]?.qty || 0;
        const dailyRate = sold / daysInMonth;
        const daysLeft = dailyRate > 0 ? Math.floor(stock / dailyRate) : 999;
        let action = 'OK';
        if (stock <= 0) action = 'ESGOTADO';
        else if (daysLeft <= 3) action = 'URGENTE';
        else if (daysLeft <= 7) action = 'REABASTECER';
        else if (daysLeft <= 14) action = 'MONITORAR';
        return { name: p.name, stock, dailyRate, daysLeft, action };
      }).filter(p => p.action !== 'OK').sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 15);
      setStockPredictions(stockPreds);

      // AI Recommendations engine
      const recs: AIRecommendation[] = [];

      // Restock recommendations
      stockPreds.filter(p => p.action === 'URGENTE' || p.action === 'ESGOTADO').forEach(p => {
        recs.push({
          icon: Package, type: 'restock', priority: 'high',
          title: `Reabastecer "${p.name}" imediatamente`,
          description: p.action === 'ESGOTADO' ? 'Produto esgotado. Vendas perdidas podem estar ocorrendo.' : `Apenas ${p.stock} unidades. Esgota em ~${p.daysLeft} dias.`,
        });
      });

      // Promo recommendations (high stock, low sales)
      products.forEach(p => {
        const stock = stockData.filter(s => s.product_id === p.id).reduce((a, s) => a + Number(s.quantity || 0), 0);
        const sold = productSold[p.id]?.qty || 0;
        if (stock > 50 && sold < 5) {
          recs.push({
            icon: Lightbulb, type: 'promo', priority: 'medium',
            title: `Promoção sugerida: "${p.name}"`,
            description: `Estoque alto (${stock}) com baixa rotação (${sold} vendidos). Reduza preço para acelerar vendas.`,
          });
        }
      });

      // CRM recommendations
      const inactiveVIPs = (customersRes.data || []).filter(c => {
        const lastPurchase = c.last_purchase_at ? new Date(c.last_purchase_at) : null;
        const daysSinceLast = lastPurchase ? Math.floor((Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24)) : 999;
        return (c.vip_level === 'gold' || c.vip_level === 'platinum') && daysSinceLast > 30;
      });
      inactiveVIPs.slice(0, 3).forEach(c => {
        recs.push({
          icon: Star, type: 'crm', priority: 'medium',
          title: `Recontactar cliente VIP: ${c.full_name}`,
          description: `Cliente ${c.vip_level} sem compras há mais de 30 dias. Fidelização em risco.`,
        });
      });

      // Performance recommendations
      if (sellersList.length > 1) {
        const avg = sellersList.reduce((a, s) => a + s.total_revenue, 0) / sellersList.length;
        sellersList.filter(s => s.total_revenue < avg * 0.3).forEach(s => {
          recs.push({
            icon: Users, type: 'performance', priority: 'low',
            title: `Vendedor "${s.full_name}" abaixo da média`,
            description: `Receita de ${formatCurrency(s.total_revenue)} vs média de ${formatCurrency(avg)}. Considere treinamento.`,
          });
        });
      }

      // Financial insights
      const monthRev = growth[growth.length - 1]?.receita || 0;
      const prevRev = growth[growth.length - 2]?.receita || 0;
      if (prevRev > 0 && monthRev < prevRev * 0.8) {
        recs.push({
          icon: AlertTriangle, type: 'financial', priority: 'high',
          title: 'Queda de receita detectada',
          description: `Receita caiu ${((1 - monthRev / prevRev) * 100).toFixed(0)}% em relação ao mês anterior. Investigue causas.`,
        });
      }

      setRecommendations(recs.slice(0, 8));
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
  const totalMonthSales = sellers.reduce((a, s) => a + s.total_sales, 0);
  const avgTicket = totalMonthSales > 0 ? totalMonthRevenue / totalMonthSales : 0;

  const vipLevelColors: Record<string, string> = { platinum: 'bg-primary/15 text-primary', gold: 'bg-warning/15 text-warning', silver: 'bg-muted text-muted-foreground', regular: 'bg-muted/50 text-muted-foreground' };
  const priorityColors: Record<string, string> = { high: 'border-destructive/30 bg-destructive/5', medium: 'border-warning/30 bg-warning/5', low: 'border-primary/30 bg-primary/5' };
  const priorityBadge: Record<string, string> = { high: 'destructive', medium: 'secondary', low: 'outline' };
  const actionColors: Record<string, string> = { ESGOTADO: 'destructive', URGENTE: 'destructive', REABASTECER: 'secondary', MONITORAR: 'outline' };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" />
            Business Intelligence
          </h1>
          <p className="text-muted-foreground text-sm">Análise preditiva, recomendações e inteligência empresarial</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><Users className="w-3 h-3" /> Vendedores</div>
          <p className="text-xl font-bold">{sellers.length}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><ShoppingCart className="w-3 h-3" /> Vendas</div>
          <p className="text-xl font-bold">{totalMonthSales}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><DollarSign className="w-3 h-3" /> Receita</div>
          <p className="text-lg font-bold">{formatCurrency(totalMonthRevenue)}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><TrendingUp className="w-3 h-3" /> Lucro</div>
          <p className="text-lg font-bold text-success">{formatCurrency(totalMonthProfit)}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><Target className="w-3 h-3" /> Ticket Médio</div>
          <p className="text-lg font-bold">{formatCurrency(avgTicket)}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><Clock className="w-3 h-3" /> Hora Pico</div>
          <p className="text-xl font-bold">{peakHour.hour}:00</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><Award className="w-3 h-3" /> Top Seller</div>
          <p className="text-sm font-bold truncate">{sellers[0]?.full_name || '-'}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><Percent className="w-3 h-3" /> Margem</div>
          <p className="text-xl font-bold">{avgMargin.toFixed(1)}%</p>
        </Card>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <Card className="p-5 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <h3 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-warning" />
            Recomendações Inteligentes
            <Badge variant="secondary" className="text-[10px] ml-1">AI</Badge>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec, i) => (
              <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${priorityColors[rec.priority]}`}>
                <rec.icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-foreground text-sm">{rec.title}</p>
                    <Badge variant={priorityBadge[rec.priority] as any} className="text-[9px] px-1.5 py-0">
                      {rec.priority === 'high' ? 'ALTA' : rec.priority === 'medium' ? 'MÉDIA' : 'BAIXA'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Tabs defaultValue="forecast" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="forecast">Previsão</TabsTrigger>
          <TabsTrigger value="profit">Lucro</TabsTrigger>
          <TabsTrigger value="growth">Crescimento</TabsTrigger>
          <TabsTrigger value="stock">Estoque AI</TabsTrigger>
          <TabsTrigger value="sellers">Vendedores</TabsTrigger>
          <TabsTrigger value="customers">CRM VIP</TabsTrigger>
          <TabsTrigger value="hours">Horários</TabsTrigger>
          <TabsTrigger value="margins">Margens</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-warning" /> Previsão de Receita (3 Meses)</CardTitle></CardHeader>
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

        <TabsContent value="profit">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><DollarSign className="w-5 h-5 text-success" /> Previsão de Lucro</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={profitForecast}>
                  <defs>
                    <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                  <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === 'lucroReal' ? 'Lucro Real' : 'Previsão']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend formatter={(v) => v === 'lucroReal' ? 'Lucro Real' : 'Previsão'} />
                  <Area type="monotone" dataKey="lucroReal" stroke="hsl(160, 84%, 39%)" fill="url(#gradLucro)" name="Lucro Real" />
                  <Line type="monotone" dataKey="lucroPrevisao" stroke="hsl(38, 92%, 50%)" strokeWidth={2} strokeDasharray="8 4" name="Previsão" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {profitForecast.filter(p => p.lucroPrevisao > 0).map((p, i) => (
                  <Card key={i} className="p-3 text-center border-success/20">
                    <p className="text-xs text-muted-foreground">{p.name}</p>
                    <p className="text-lg font-bold text-success">{formatCurrency(p.lucroPrevisao)}</p>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Crescimento (6 Meses)</CardTitle></CardHeader>
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
                  <Tooltip formatter={(v: number, name: string) => [name === 'vendas' ? v : formatCurrency(v), name === 'vendas' ? 'Vendas' : name === 'lucro' ? 'Lucro' : 'Receita']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend formatter={(v) => v === 'vendas' ? 'Vendas' : v === 'lucro' ? 'Lucro' : 'Receita'} />
                  <Area type="monotone" dataKey="receita" stroke="hsl(217, 91%, 53%)" fill="url(#biGrad)" name="Receita" />
                  <Line type="monotone" dataKey="lucro" stroke="hsl(160, 84%, 39%)" strokeWidth={2} name="Lucro" />
                  <Line type="monotone" dataKey="vendas" stroke="hsl(38, 92%, 50%)" strokeWidth={2} name="Vendas" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Package className="w-5 h-5 text-warning" /> Previsão Inteligente de Estoque</CardTitle></CardHeader>
            <CardContent>
              {stockPredictions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>Todos os produtos com estoque saudável</p>
                </div>
              ) : (
                <div className="overflow-auto max-h-[500px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border">
                        <th className="text-left p-3">Produto</th>
                        <th className="text-right p-3">Estoque</th>
                        <th className="text-right p-3">Venda/dia</th>
                        <th className="text-right p-3">Dias Restantes</th>
                        <th className="text-right p-3">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockPredictions.map((p, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="p-3 font-medium truncate max-w-[200px]">{p.name}</td>
                          <td className="p-3 text-right">{p.stock}</td>
                          <td className="p-3 text-right">{p.dailyRate.toFixed(1)}</td>
                          <td className="p-3 text-right font-bold">{p.daysLeft <= 0 ? '0' : p.daysLeft}</td>
                          <td className="p-3 text-right">
                            <Badge variant={actionColors[p.action] as any || 'secondary'} className="text-xs">{p.action}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> CRM Inteligente — Clientes VIP</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="w-7 h-7 rounded-full flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.purchases} compras · Ticket: {formatCurrency(c.avgTicket)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${c.frequency === 'Inativo' ? 'bg-destructive/15 text-destructive' : c.frequency === 'Esporádico' ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}`}>
                        {c.frequency}
                      </Badge>
                      <Badge className={`text-xs capitalize ${vipLevelColors[c.level] || ''}`}>{c.level}</Badge>
                      <p className="font-bold text-sm min-w-[80px] text-right">{formatCurrency(c.spent)}</p>
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
                  <Bar dataKey="revenue" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} name="Receita" />
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
