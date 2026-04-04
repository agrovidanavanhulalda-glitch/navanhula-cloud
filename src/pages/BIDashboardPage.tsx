import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SkeletonKPI, SkeletonChart } from '@/components/ui/skeleton-card';
import {
  BarChart3, Users, Clock, TrendingUp, Award, RefreshCw, Percent,
  Package, Target, ArrowUpRight, ArrowDownRight, ShoppingCart, Zap,
  Brain, Lightbulb, Star, Activity, AlertTriangle, DollarSign,
  CalendarDays, CreditCard, Banknote, Smartphone, Eye, Info
} from 'lucide-react';
import { formatCurrency, getPaymentMethodLabel } from '@/lib/formatters';
import { useFinancialAggregator } from '@/hooks/useFinancialAggregator';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

const COLORS = ['hsl(217,91%,53%)', 'hsl(160,84%,39%)', 'hsl(38,92%,50%)', 'hsl(199,89%,48%)', 'hsl(280,67%,55%)', 'hsl(0,84%,60%)'];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

type Period = 'today' | 'week' | 'month';

interface SaleRow {
  user_id: string; total: number; created_at: string; customer_name: string | null;
  profit: number | null; cost_total: number | null; payment_method: string;
}

interface AutoInsight {
  icon: React.ElementType;
  type: 'success' | 'warning' | 'info' | 'danger';
  title: string;
  description: string;
}

