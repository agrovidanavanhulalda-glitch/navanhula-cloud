import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonKPI, SkeletonList } from '@/components/ui/skeleton-card';
import { 
  ShoppingCart, Package, DollarSign, TrendingUp,
  ArrowRight, Plus, AlertTriangle, BarChart3, Users, Receipt,
  Wallet, FileText, Boxes, Calendar, Target, Award, Clock,
  ArrowUpRight, ArrowDownRight, Lightbulb, Zap, Brain,
  RefreshCw, Bell, Star, Activity
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { motion } from 'framer-motion';

const CHART_COLORS = [
  'hsl(217, 91%, 53%)',
  'hsl(160, 84%, 39%)',
  'hsl(38, 92%, 50%)',
  'hsl(199, 89%, 48%)',
  'hsl(280, 67%, 55%)',
  'hsl(0, 84%, 60%)',
];

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  }),
};

const KPICard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean | null;
  color: string;
  sub?: string;
  index?: number;
}> = ({ icon: Icon, label, value, trend, trendUp, color, sub, index = 0 }) => (
  <motion.div custom={index} variants={fadeInUp} initial="hidden" animate="visible">
    <Card className="p-5 hover-lift group border-transparent"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${color}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <p className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
      {trend && (
        <p className={`text-xs mt-1.5 flex items-center gap-1 font-medium ${trendUp === true ? 'text-success' : trendUp === false ? 'text-destructive' : 'text-muted-foreground'}`}>
          {trendUp === true && <ArrowUpRight className="w-3 h-3" />}
          {trendUp === false && <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </p>
      )}
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </Card>
  </motion.div>
);

const QuickAction: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  index?: number;
}> = ({ icon: Icon, title, description, onClick, index = 0 }) => (
  <motion.div custom={index} variants={fadeInUp} initial="hidden" animate="visible">
    <Card 
      className="p-4 cursor-pointer hover-lift press-scale group border-transparent"
      style={{ boxShadow: 'var(--shadow-card)' }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-all duration-200">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
      </div>
    </Card>
  </motion.div>
);

// AI Insight Card
const InsightCard: React.FC<{
  icon: React.ElementType;
  type: 'success' | 'warning' | 'info' | 'danger';
  title: string;
  description: string;
}> = ({ icon: Icon, type, title, description }) => {
  const styles = {
    success: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    info: 'border-primary/30 bg-primary/5',
    danger: 'border-destructive/30 bg-destructive/5',
  };
  const iconColors = {
    success: 'text-success',
    warning: 'text-warning',
    info: 'text-primary',
    danger: 'text-destructive',
  };
  return (
    <motion.div 
      className={`flex items-start gap-3 p-3.5 rounded-xl border ${styles[type]}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColors[type]}`} />
      <div className="min-w-0">
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </motion.div>
  );
};

const LocalDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { store, sales, products, cashRegisterOpen, startNewSale, loading } = useLocalPOS();
  const { user } = useAuth();

  // Time-based sales calculations
  const { todaySales, weekSales, monthSales, lastMonthSales } = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const todayS = sales.filter(s => new Date(s.createdAt).toDateString() === today);
    const weekS = sales.filter(s => new Date(s.createdAt) >= weekStart);
    const monthS = sales.filter(s => new Date(s.createdAt) >= monthStart);
    const lastMonthS = sales.filter(s => {
      const d = new Date(s.createdAt);
      return d >= lastMonthStart && d <= lastMonthEnd;
    });
    return { todaySales: todayS, weekSales: weekS, monthSales: monthS, lastMonthSales: lastMonthS };
  }, [sales]);

  const totalRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);
  const weekRevenue = weekSales.reduce((acc, s) => acc + s.total, 0);
  const monthRevenue = monthSales.reduce((acc, s) => acc + s.total, 0);
  const lastMonthRevenue = lastMonthSales.reduce((acc, s) => acc + s.total, 0);
  const lowStockProducts = products.filter(p => p.stock <= 10 && p.isActive);
  const criticalStockProducts = products.filter(p => p.stock <= 3 && p.isActive);

  const calcProfit = (salesList: typeof sales) => salesList.reduce((acc, sale) => {
    if (sale.profit != null) return acc + sale.profit;
    return acc + sale.items.reduce((itemAcc, item) =>
      itemAcc + (item.product.salePrice - item.product.costPrice) * item.quantity, 0);
  }, 0);

  const todayProfit = calcProfit(todaySales);
  const monthProfit = calcProfit(monthSales);
  const lastMonthProfit = calcProfit(lastMonthSales);
  const avgTicket = todaySales.length > 0 ? totalRevenue / todaySales.length : 0;

  // Profit forecast
  const profitForecast = useMemo(() => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const dayOfMonth = new Date().getDate();
    const dailyAvgRevenue = dayOfMonth > 0 ? monthRevenue / dayOfMonth : 0;
    const dailyAvgProfit = dayOfMonth > 0 ? monthProfit / dayOfMonth : 0;
    return {
      estimatedMonthRevenue: Math.round(dailyAvgRevenue * daysInMonth),
      estimatedMonthProfit: Math.round(dailyAvgProfit * daysInMonth),
      revenueGrowth: lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0,
      profitGrowth: lastMonthProfit > 0 ? ((monthProfit - lastMonthProfit) / lastMonthProfit * 100) : 0,
    };
  }, [monthRevenue, monthProfit, lastMonthRevenue, lastMonthProfit]);

  // Top sellers
  const topSellers = useMemo(() => {
    const sellerMap = new Map<string, { name: string; sales: number; revenue: number }>();
    monthSales.forEach(sale => {
      const name = sale.sellerName || 'Vendedor';
      const existing = sellerMap.get(name) || { name, sales: 0, revenue: 0 };
      existing.sales++;
      existing.revenue += sale.total;
      sellerMap.set(name, existing);
    });
    return Array.from(sellerMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [monthSales]);

  // Sales trend (last 14 days for growth calculation)
  const { salesByDay, growthPercent } = useMemo(() => {
    const days: { name: string; vendas: number; receita: number; lucro: number }[] = [];
    let thisWeekTotal = 0;
    let lastWeekTotal = 0;
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toDateString();
      const daySales = sales.filter(s => new Date(s.createdAt).toDateString() === dayStr);
      const rev = daySales.reduce((a, s) => a + s.total, 0);
      if (i < 7) thisWeekTotal += rev;
      else lastWeekTotal += rev;
      if (i < 7) {
        days.push({
          name: date.toLocaleDateString('pt-MZ', { weekday: 'short', day: 'numeric' }),
          vendas: daySales.length,
          receita: rev,
          lucro: daySales.reduce((a, s) => a + (s.profit ?? 0), 0),
        });
      }
    }
    const growth = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal * 100) : 0;
    return { salesByDay: days, growthPercent: growth };
  }, [sales]);

  // Monthly trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months: { name: string; receita: number; lucro: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const mSales = sales.filter(s => {
        const d = new Date(s.createdAt);
        return d >= monthStart && d <= monthEnd;
      });
      months.push({
        name: date.toLocaleDateString('pt-MZ', { month: 'short' }),
        receita: mSales.reduce((a, s) => a + s.total, 0),
        lucro: calcProfit(mSales),
      });
    }
    return months;
  }, [sales]);

  // Top products
  const topProducts = useMemo(() => {
    const productMap = new Map<string, { name: string; revenue: number; qty: number }>();
    monthSales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productMap.get(item.product.id) || { name: item.product.name, revenue: 0, qty: 0 };
        existing.revenue += item.total;
        existing.qty += item.quantity;
        productMap.set(item.product.id, existing);
      });
    });
    return Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [monthSales]);

  // Payment methods
  const salesByPayment = useMemo(() => {
    const methods: Record<string, number> = {};
    todaySales.forEach(s => {
      const label = s.paymentMethod === 'cash' ? 'Dinheiro' :
        s.paymentMethod === 'mpesa' ? 'M-Pesa' :
        s.paymentMethod === 'emola' ? 'E-Mola' :
        s.paymentMethod === 'card' ? 'Cartão' : s.paymentMethod;
      methods[label] = (methods[label] || 0) + s.total;
    });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [todaySales]);

  // Stock prediction
  const stockAlerts = useMemo(() => {
    return products
      .filter(p => p.isActive && p.stock > 0)
      .map(p => {
        const soldThisMonth = monthSales.reduce((acc, sale) => {
          return acc + sale.items.filter(i => i.product.id === p.id).reduce((a, i) => a + i.quantity, 0);
        }, 0);
        const daysInMonth = new Date().getDate();
        const dailyRate = daysInMonth > 0 ? soldThisMonth / daysInMonth : 0;
        const daysUntilEmpty = dailyRate > 0 ? Math.floor(p.stock / dailyRate) : 999;
        return { ...p, dailyRate, daysUntilEmpty, soldThisMonth };
      })
      .filter(p => p.daysUntilEmpty <= 14)
      .sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty)
      .slice(0, 6);
  }, [products, monthSales]);

  // AI INSIGHTS ENGINE
  const aiInsights = useMemo(() => {
    const insights: { icon: React.ElementType; type: 'success' | 'warning' | 'info' | 'danger'; title: string; description: string }[] = [];

    // Product growth insight
    if (topProducts.length > 0) {
      const topProd = topProducts[0];
      const lastMonthQty = lastMonthSales.reduce((acc, s) => acc + s.items.filter(i => i.product.name === topProd.name).reduce((a, i) => a + i.quantity, 0), 0);
      if (lastMonthQty > 0) {
        const change = ((topProd.qty - lastMonthQty) / lastMonthQty * 100);
        if (Math.abs(change) > 10) {
          insights.push({
            icon: change > 0 ? TrendingUp : ArrowDownRight,
            type: change > 0 ? 'success' : 'warning',
            title: `${topProd.name} ${change > 0 ? 'em alta' : 'em queda'}`,
            description: `${change > 0 ? '+' : ''}${change.toFixed(0)}% em relação ao mês anterior (${topProd.qty} vs ${lastMonthQty} unidades).`,
          });
        }
      }
    }

    // Stock depletion warnings
    stockAlerts.slice(0, 2).forEach(p => {
      insights.push({
        icon: AlertTriangle,
        type: p.daysUntilEmpty <= 3 ? 'danger' : 'warning',
        title: `Estoque de "${p.name}" acabará em ~${p.daysUntilEmpty} dias`,
        description: `Taxa de venda: ${p.dailyRate.toFixed(1)}/dia. Restam ${p.stock} unidades. Reponha agora.`,
      });
    });

    // Top customer insight
    const customerMap = new Map<string, { name: string; total: number; count: number }>();
    monthSales.forEach(s => {
      const name = s.customerName || 'Consumidor Final';
      if (name === 'Consumidor Final') return;
      const existing = customerMap.get(name) || { name, total: 0, count: 0 };
      existing.total += s.total;
      existing.count++;
      customerMap.set(name, existing);
    });
    const topCust = Array.from(customerMap.values()).sort((a, b) => b.total - a.total)[0];
    if (topCust && monthRevenue > 0) {
      const pct = (topCust.total / monthRevenue * 100).toFixed(0);
      insights.push({
        icon: Star,
        type: 'info',
        title: `Cliente VIP: ${topCust.name}`,
        description: `Responsável por ${pct}% das vendas do mês (${formatCurrency(topCust.total)}, ${topCust.count} compras).`,
      });
    }

    // Sales velocity
    if (todaySales.length > 0) {
      const hourNow = new Date().getHours();
      const salesPerHour = hourNow > 0 ? (todaySales.length / hourNow) : todaySales.length;
      const projectedDaily = Math.round(salesPerHour * 12);
      insights.push({
        icon: Activity,
        type: projectedDaily > 20 ? 'success' : 'info',
        title: `Ritmo de hoje: ${salesPerHour.toFixed(1)} vendas/hora`,
        description: `Projeção para o dia: ~${projectedDaily} vendas (${formatCurrency(Math.round(avgTicket * projectedDaily))}).`,
      });
    }

    // Growth alert
    if (growthPercent < -20) {
      insights.push({
        icon: ArrowDownRight,
        type: 'danger',
        title: 'Queda brusca nas vendas detectada',
        description: `As vendas caíram ${Math.abs(growthPercent).toFixed(0)}% esta semana vs semana anterior. Reveja promoções.`,
      });
    } else if (growthPercent > 30) {
      insights.push({
        icon: Zap,
        type: 'success',
        title: 'Crescimento acelerado!',
        description: `Vendas cresceram +${growthPercent.toFixed(0)}% esta semana. Excelente desempenho!`,
      });
    }

    // Inactive seller detection
    if (topSellers.length > 1) {
      const worstSeller = topSellers[topSellers.length - 1];
      const bestSeller = topSellers[0];
      if (bestSeller.revenue > 0 && worstSeller.revenue < bestSeller.revenue * 0.1) {
        insights.push({
          icon: Users,
          type: 'warning',
          title: `Vendedor "${worstSeller.name}" com baixa performance`,
          description: `Apenas ${formatCurrency(worstSeller.revenue)} no mês (${worstSeller.sales} vendas). Considere treinamento.`,
        });
      }
    }

    // Recommendations
    const promoProducts = products.filter(p => p.isActive && p.stock > 50);
    if (promoProducts.length > 0) {
      const bestPromo = promoProducts.sort((a, b) => b.stock - a.stock)[0];
      insights.push({
        icon: Lightbulb,
        type: 'info',
        title: `Sugestão: Promoção para "${bestPromo.name}"`,
        description: `Estoque alto (${bestPromo.stock} unidades). Uma promoção pode acelerar a rotação.`,
      });
    }

    if (!cashRegisterOpen) {
      insights.push({
        icon: Bell,
        type: 'warning',
        title: 'Caixa está fechado',
        description: 'Abra o caixa para iniciar as vendas do dia.',
      });
    }

    return insights.slice(0, 6);
  }, [topProducts, stockAlerts, monthSales, monthRevenue, todaySales, growthPercent, topSellers, products, cashRegisterOpen, avgTicket, lastMonthSales]);

  const handleNewSale = () => { startNewSale(); navigate('/app/pdv'); };

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-40 rounded bg-muted/60 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <SkeletonKPI key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <div className="dashboard-hero px-4 md:px-8 pt-6 pb-10 md:pt-8 md:pb-14">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              {store.name}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'hsl(214 32% 70%)' }}>
              Inteligência Empresarial
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={cashRegisterOpen ? 'default' : 'destructive'} className="text-xs py-1.5 px-4 font-medium rounded-full">
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${cashRegisterOpen ? 'bg-success animate-pulse' : 'bg-destructive/60'}`} />
              Caixa {cashRegisterOpen ? 'Aberto' : 'Fechado'}
            </Badge>
            <Button size="default" onClick={handleNewSale} className="gap-2 rounded-lg font-semibold" style={{ boxShadow: 'var(--shadow-glow)' }}>
              <Plus className="w-4 h-4" /> Nova Venda
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 -mt-6 md:-mt-8 pb-8 space-y-6">
        {/* AI Insights Panel */}
        {aiInsights.length > 0 && (
          <Card className="p-5 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent overflow-visible">
            <h3 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              Insights Inteligentes
              <Badge variant="secondary" className="text-[10px] ml-1">AI</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {aiInsights.map((insight, i) => (
                <InsightCard key={i} {...insight} />
              ))}
            </div>
          </Card>
        )}

        {/* KPI Grid - 8 KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={ShoppingCart} label="Vendas Hoje" value={todaySales.length} color="bg-primary/10 text-primary"
            trend={`${weekSales.length} esta semana`} />
          <KPICard icon={DollarSign} label="Receita Hoje" value={formatCurrency(totalRevenue)} color="bg-success/10 text-success"
            sub={`Semana: ${formatCurrency(weekRevenue)}`} />
          <KPICard icon={TrendingUp} label="Lucro Hoje" value={formatCurrency(todayProfit)} color="bg-profit/10 text-profit"
            trend={todayProfit > 0 ? 'Positivo' : 'Sem lucro'} trendUp={todayProfit > 0 ? true : null} />
          <KPICard icon={Target} label="Ticket Médio" value={formatCurrency(avgTicket)} color="bg-primary/10 text-primary" />
          <KPICard icon={Calendar} label="Receita Mensal" value={formatCurrency(monthRevenue)} color="bg-success/10 text-success"
            sub={`Lucro: ${formatCurrency(monthProfit)}`} />
          <KPICard icon={BarChart3} label="Crescimento" 
            value={`${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}%`} 
            color={growthPercent >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
            trend="vs semana anterior" trendUp={growthPercent >= 0} />
          <KPICard icon={Package} label="Produtos Ativos" value={products.filter(p => p.isActive).length} color="bg-primary/10 text-primary"
            sub={`${lowStockProducts.length} com estoque baixo`} />
          <KPICard icon={AlertTriangle} label="Alertas Críticos" 
            value={criticalStockProducts.length + (cashRegisterOpen ? 0 : 1)} 
            color={criticalStockProducts.length > 0 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}
            trend={criticalStockProducts.length > 0 ? `${criticalStockProducts.length} produtos críticos` : 'Tudo em ordem'} 
            trendUp={criticalStockProducts.length === 0} />
        </div>

        {/* Profit Forecast */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 border-success/20">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" />
              Previsão de Receita (Mês)
            </h3>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold text-foreground">{formatCurrency(profitForecast.estimatedMonthRevenue)}</p>
              {profitForecast.revenueGrowth !== 0 && (
                <Badge variant={profitForecast.revenueGrowth > 0 ? 'default' : 'destructive'} className="mb-1">
                  {profitForecast.revenueGrowth > 0 ? '+' : ''}{profitForecast.revenueGrowth.toFixed(0)}% vs mês anterior
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Baseado na média diária de {formatCurrency(Math.round(monthRevenue / Math.max(new Date().getDate(), 1)))}</p>
          </Card>
          <Card className="p-5 border-profit/20">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              Previsão de Lucro (Mês)
            </h3>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold text-success">{formatCurrency(profitForecast.estimatedMonthProfit)}</p>
              {profitForecast.profitGrowth !== 0 && (
                <Badge variant={profitForecast.profitGrowth > 0 ? 'default' : 'destructive'} className="mb-1">
                  {profitForecast.profitGrowth > 0 ? '+' : ''}{profitForecast.profitGrowth.toFixed(0)}% vs mês anterior
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Margem estimada: {monthRevenue > 0 ? (monthProfit / monthRevenue * 100).toFixed(1) : '0.0'}%</p>
          </Card>
        </div>

        {/* Stock Prediction Alerts */}
        {stockAlerts.length > 0 && (
          <Card className="p-4 border-warning/30 bg-warning/5">
            <h3 className="font-semibold text-warning text-sm mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Previsão de Estoque — Reposição Necessária
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {stockAlerts.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-card rounded-lg text-sm border border-border">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.dailyRate.toFixed(1)}/dia · {p.stock} restantes
                    </p>
                  </div>
                  <Badge variant={p.daysUntilEmpty <= 3 ? 'destructive' : 'secondary'} className="text-xs flex-shrink-0 ml-2">
                    {p.daysUntilEmpty <= 0 ? 'ESGOTA HOJE' : `${p.daysUntilEmpty}d`}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Card className="p-4 border-warning/30 bg-warning/5">
            <h3 className="font-semibold text-warning text-sm mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Estoque Baixo ({lowStockProducts.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {lowStockProducts.slice(0, 8).map(product => (
                <div key={product.id} className="flex items-center justify-between p-2.5 bg-card rounded-lg text-sm border border-border">
                  <span className="truncate mr-2 text-foreground">{product.name}</span>
                  <Badge variant={product.stock <= 3 ? 'destructive' : 'secondary'} className="text-xs flex-shrink-0">
                    {product.stock}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Receita & Lucro — Últimos 7 Dias
            </h3>
            {sales.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={salesByDay} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(0 0% 100%)', border: '1px solid hsl(214 32% 91%)', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'receita' ? 'Receita' : 'Lucro']} />
                  <Legend formatter={(v) => v === 'receita' ? 'Receita' : 'Lucro'} />
                  <Bar dataKey="receita" fill="hsl(217, 91%, 53%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lucro" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Pagamentos Hoje
            </h3>
            {salesByPayment.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem vendas hoje</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={salesByPayment} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {salesByPayment.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Charts Row 2 - Monthly Trend & Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Crescimento — Últimos 6 Meses
            </h3>
            {monthlyTrend.every(m => m.receita === 0) ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados históricos</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 53%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 53%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="receita" stroke="hsl(217, 91%, 53%)" fill="url(#gradReceita)" name="Receita" />
                  <Line type="monotone" dataKey="lucro" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ r: 3 }} name="Lucro" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {topProducts.length > 0 ? (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Top Produtos — Mês
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: 'hsl(215 16% 47%)' }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="revenue" fill="hsl(199, 89%, 48%)" radius={[0, 4, 4, 0]} name="Receita" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          ) : (
            <Card className="p-5 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Sem dados de produtos vendidos</p>
              </div>
            </Card>
          )}
        </div>

        {/* Top Sellers */}
        {topSellers.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Top Vendedores — Mês
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {topSellers.map((seller, i) => (
                <div key={seller.name} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-transparent hover:border-border transition-colors">
                  <Badge variant={i === 0 ? 'default' : 'secondary'} className="w-7 h-7 rounded-full flex items-center justify-center p-0 text-xs flex-shrink-0">
                    {i + 1}
                  </Badge>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate text-foreground">{seller.name}</p>
                    <p className="text-xs text-muted-foreground">{seller.sales} vendas · {formatCurrency(seller.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction icon={ShoppingCart} title="Nova Venda" description="Iniciar venda no PDV" onClick={handleNewSale} />
          <QuickAction icon={Package} title="Produtos" description="Gerenciar catálogo" onClick={() => navigate('/app/produtos')} />
          <QuickAction icon={Boxes} title="Estoque" description="Controle de inventário" onClick={() => navigate('/app/estoque')} />
          <QuickAction icon={FileText} title="Fiscal" description="Documentos fiscais" onClick={() => navigate('/app/fiscal')} />
        </div>

        {/* Recent Sales */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold mb-4 text-foreground uppercase tracking-wider">Vendas Recentes</h3>
          {sales.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Nenhuma venda ainda" description="Clique em 'Nova Venda' para registrar sua primeira venda."
              action={{ label: 'Nova Venda', onClick: handleNewSale }} />
          ) : (
            <div className="space-y-2">
              {sales.slice(-5).reverse().map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors duration-200 border border-transparent hover:border-border">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{sale.items.length} itens</p>
                      <p className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleString('pt-MZ')}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm text-foreground font-mono">{formatCurrency(sale.total)}</p>
                    <Badge variant="secondary" className="capitalize text-xs mt-0.5">
                      {sale.paymentMethod === 'cash' ? 'Dinheiro' : sale.paymentMethod === 'card' ? 'Cartão' :
                       sale.paymentMethod === 'mpesa' ? 'M-Pesa' : sale.paymentMethod === 'emola' ? 'E-Mola' : sale.paymentMethod}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LocalDashboardPage;
