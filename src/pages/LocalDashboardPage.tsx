import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonKPI, SkeletonChart, SkeletonList } from '@/components/ui/skeleton-card';
import {
  ShoppingCart, Package, DollarSign, TrendingUp,
  Plus, AlertTriangle, BarChart3,
  ArrowUpRight, ArrowDownRight, Brain,
  Target, Lightbulb, Zap, Clock, Star, Activity, Users
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { motion } from 'framer-motion';

/* ─── Animation ─── */
const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  }),
};

/* ─── KPI Card ─── */
const KPICard: React.FC<{
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean | null;
  icon: React.ElementType;
  index?: number;
}> = ({ label, value, trend, trendUp, icon: Icon, index = 0 }) => (
  <motion.div custom={index} variants={fadeIn} initial="hidden" animate="visible">
    <Card className="p-5 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
      {trend && (
        <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${trendUp === true ? 'text-success' : trendUp === false ? 'text-destructive' : 'text-muted-foreground'}`}>
          {trendUp === true && <ArrowUpRight className="w-3.5 h-3.5" />}
          {trendUp === false && <ArrowDownRight className="w-3.5 h-3.5" />}
          {trend}
        </p>
      )}
    </Card>
  </motion.div>
);

/* ─── Insight Item ─── */
const InsightItem: React.FC<{
  icon: React.ElementType;
  type: 'success' | 'warning' | 'info' | 'danger';
  title: string;
  description: string;
}> = ({ icon: Icon, type, title, description }) => {
  const colors = {
    success: 'text-success bg-success/8',
    warning: 'text-warning bg-warning/8',
    info: 'text-primary bg-primary/8',
    danger: 'text-destructive bg-destructive/8',
  };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${colors[type]}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm text-foreground leading-snug">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

/* ─── Main Dashboard ─── */
const LocalDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { store, sales, products, cashRegisterOpen, startNewSale, loading } = useLocalPOS();
  const { user } = useAuth();
  const [chartPeriod, setChartPeriod] = useState<'today' | 'week' | 'month'>('week');

  /* ── Sales calculations ── */
  const { todaySales, weekSales, monthSales, lastMonthSales } = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      todaySales: sales.filter(s => new Date(s.createdAt).toDateString() === today),
      weekSales: sales.filter(s => new Date(s.createdAt) >= weekStart),
      monthSales: sales.filter(s => new Date(s.createdAt) >= monthStart),
      lastMonthSales: sales.filter(s => { const d = new Date(s.createdAt); return d >= lastMonthStart && d <= lastMonthEnd; }),
    };
  }, [sales]);

  const totalRevenue = todaySales.reduce((a, s) => a + s.total, 0);
  const monthRevenue = monthSales.reduce((a, s) => a + s.total, 0);
  const lastMonthRevenue = lastMonthSales.reduce((a, s) => a + s.total, 0);
  const avgTicket = todaySales.length > 0 ? totalRevenue / todaySales.length : 0;
  const lowStockProducts = products.filter(p => p.stock <= 10 && p.isActive);
  const revenueGrowth = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;

  /* ── Chart data ── */
  const chartData = useMemo(() => {
    const now = new Date();
    if (chartPeriod === 'today') {
      const hours: { name: string; receita: number }[] = [];
      for (let h = 0; h <= now.getHours(); h++) {
        const hourSales = todaySales.filter(s => new Date(s.createdAt).getHours() === h);
        hours.push({ name: `${h}h`, receita: hourSales.reduce((a, s) => a + s.total, 0) });
      }
      return hours;
    }
    if (chartPeriod === 'week') {
      const days: { name: string; receita: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(); date.setDate(date.getDate() - i);
        const dayStr = date.toDateString();
        const daySales = sales.filter(s => new Date(s.createdAt).toDateString() === dayStr);
        days.push({
          name: date.toLocaleDateString('pt-MZ', { weekday: 'short', day: 'numeric' }),
          receita: daySales.reduce((a, s) => a + s.total, 0),
        });
      }
      return days;
    }
    // month
    const days: { name: string; receita: number }[] = [];
    const daysInMonth = now.getDate();
    for (let i = 0; i < daysInMonth; i++) {
      const date = new Date(now.getFullYear(), now.getMonth(), i + 1);
      const dayStr = date.toDateString();
      const daySales = sales.filter(s => new Date(s.createdAt).toDateString() === dayStr);
      days.push({ name: `${i + 1}`, receita: daySales.reduce((a, s) => a + s.total, 0) });
    }
    return days;
  }, [chartPeriod, sales, todaySales]);

  /* ── Top products ── */
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; qty: number }>();
    monthSales.forEach(sale => {
      sale.items.forEach(item => {
        const e = map.get(item.product.id) || { name: item.product.name, revenue: 0, qty: 0 };
        e.revenue += item.total; e.qty += item.quantity;
        map.set(item.product.id, e);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [monthSales]);

  /* ── AI Insights ── */
  const aiInsights = useMemo(() => {
    const insights: { icon: React.ElementType; type: 'success' | 'warning' | 'info' | 'danger'; title: string; description: string }[] = [];

    // Revenue growth
    if (revenueGrowth > 10) {
      insights.push({ icon: TrendingUp, type: 'success', title: `Vendas cresceram ${revenueGrowth.toFixed(0)}%`, description: 'Comparado ao mês anterior. Continue o bom trabalho!' });
    } else if (revenueGrowth < -10) {
      insights.push({ icon: ArrowDownRight, type: 'danger', title: `Vendas caíram ${Math.abs(revenueGrowth).toFixed(0)}%`, description: 'Comparado ao mês anterior. Considere promoções para recuperar.' });
    }

    // Trending product
    if (topProducts.length > 0) {
      insights.push({ icon: Zap, type: 'info', title: `"${topProducts[0].name}" é o mais vendido`, description: `${topProducts[0].qty} unidades vendidas gerando ${formatCurrency(topProducts[0].revenue)} este mês.` });
    }

    // Stock depletion
    const criticalStock = products.filter(p => p.isActive && p.stock > 0).map(p => {
      const sold = monthSales.reduce((a, s) => a + s.items.filter(i => i.product.id === p.id).reduce((a2, i) => a2 + i.quantity, 0), 0);
      const rate = new Date().getDate() > 0 ? sold / new Date().getDate() : 0;
      const daysLeft = rate > 0 ? Math.floor(p.stock / rate) : 999;
      return { ...p, daysLeft, rate };
    }).filter(p => p.daysLeft <= 5).sort((a, b) => a.daysLeft - b.daysLeft);

    criticalStock.slice(0, 2).forEach(p => {
      insights.push({ icon: AlertTriangle, type: p.daysLeft <= 2 ? 'danger' : 'warning', title: `"${p.name}" esgota em ~${p.daysLeft} dias`, description: `Restam ${p.stock} unidades. Reponha o estoque agora.` });
    });

    // Sales velocity
    if (todaySales.length > 0) {
      const hour = new Date().getHours() || 1;
      const rate = todaySales.length / hour;
      insights.push({ icon: Activity, type: rate > 2 ? 'success' : 'info', title: `${rate.toFixed(1)} vendas/hora hoje`, description: `Projeção: ~${Math.round(rate * 12)} vendas e ${formatCurrency(Math.round(avgTicket * rate * 12))} até ao fim do dia.` });
    }

    // Promo suggestion
    const highStock = products.filter(p => p.isActive && p.stock > 50).sort((a, b) => b.stock - a.stock);
    if (highStock.length > 0) {
      insights.push({ icon: Lightbulb, type: 'info', title: `Promoção sugerida: "${highStock[0].name}"`, description: `Estoque alto (${highStock[0].stock} un.). Uma promoção aceleraria a rotação.` });
    }

    if (!cashRegisterOpen) {
      insights.push({ icon: Clock, type: 'warning', title: 'Caixa ainda fechado', description: 'Abra o caixa para iniciar as vendas do dia.' });
    }

    return insights.slice(0, 5);
  }, [revenueGrowth, topProducts, products, monthSales, todaySales, avgTicket, cashRegisterOpen]);

  const handleNewSale = () => { startNewSale(); navigate('/app/pdv'); };

  /* ── Loading State ── */
  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <div className="h-7 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonKPI key={i} />)}
        </div>
        <SkeletonChart />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SkeletonList rows={5} />
          <SkeletonList rows={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground">
            {store.name}
            <span className="text-muted-foreground font-normal text-base ml-2 hidden sm:inline">— Inteligência Empresarial</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={cashRegisterOpen ? 'default' : 'destructive'}
            className="text-xs py-1 px-3 rounded-full"
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${cashRegisterOpen ? 'bg-success animate-pulse' : 'bg-destructive/60'}`} />
            Caixa {cashRegisterOpen ? 'Aberto' : 'Fechado'}
          </Badge>
          <Button size="sm" onClick={handleNewSale} className="gap-1.5 rounded-lg font-medium">
            <Plus className="w-4 h-4" /> Nova Venda
          </Button>
        </div>
      </div>

      {/* 4 Core KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          index={0} icon={DollarSign} label="Receita Hoje"
          value={formatCurrency(totalRevenue)}
          trend={`Mês: ${formatCurrency(monthRevenue)}`}
        />
        <KPICard
          index={1} icon={ShoppingCart} label="Vendas Hoje"
          value={todaySales.length}
          trend={`${monthSales.length} este mês`}
        />
        <KPICard
          index={2} icon={Target} label="Ticket Médio"
          value={formatCurrency(avgTicket)}
        />
        <KPICard
          index={3} icon={AlertTriangle} label="Estoque Baixo"
          value={lowStockProducts.length}
          trend={lowStockProducts.length > 0 ? 'Produtos precisam reposição' : 'Tudo em ordem'}
          trendUp={lowStockProducts.length === 0 ? true : false}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Chart — spans 2 cols */}
        <Card className="xl:col-span-2 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Vendas ao longo do tempo
            </h2>
            <div className="flex bg-muted rounded-lg p-0.5">
              {(['today', 'week', 'month'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${chartPeriod === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
          </div>
          {chartData.every(d => d.receita === 0) ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
              Sem dados para este período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(217, 91%, 53%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(217, 91%, 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Receita']}
                  contentStyle={{ backgroundColor: 'hsl(0 0% 100%)', border: '1px solid hsl(214 32% 91%)', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Area type="monotone" dataKey="receita" stroke="hsl(217, 91%, 53%)" strokeWidth={2} fill="url(#gradRevenue)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: 'hsl(217, 91%, 53%)' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Insights Panel */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-primary" />
            Insights Inteligentes
            <Badge variant="secondary" className="text-[10px] ml-auto">AI</Badge>
          </h2>
          {aiInsights.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Sem insights no momento
            </div>
          ) : (
            <div>
              {aiInsights.map((insight, i) => (
                <InsightItem key={i} {...insight} />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Grid — Top Products & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Products */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-primary" />
            Top Produtos — Mês
          </h2>
          {topProducts.length === 0 ? (
            <EmptyState icon={Package} title="Sem dados" description="Vendas deste mês aparecerão aqui." />
          ) : (
            <div className="space-y-1">
              {topProducts.map((product, i) => (
                <div key={product.name} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.qty} vendidos</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(product.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Sales */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <ShoppingCart className="w-4 h-4 text-primary" />
            Vendas Recentes
          </h2>
          {sales.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Nenhuma venda" description="Registre sua primeira venda."
              action={{ label: 'Nova Venda', onClick: handleNewSale }} />
          ) : (
            <div className="space-y-1">
              {sales.slice(-5).reverse().map(sale => (
                <div key={sale.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleString('pt-MZ', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(sale.total)}</p>
                    <Badge variant="secondary" className="text-[10px] capitalize mt-0.5">
                      {sale.paymentMethod === 'cash' ? 'Dinheiro' : sale.paymentMethod === 'mpesa' ? 'M-Pesa' : sale.paymentMethod === 'emola' ? 'E-Mola' : sale.paymentMethod === 'card' ? 'Cartão' : sale.paymentMethod}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="p-5 border-warning/30">
          <h2 className="text-sm font-semibold text-warning uppercase tracking-wider flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" />
            Estoque Baixo ({lowStockProducts.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {lowStockProducts.slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-sm">
                <span className="truncate mr-2 text-foreground text-xs">{p.name}</span>
                <Badge variant={p.stock <= 3 ? 'destructive' : 'secondary'} className="text-[10px] flex-shrink-0">{p.stock}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default LocalDashboardPage;