// ─── KPI Card ───
const KPICard: React.FC<{
  icon: React.ElementType; label: string; value: string | number;
  trend?: string; trendUp?: boolean | null; sub?: string;
}> = ({ icon: Icon, label, value, trend, trendUp, sub }) => (
  <Card className="p-4 hover:translate-y-[-2px] transition-all duration-200 group">
    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1.5 uppercase tracking-wider font-medium">
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
    <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
    {trend && (
      <p className={`text-[11px] mt-1 flex items-center gap-0.5 font-medium ${trendUp === true ? 'text-success' : trendUp === false ? 'text-destructive' : 'text-muted-foreground'}`}>
        {trendUp === true && <ArrowUpRight className="w-3 h-3" />}
        {trendUp === false && <ArrowDownRight className="w-3 h-3" />}
        {trend}
      </p>
    )}
    {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
  </Card>
);

// ─── Insight badge ───
const InsightBadge: React.FC<AutoInsight> = ({ icon: Icon, type, title, description }) => {
  const styles: Record<string, string> = {
    success: 'border-success/30 bg-success/5', warning: 'border-warning/30 bg-warning/5',
    info: 'border-primary/30 bg-primary/5', danger: 'border-destructive/30 bg-destructive/5',
  };
  const ic: Record<string, string> = { success: 'text-success', warning: 'text-warning', info: 'text-primary', danger: 'text-destructive' };
  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${styles[type]}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ic[type]}`} />
      <div className="min-w-0">
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
};

// ─── Empty State ───
const EmptyBI: React.FC<{ message?: string }> = ({ message }) => (
  <div className="py-16 text-center text-muted-foreground">
    <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
    <p className="font-medium">{message || 'Sem dados suficientes para análise'}</p>
    <p className="text-xs mt-1">Realize vendas para ativar a inteligência de negócios.</p>
  </div>
);

// ═════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════

const BIDashboardPage: React.FC = () => {
  const { role, user, company } = useAuth();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; commission_rate: number | null }[]>([]);
  const [items, setItems] = useState<{ sale_id: string; product_id: string; product_name: string; quantity: number; profit: number | null; created_at: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; cost_price: number; sale_price: number; low_stock_threshold: number | null }[]>([]);
  const [stockRows, setStockRows] = useState<{ product_id: string; quantity: number | null }[]>([]);
  const [customers, setCustomers] = useState<{ full_name: string; total_spent: number | null; total_purchases: number | null; vip_level: string | null; last_purchase_at: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');

  const isAdmin = role === 'admin' || role === 'ceo' || role === 'manager';

  // Central financial aggregator
  const { summary: finSummary, loading: finLoading } = useFinancialAggregator();

  // ─── data loading ───
  const loadData = async () => {
    setLoading(true);
    try {
      const [sR, pR, iR, prR, cR, stR] = await Promise.all([
        supabase.from('sales').select('user_id, total, created_at, customer_name, profit, cost_total, payment_method').eq('status', 'completed'),
        supabase.from('profiles').select('id, full_name, commission_rate'),
        supabase.from('sale_items').select('sale_id, product_id, product_name, quantity, profit, created_at'),
        supabase.from('products').select('id, name, cost_price, sale_price, low_stock_threshold').eq('is_active', true),
        supabase.from('customers').select('full_name, total_spent, total_purchases, vip_level, last_purchase_at').order('total_spent', { ascending: false }).limit(20),
        supabase.from('product_stock').select('product_id, quantity'),
      ]);
      setSales(sR.data || []);
      setProfiles(pR.data || []);
      setItems(iR.data || []);
      setProducts(prR.data || []);
      setCustomers(cR.data || []);
      setStockRows(stR.data || []);
    } catch (e) {
      console.error('BI load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ─── Period boundaries ───
  const { periodSales, prevPeriodSales, periodLabel } = useMemo(() => {
    const now = new Date();
    let start: Date, prevStart: Date, prevEnd: Date, label: string;

    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(start); yesterday.setDate(yesterday.getDate() - 1);
      prevStart = yesterday; prevEnd = start; label = 'Hoje';
    } else if (period === 'week') {
      start = new Date(now); start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 7);
      prevEnd = start; label = 'Esta Semana';
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      label = 'Este Mês';
    }

    const ps = sales.filter(s => new Date(s.created_at) >= start);
    const pp = sales.filter(s => { const d = new Date(s.created_at); return d >= prevStart && d < prevEnd; });
    return { periodSales: ps, prevPeriodSales: pp, periodLabel: label };
  }, [sales, period]);

  // ─── Core KPIs ───
  const kpis = useMemo(() => {
    const revenue = periodSales.reduce((a, s) => a + Number(s.total), 0);
    const profit = periodSales.reduce((a, s) => a + Number(s.profit || 0), 0);
    const count = periodSales.length;
    const avgTicket = count > 0 ? revenue / count : 0;

    const prevRevenue = prevPeriodSales.reduce((a, s) => a + Number(s.total), 0);
    const prevCount = prevPeriodSales.length;
    const revGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    const salesGrowth = prevCount > 0 ? ((count - prevCount) / prevCount) * 100 : 0;

    return { revenue, profit, count, avgTicket, revGrowth, salesGrowth, prevRevenue, prevCount };
  }, [periodSales, prevPeriodSales]);

  // ─── Payment method analysis ───
  const paymentAnalysis = useMemo(() => {
    const methods: Record<string, { count: number; total: number }> = {};
    periodSales.forEach(s => {
      const m = s.payment_method || 'cash';
      if (!methods[m]) methods[m] = { count: 0, total: 0 };
      methods[m].count++;
      methods[m].total += Number(s.total);
    });
    const total = periodSales.reduce((a, s) => a + Number(s.total), 0);
    const arr = Object.entries(methods).map(([key, v]) => ({
      name: getPaymentMethodLabel(key),
      key,
      value: v.total,
      count: v.count,
      percent: total > 0 ? (v.total / total) * 100 : 0,
    })).sort((a, b) => b.value - a.value);
    return { data: arr, dominant: arr[0] };
  }, [periodSales]);

  // ─── Top products ───
  const topProducts = useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const mi = items.filter(i => i.created_at && i.created_at >= monthStart);
    const map: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
    mi.forEach(i => {
      if (!map[i.product_id]) {
        const p = products.find(p => p.id === i.product_id);
        map[i.product_id] = { name: i.product_name || p?.name || '?', qty: 0, revenue: 0, profit: 0 };
      }
      map[i.product_id].qty += i.quantity;
      map[i.product_id].profit += Number(i.profit || 0);
      const p = products.find(p => p.id === i.product_id);
      map[i.product_id].revenue += i.quantity * (p?.sale_price || 0);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [items, products]);

  // ─── Hourly analysis ───
  const hourlyData = useMemo(() => {
    const hourMap: Record<number, { count: number; revenue: number }> = {};
    for (let i = 0; i < 24; i++) hourMap[i] = { count: 0, revenue: 0 };
    periodSales.forEach(s => {
      const h = new Date(s.created_at).getHours();
      hourMap[h].count++;
      hourMap[h].revenue += Number(s.total);
    });
    return Object.entries(hourMap).map(([h, v]) => ({ hour: Number(h), label: `${h}h`, ...v }));
  }, [periodSales]);

  const peakHour = useMemo(() => hourlyData.reduce((max, h) => h.count > max.count ? h : max, { hour: 0, label: '0h', count: 0, revenue: 0 }), [hourlyData]);

  // ─── Day of week analysis ───
  const weekdayData = useMemo(() => {
    const dayMap: Record<number, { count: number; revenue: number }> = {};
    for (let i = 0; i < 7; i++) dayMap[i] = { count: 0, revenue: 0 };
    sales.forEach(s => {
      const d = new Date(s.created_at).getDay();
      dayMap[d].count++;
      dayMap[d].revenue += Number(s.total);
    });
    return Object.entries(dayMap).map(([d, v]) => ({ day: WEEKDAY_NAMES[Number(d)], ...v }));
  }, [sales]);

  const peakDay = useMemo(() => weekdayData.reduce((max, d) => d.revenue > max.revenue ? d : max, { day: '-', count: 0, revenue: 0 }), [weekdayData]);

  // ─── Seller ranking ───
  const sellers = useMemo(() => {
    const map: Record<string, { user_id: string; name: string; sales: number; revenue: number; profit: number; rate: number }> = {};
    periodSales.forEach(s => {
      if (!map[s.user_id]) {
        const p = profiles.find(p => p.id === s.user_id);
        map[s.user_id] = { user_id: s.user_id, name: p?.full_name || 'Desconhecido', sales: 0, revenue: 0, profit: 0, rate: Number(p?.commission_rate || 0) };
      }
      map[s.user_id].sales++;
      map[s.user_id].revenue += Number(s.total);
      map[s.user_id].profit += Number(s.profit || 0);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [periodSales, profiles]);

  // ─── Monthly growth (6 months) ───
  const monthlyGrowth = useMemo(() => {
    const g: { name: string; receita: number; vendas: number; lucro: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const ms = new Date(d.getFullYear(), d.getMonth(), 1);
      const me = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const mS = sales.filter(s => { const x = new Date(s.created_at); return x >= ms && x <= me; });
      g.push({
        name: d.toLocaleDateString('pt-MZ', { month: 'short', year: '2-digit' }),
        receita: mS.reduce((a, s) => a + Number(s.total), 0),
        vendas: mS.length,
        lucro: mS.reduce((a, s) => a + Number(s.profit || 0), 0),
      });
    }
    return g;
  }, [sales]);

  // ─── Revenue & profit forecast ───
  const forecastData = useMemo(() => {
    const fData = monthlyGrowth.map(g => ({ name: g.name, real: g.receita, previsao: 0, lucroReal: g.lucro, lucroPrevisao: 0 }));
    if (monthlyGrowth.length >= 3) {
      const last3 = monthlyGrowth.slice(-3);
      const avgRate = last3.length > 1 ? last3.reduce((a, g, i) => i > 0 && last3[i - 1].receita > 0 ? a + (g.receita - last3[i - 1].receita) / last3[i - 1].receita : a, 0) / (last3.length - 1) : 0.05;
      let lastRev = monthlyGrowth[monthlyGrowth.length - 1].receita;
      let lastProfit = monthlyGrowth[monthlyGrowth.length - 1].lucro;
      for (let i = 1; i <= 3; i++) {
        const d = new Date(); d.setMonth(d.getMonth() + i);
        lastRev = lastRev * (1 + Math.max(avgRate, 0.02));
        lastProfit = lastProfit * (1 + Math.max(avgRate, 0.02));
        fData.push({ name: d.toLocaleDateString('pt-MZ', { month: 'short', year: '2-digit' }), real: 0, previsao: Math.round(lastRev), lucroReal: 0, lucroPrevisao: Math.round(lastProfit) });
      }
    }
    return fData;
  }, [monthlyGrowth]);

  // ─── Stock predictions ───
  const stockPredictions = useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const mi = items.filter(i => i.created_at && i.created_at >= monthStart);
    const soldMap: Record<string, number> = {};
    mi.forEach(i => { soldMap[i.product_id] = (soldMap[i.product_id] || 0) + i.quantity; });
    const daysInMonth = new Date().getDate() || 1;

    return products.map(p => {
      const stock = stockRows.filter(s => s.product_id === p.id).reduce((a, s) => a + Number(s.quantity || 0), 0);
      const sold = soldMap[p.id] || 0;
      const dailyRate = sold / daysInMonth;
      const daysLeft = dailyRate > 0 ? Math.floor(stock / dailyRate) : 999;
      let action = 'OK';
      if (stock <= 0) action = 'ESGOTADO';
      else if (daysLeft <= 3) action = 'URGENTE';
      else if (daysLeft <= 7) action = 'REABASTECER';
      else if (daysLeft <= 14) action = 'MONITORAR';
      return { name: p.name, stock, dailyRate, daysLeft, action };
    }).filter(p => p.action !== 'OK').sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 15);
  }, [products, items, stockRows]);

  // ─── CRM top customers ───
  const topCustomers = useMemo(() =>
    customers.map(c => {
      const purchases = Number(c.total_purchases || 0);
      const spent = Number(c.total_spent || 0);
      const lastP = c.last_purchase_at ? new Date(c.last_purchase_at) : null;
      const daysS = lastP ? Math.floor((Date.now() - lastP.getTime()) / 86400000) : 999;
      return {
        name: c.full_name, spent, purchases,
        level: c.vip_level || 'regular',
        avgTicket: purchases > 0 ? spent / purchases : 0,
        frequency: daysS <= 7 ? 'Frequente' : daysS <= 30 ? 'Regular' : daysS <= 90 ? 'Esporádico' : 'Inativo',
      };
    })
  , [customers]);

  // ─── Anomaly detection ───
  const anomalies = useMemo(() => {
    const anoms: AutoInsight[] = [];
    // Daily sales of last 14 days
    const dailyRevs: { date: string; rev: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const dayS = sales.filter(s => s.created_at.slice(0, 10) === ds);
      dailyRevs.push({ date: ds, rev: dayS.reduce((a, s) => a + Number(s.total), 0) });
    }

    // Sudden drop (today vs yesterday >40%)
    if (dailyRevs.length >= 2) {
      const today = dailyRevs[dailyRevs.length - 1];
      const yesterday = dailyRevs[dailyRevs.length - 2];
      if (yesterday.rev > 0 && today.rev < yesterday.rev * 0.6) {
        const drop = ((1 - today.rev / yesterday.rev) * 100).toFixed(0);
        anoms.push({ icon: AlertTriangle, type: 'danger', title: `Queda de ${drop}% nas vendas de hoje`, description: `Receita hoje: ${formatCurrency(today.rev)} vs ontem: ${formatCurrency(yesterday.rev)}. Investigue possíveis causas.` });
      }
    }

    // Days with zero sales in last 7
    const last7 = dailyRevs.slice(-7);
    const zeroDays = last7.filter(d => d.rev === 0);
    if (zeroDays.length > 0 && zeroDays.length < 7) {
      anoms.push({ icon: Eye, type: 'warning', title: `${zeroDays.length} dia(s) sem vendas na última semana`, description: `Dias sem faturamento detectados. Verifique se houve problemas operacionais.` });
    }

    // Unusually high single sale
    const avgSale = periodSales.length > 0 ? periodSales.reduce((a, s) => a + Number(s.total), 0) / periodSales.length : 0;
    const highSales = periodSales.filter(s => Number(s.total) > avgSale * 5 && avgSale > 0);
    if (highSales.length > 0) {
      anoms.push({ icon: Zap, type: 'info', title: `${highSales.length} venda(s) com valor atípico detectada(s)`, description: `Vendas acima de ${formatCurrency(avgSale * 5)} (5x o ticket médio). Verifique se são legítimas.` });
    }

    return anoms;
  }, [sales, periodSales]);

  // ─── AUTO INSIGHTS ENGINE ───
  const autoInsights = useMemo(() => {
    const ins: AutoInsight[] = [];

    // Revenue growth
    if (kpis.revGrowth !== 0) {
      const up = kpis.revGrowth > 0;
      ins.push({
        icon: up ? TrendingUp : ArrowDownRight,
        type: up ? 'success' : 'warning',
        title: `Receita ${up ? 'cresceu' : 'caiu'} ${Math.abs(kpis.revGrowth).toFixed(0)}%`,
        description: `${periodLabel}: ${formatCurrency(kpis.revenue)} vs período anterior: ${formatCurrency(kpis.prevRevenue)}.`,
      });
    }

    // Payment dominance
    if (paymentAnalysis.dominant && paymentAnalysis.dominant.percent > 50) {
      ins.push({
        icon: CreditCard, type: 'info',
        title: `${paymentAnalysis.dominant.name} representa ${paymentAnalysis.dominant.percent.toFixed(0)}% das receitas`,
        description: `${formatCurrency(paymentAnalysis.dominant.value)} em ${paymentAnalysis.dominant.count} transações via ${paymentAnalysis.dominant.name}.`,
      });
    }

    // Top product
    if (topProducts.length > 0) {
      const top = topProducts[0];
      const totalRev = topProducts.reduce((a, p) => a + p.revenue, 0);
      const pct = totalRev > 0 ? ((top.revenue / totalRev) * 100).toFixed(0) : '0';
      ins.push({
        icon: Package, type: 'info',
        title: `"${top.name}" é o produto mais vendido`,
        description: `Responsável por ${pct}% das vendas de produtos (${top.qty} unidades, ${formatCurrency(top.revenue)}).`,
      });
    }

    // Peak hour
    if (peakHour.count > 0) {
      ins.push({
        icon: Clock, type: 'info',
        title: `Pico de vendas: ${peakHour.hour}h-${peakHour.hour + 1}h`,
        description: `${peakHour.count} vendas gerando ${formatCurrency(peakHour.revenue)} neste horário.`,
      });
    }

    // Best seller
    if (sellers.length > 0) {
      const best = sellers[0];
      ins.push({
        icon: Award, type: 'success',
        title: `${best.name} é o melhor vendedor`,
        description: `${best.sales} vendas, ${formatCurrency(best.revenue)} em receita, ${formatCurrency(best.profit)} de lucro.`,
      });
    }

    // Stock alerts
    const urgent = stockPredictions.filter(p => p.action === 'URGENTE' || p.action === 'ESGOTADO');
    if (urgent.length > 0) {
      ins.push({
        icon: AlertTriangle, type: 'danger',
        title: `${urgent.length} produto(s) com estoque crítico`,
        description: `${urgent.map(p => `"${p.name}"`).slice(0, 3).join(', ')}. Reposição imediata necessária.`,
      });
    }

    // Peak day
    if (peakDay.count > 0) {
      ins.push({
        icon: CalendarDays, type: 'info',
        title: `${peakDay.day} é o dia mais forte da semana`,
        description: `${peakDay.count} vendas totais, ${formatCurrency(peakDay.revenue)} em receita historicamente.`,
      });
    }

    // Promo suggestions
    const highStock = products.filter(p => {
      const stock = stockRows.filter(s => s.product_id === p.id).reduce((a, s) => a + Number(s.quantity || 0), 0);
      const sold = topProducts.find(t => t.name === p.name)?.qty || 0;
      return stock > 50 && sold < 5;
    });
    if (highStock.length > 0) {
      ins.push({
        icon: Lightbulb, type: 'warning',
        title: `Promoção sugerida para ${highStock.length} produto(s)`,
        description: `"${highStock[0].name}" tem estoque alto com baixa rotação. Considere reduzir o preço.`,
      });
    }

    return [...ins, ...anomalies].slice(0, 10);
  }, [kpis, paymentAnalysis, topProducts, peakHour, sellers, stockPredictions, peakDay, anomalies, periodLabel, products, stockRows]);

  // ─── Product margins ───
  const marginData = useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const mi = items.filter(i => i.created_at && i.created_at >= monthStart);
    const soldMap: Record<string, { qty: number; profit: number }> = {};
    mi.forEach(i => {
      if (!soldMap[i.product_id]) soldMap[i.product_id] = { qty: 0, profit: 0 };
      soldMap[i.product_id].qty += i.quantity;
      soldMap[i.product_id].profit += Number(i.profit || 0);
    });
    return products.map(p => ({
      name: p.name, cost_price: Number(p.cost_price), sale_price: Number(p.sale_price),
      margin_percent: p.sale_price > 0 ? ((p.sale_price - p.cost_price) / p.sale_price) * 100 : 0,
      total_sold: soldMap[p.id]?.qty || 0, total_profit: soldMap[p.id]?.profit || 0,
    })).sort((a, b) => b.total_profit - a.total_profit).slice(0, 20);
  }, [products, items]);

  const avgMargin = marginData.length > 0 ? marginData.reduce((s, m) => s + m.margin_percent, 0) / marginData.length : 0;

  // ─── Access control ───
  if (!isAdmin) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center p-8">
          <Brain className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Este painel é exclusivo para gestores e administradores.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonKPI key={i} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonChart /> <SkeletonChart />
        </div>
      </div>
    );
  }

  const actionColors: Record<string, string> = { ESGOTADO: 'destructive', URGENTE: 'destructive', REABASTECER: 'secondary', MONITORAR: 'outline' };
  const vipColors: Record<string, string> = { platinum: 'bg-primary/15 text-primary', gold: 'bg-warning/15 text-warning', silver: 'bg-muted text-muted-foreground', regular: 'bg-muted/50 text-muted-foreground' };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" />
            Business Intelligence
          </h1>
          <p className="text-muted-foreground text-sm">
            {company?.name ? `${company.name} — ` : ''}Análise preditiva e inteligência empresarial
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>
      </div>

      {sales.length === 0 ? <EmptyBI /> : (
        <>
          {/* Incomplete data alert */}
          {finSummary.dadosIncompletos && !finLoading && (
            <Alert variant="default" className="border-warning/40 bg-warning/5">
              <Info className="h-4 w-4 text-warning" />
              <AlertTitle className="text-warning font-semibold">Dados incompletos para cálculo de lucro</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                Os seguintes dados estão em falta: <strong>{finSummary.detalhesIncompletos.join(', ')}</strong>.
                O lucro exibido pode não refletir a realidade. Registe despesas, salários e impostos para maior precisão.
              </AlertDescription>
            </Alert>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <KPICard icon={ShoppingCart} label="Vendas" value={kpis.count}
              trend={kpis.salesGrowth !== 0 ? `${kpis.salesGrowth > 0 ? '+' : ''}${kpis.salesGrowth.toFixed(0)}%` : undefined}
              trendUp={kpis.salesGrowth > 0 ? true : kpis.salesGrowth < 0 ? false : null}
              sub={`Anterior: ${kpis.prevCount}`} />
            <KPICard icon={DollarSign} label="Receita" value={formatCurrency(finSummary.receitas)}
              trend={kpis.revGrowth !== 0 ? `${kpis.revGrowth > 0 ? '+' : ''}${kpis.revGrowth.toFixed(0)}%` : undefined}
              trendUp={kpis.revGrowth > 0 ? true : kpis.revGrowth < 0 ? false : null} />
            <KPICard icon={TrendingUp} label="Lucro Líquido" value={formatCurrency(finSummary.lucroLiquido)}
              trend={`Margem: ${finSummary.lucroMargin.toFixed(1)}%`}
              trendUp={finSummary.lucroLiquido > 0 ? true : finSummary.lucroLiquido < 0 ? false : null}
              sub={finSummary.dadosIncompletos ? '⚠ Dados parciais' : undefined} />
            <KPICard icon={Target} label="Ticket Médio" value={formatCurrency(kpis.avgTicket)} />
            <KPICard icon={Clock} label="Hora Pico" value={`${peakHour.hour}:00`} sub={`${peakHour.count} vendas`} />
            <KPICard icon={CalendarDays} label="Dia Forte" value={peakDay.day} sub={formatCurrency(peakDay.revenue)} />
            <KPICard icon={Award} label="Top Seller" value={sellers[0]?.name?.split(' ')[0] || '-'} sub={sellers[0] ? formatCurrency(sellers[0].revenue) : undefined} />
            <KPICard icon={Percent} label="Margem Média" value={`${avgMargin.toFixed(1)}%`} />
          </div>

          {/* Financial breakdown card */}
          <Card className="p-5">
            <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Decomposição Financeira — Mês Atual
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Receitas</p>
                <p className="text-lg font-bold text-success">{formatCurrency(finSummary.receitas)}</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Custo Mercadorias</p>
                <p className="text-lg font-bold text-destructive">{formatCurrency(finSummary.custoMercadorias)}</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Despesas</p>
                <p className="text-lg font-bold text-destructive">{formatCurrency(finSummary.despesasOperacionais)}</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Salários</p>
                <p className="text-lg font-bold text-destructive">{formatCurrency(finSummary.salarios)}</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Impostos</p>
                <p className="text-lg font-bold text-destructive">{formatCurrency(finSummary.impostos)}</p>
              </div>
              <div className={`p-3 rounded-lg border ${finSummary.lucroLiquido >= 0 ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Lucro Líquido</p>
                <p className={`text-lg font-bold ${finSummary.lucroLiquido >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(finSummary.lucroLiquido)}</p>
              </div>
            </div>
          </Card>

          {/* Auto Insights */}
          {autoInsights.length > 0 && (
            <Card className="p-5 border-primary/20">
              <h3 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Insights Inteligentes & Acionáveis
                <Badge variant="secondary" className="text-[10px] ml-1">AI</Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {autoInsights.map((ins, i) => <InsightBadge key={i} {...ins} />)}
              </div>
            </Card>
          )}

          {/* Tabs */}
          <Tabs defaultValue="payments" className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="payments">Pagamentos</TabsTrigger>
              <TabsTrigger value="products">Top Produtos</TabsTrigger>
              <TabsTrigger value="temporal">Análise Temporal</TabsTrigger>
              <TabsTrigger value="forecast">Previsão</TabsTrigger>
              <TabsTrigger value="sellers">Vendedores</TabsTrigger>
              <TabsTrigger value="stock">Estoque AI</TabsTrigger>
              <TabsTrigger value="customers">CRM VIP</TabsTrigger>
              <TabsTrigger value="margins">Margens</TabsTrigger>
            </TabsList>

            {/* ── PAYMENT ANALYSIS ── */}
            <TabsContent value="payments">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Distribuição por Método</CardTitle></CardHeader>
                  <CardContent>
                    {paymentAnalysis.data.length === 0 ? <EmptyBI message="Sem vendas no período" /> : (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={paymentAnalysis.data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {paymentAnalysis.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Detalhes por Método</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {paymentAnalysis.data.map((m, i) => (
                      <div key={m.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <div>
                            <p className="font-medium text-sm">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.count} transações</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{formatCurrency(m.value)}</p>
                          <p className="text-xs text-muted-foreground">{m.percent.toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── TOP PRODUCTS ── */}
            <TabsContent value="products">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Top Produtos por Receita</CardTitle></CardHeader>
                  <CardContent>
                    {topProducts.length === 0 ? <EmptyBI /> : (
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={topProducts.slice(0, 7)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} width={120} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                          <Bar dataKey="revenue" fill="hsl(217, 91%, 53%)" radius={[0, 4, 4, 0]} name="Receita" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Ranking Completo</CardTitle></CardHeader>
                  <CardContent className="space-y-2 max-h-[380px] overflow-auto">
                    {topProducts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Badge variant={i === 0 ? 'default' : 'secondary'} className="w-6 h-6 rounded-full flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                          <div>
                            <p className="font-medium text-sm truncate max-w-[160px]">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.qty} unidades vendidas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{formatCurrency(p.revenue)}</p>
                          <p className="text-xs text-success">{formatCurrency(p.profit)} lucro</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── TEMPORAL ANALYSIS ── */}
            <TabsContent value="temporal">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Vendas por Hora</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={hourlyData.filter(h => h.count > 0)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(215 16% 47%)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(215 16% 47%)' }} />
                        <Tooltip formatter={(v: number, name: string) => [name === 'count' ? `${v} vendas` : formatCurrency(v), name === 'count' ? 'Vendas' : 'Receita']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="count" fill="hsl(217, 91%, 53%)" radius={[4, 4, 0, 0]} name="Vendas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> Vendas por Dia da Semana</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={weekdayData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                        <Tooltip formatter={(v: number, name: string) => [name === 'count' ? `${v} vendas` : formatCurrency(v), name === 'count' ? 'Vendas' : 'Receita']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="revenue" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} name="Receita" />
                        <Bar dataKey="count" fill="hsl(217, 91%, 53%)" radius={[4, 4, 0, 0]} name="Vendas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── FORECAST ── */}
            <TabsContent value="forecast">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-warning" /> Previsão de Receita (3 Meses)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={forecastData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                        <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === 'real' ? 'Real' : 'Previsão']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                        <Legend />
                        <Line type="monotone" dataKey="real" stroke="hsl(217, 91%, 53%)" strokeWidth={2} dot={{ r: 4 }} name="Real" connectNulls={false} />
                        <Line type="monotone" dataKey="previsao" stroke="hsl(38, 92%, 50%)" strokeWidth={2} strokeDasharray="8 4" dot={{ r: 4 }} name="Previsão" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Crescimento (6 Meses)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
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
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── SELLERS ── */}
            <TabsContent value="sellers">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Ranking de Vendedores — {periodLabel}</CardTitle></CardHeader>
                <CardContent>
                  {sellers.length === 0 ? <EmptyBI message="Sem vendas no período" /> : (
                    <div className="space-y-3">
                      {sellers.map((s, i) => {
                        const avgT = s.sales > 0 ? s.revenue / s.sales : 0;
                        return (
                          <div key={s.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <Badge variant={i === 0 ? 'default' : 'secondary'} className="w-7 h-7 rounded-full flex items-center justify-center p-0 text-xs font-bold">{i + 1}</Badge>
                              <div>
                                <p className="font-medium text-sm">{s.name}</p>
                                <p className="text-xs text-muted-foreground">{s.sales} vendas · Ticket: {formatCurrency(avgT)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">{formatCurrency(s.revenue)}</p>
                              <p className="text-xs text-success">Lucro: {formatCurrency(s.profit)}</p>
                              {s.rate > 0 && <p className="text-[10px] text-muted-foreground">Comissão: {formatCurrency(s.revenue * s.rate / 100)}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── STOCK AI ── */}
            <TabsContent value="stock">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Package className="w-5 h-5 text-warning" /> Previsão Inteligente de Estoque</CardTitle></CardHeader>
                <CardContent>
                  {stockPredictions.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="font-medium">Todos os produtos com estoque saudável</p>
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

            {/* ── CRM ── */}
            <TabsContent value="customers">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> CRM Inteligente — Clientes VIP</CardTitle></CardHeader>
                <CardContent>
                  {topCustomers.length === 0 ? <EmptyBI message="Sem dados de clientes" /> : (
                    <div className="space-y-3">
                      {topCustomers.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="w-7 h-7 rounded-full flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                            <div>
                              <p className="font-medium text-sm">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.purchases} compras · Ticket: {formatCurrency(c.avgTicket)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] ${c.frequency === 'Inativo' ? 'bg-destructive/15 text-destructive' : c.frequency === 'Esporádico' ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}`}>{c.frequency}</Badge>
                            <Badge className={`text-xs capitalize ${vipColors[c.level] || ''}`}>{c.level}</Badge>
                            <p className="font-bold text-sm min-w-[80px] text-right">{formatCurrency(c.spent)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── MARGINS ── */}
            <TabsContent value="margins">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Margem Real por Produto</CardTitle></CardHeader>
                <CardContent>
                  {marginData.length === 0 ? <EmptyBI /> : (
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
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default BIDashboardPage;
