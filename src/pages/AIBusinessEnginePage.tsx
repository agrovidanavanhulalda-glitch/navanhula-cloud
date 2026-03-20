import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonKPI, SkeletonList } from '@/components/ui/skeleton-card';
import { formatCurrency } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import {
  Brain, Lightbulb, AlertTriangle, TrendingUp, TrendingDown, Package,
  RefreshCw, ShoppingCart, Star, Zap, Target, BarChart3, ArrowUpRight,
  ArrowDownRight, Sparkles, MessageSquare, X, ChevronDown, ChevronUp,
  DollarSign, Tag, Calendar, Activity
} from 'lucide-react';

interface AIInsights {
  salesAnalysis: { summary: string; trend: string; changePercent: number } | null;
  forecast: { next7days: string; nextMonth: string } | null;
  stockAlerts: { product: string; severity: string; message: string; suggestedAction: string }[];
  staleProducts: { product: string; daysSinceLastSale: number; suggestion: string }[];
  restockSuggestions: { product: string; suggestedQuantity: number; reason: string }[];
  profitInsights: { topProfitable: string; leastProfitable: string; suggestion: string } | null;
  promotionSuggestions: { product: string; reason: string; suggestedDiscount: string }[];
  dailyTip: string;
}

const severityIcon: Record<string, React.ElementType> = { critical: AlertTriangle, warning: AlertTriangle, info: Lightbulb };
const severityStyle: Record<string, string> = {
  critical: 'border-destructive/30 bg-destructive/5 text-destructive',
  warning: 'border-warning/30 bg-warning/5 text-warning',
  info: 'border-primary/30 bg-primary/5 text-primary',
};

const AIBusinessEnginePage: React.FC = () => {
  const { user, company } = useAuth();
  const { sales, products } = useLocalPOS();
  const { toast } = useToast();
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Prepare data summaries from local context
  const dataSummary = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === today);
    const weekSales = sales.filter(s => new Date(s.createdAt) >= weekStart);
    const monthSales = sales.filter(s => new Date(s.createdAt) >= monthStart);
    const lastMonthSales = sales.filter(s => {
      const d = new Date(s.createdAt);
      return d >= lastMonthStart && d <= lastMonthEnd;
    });

    const todayRev = todaySales.reduce((a, s) => a + s.total, 0);
    const weekRev = weekSales.reduce((a, s) => a + s.total, 0);
    const monthRev = monthSales.reduce((a, s) => a + s.total, 0);
    const lastMonthRev = lastMonthSales.reduce((a, s) => a + s.total, 0);

    // Product sales map
    const productSales: Record<string, { name: string; qty: number; revenue: number; profit: number; lastSaleDate: string }> = {};
    sales.forEach(s => {
      s.items.forEach(i => {
        if (!productSales[i.product.id]) {
          productSales[i.product.id] = { name: i.product.name, qty: 0, revenue: 0, profit: 0, lastSaleDate: s.createdAt };
        }
        productSales[i.product.id].qty += i.quantity;
        productSales[i.product.id].revenue += i.total;
        productSales[i.product.id].profit += (i.product.salePrice - i.product.costPrice) * i.quantity;
        if (s.createdAt > productSales[i.product.id].lastSaleDate) {
          productSales[i.product.id].lastSaleDate = s.createdAt;
        }
      });
    });

    const topProds = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Stock alerts
    const daysInMonth = now.getDate() || 1;
    const stockAlerts = products
      .filter(p => p.isActive)
      .map(p => {
        const sold = productSales[p.id]?.qty || 0;
        const dailyRate = sold / Math.max(daysInMonth, 1);
        const daysLeft = dailyRate > 0 ? Math.floor(p.stock / dailyRate) : 999;
        const threshold = 10;
        return { product: p.name, stock: p.stock, dailyRate: +dailyRate.toFixed(1), daysLeft, lowThreshold: threshold };
      })
      .filter(p => p.stock <= p.lowThreshold || p.daysLeft <= 14)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 10);

    // Stale products (no sale in 30 days)
    const staleProducts = products
      .filter(p => p.isActive && p.stock > 0)
      .map(p => {
        const lastSale = productSales[p.id]?.lastSaleDate;
        const daysSince = lastSale ? Math.floor((Date.now() - new Date(lastSale).getTime()) / 86400000) : 999;
        return { product: p.name, daysSinceLastSale: daysSince, stock: p.stock };
      })
      .filter(p => p.daysSinceLastSale >= 30)
      .sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale)
      .slice(0, 5);

    return {
      salesSummary: {
        todayRevenue: todayRev, todaySales: todaySales.length,
        weekRevenue: weekRev, weekSales: weekSales.length,
        monthRevenue: monthRev, monthSales: monthSales.length,
        lastMonthRevenue: lastMonthRev, lastMonthSales: lastMonthSales.length,
      },
      stockAlerts,
      topProducts: topProds,
      profitData: {
        monthProfit: monthSales.reduce((a, s) => a + (s.profit ?? 0), 0),
        lastMonthProfit: lastMonthSales.reduce((a, s) => a + (s.profit ?? 0), 0),
        productProfits: Object.values(productSales).sort((a, b) => b.profit - a.profit).slice(0, 5),
      },
      staleProducts,
    };
  }, [sales, products]);

  const generateInsights = async () => {
    // Check if there's enough data
    if (sales.length === 0 && products.length === 0) {
      toast({ title: 'Sem dados suficientes', description: 'Registre vendas e produtos para gerar insights.', variant: 'default' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-business-insights', {
        body: {
          salesSummary: dataSummary.salesSummary,
          stockAlerts: dataSummary.stockAlerts,
          topProducts: dataSummary.topProducts,
          profitData: dataSummary.profitData,
          currency: 'MT',
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Aviso', description: data.error, variant: 'destructive' });
        // Generate basic fallback insights from local data
        setInsights(generateLocalFallbackInsights());
        setLastUpdated(new Date());
        return;
      }

      setInsights(data as AIInsights);
      setLastUpdated(new Date());
      toast({ title: 'AI Business Engine', description: 'Insights gerados com sucesso!' });
    } catch (e: any) {
      console.error('AI insights error:', e);
      // Fallback to local insights
      const fallback = generateLocalFallbackInsights();
      if (fallback.dailyTip) {
        setInsights(fallback);
        setLastUpdated(new Date());
        toast({ title: 'Insights Locais', description: 'Insights gerados com dados locais (IA indisponível).' });
      } else {
        toast({ title: 'Erro', description: 'Não foi possível gerar insights. Tente novamente.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const generateLocalFallbackInsights = (): AIInsights => {
    const { salesSummary, topProducts, profitData, stockAlerts } = dataSummary;
    const avgTicket = salesSummary.monthSales > 0 ? salesSummary.monthRevenue / salesSummary.monthSales : 0;
    const revenueChange = salesSummary.lastMonthRevenue > 0
      ? ((salesSummary.monthRevenue - salesSummary.lastMonthRevenue) / salesSummary.lastMonthRevenue * 100)
      : 0;

    return {
      salesAnalysis: {
        summary: `Este mês: ${salesSummary.monthSales} vendas, total de ${formatCurrency(salesSummary.monthRevenue)}. Ticket médio: ${formatCurrency(avgTicket)}.`,
        trend: revenueChange > 5 ? 'up' : revenueChange < -5 ? 'down' : 'stable',
        changePercent: Math.round(revenueChange),
      },
      forecast: null,
      stockAlerts: stockAlerts.slice(0, 5).map(a => ({
        product: a.product,
        severity: a.daysLeft <= 3 ? 'critical' : a.daysLeft <= 7 ? 'warning' : 'info',
        message: `Estoque: ${a.stock} unidades. Taxa de venda: ${a.dailyRate}/dia.`,
        suggestedAction: `Repor em ${a.daysLeft} dias para evitar ruptura.`,
      })),
      staleProducts: [],
      restockSuggestions: [],
      profitInsights: profitData.productProfits.length > 0 ? {
        topProfitable: profitData.productProfits[0]?.name || 'N/A',
        leastProfitable: profitData.productProfits[profitData.productProfits.length - 1]?.name || 'N/A',
        suggestion: `Lucro do mês: ${formatCurrency(profitData.monthProfit)}.`,
      } : null,
      promotionSuggestions: [],
      dailyTip: salesSummary.todaySales > 0
        ? `Hoje você já realizou ${salesSummary.todaySales} vendas totalizando ${formatCurrency(salesSummary.todayRevenue)}. Continue assim!`
        : 'Nenhuma venda registrada hoje. Abra o caixa e comece a vender!',
    };
  };

  useEffect(() => { generateInsights(); }, []);

  const SectionCard: React.FC<{ icon: React.ElementType; title: string; iconColor?: string; children: React.ReactNode }> = ({ icon: Icon, title, iconColor = 'text-primary', children }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" />
            NAVANHULA AI Business Engine
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Inteligência artificial analisando seus dados para gerar previsões e recomendações
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Atualizado: {lastUpdated.toLocaleTimeString('pt-MZ')}
            </span>
          )}
          <Button onClick={generateInsights} disabled={loading} size="sm" className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analisando...' : 'Gerar Insights'}
          </Button>
        </div>
      </div>

      {loading && !insights ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <SkeletonList key={i} rows={3} />)}
        </div>
      ) : insights ? (
        <>
          {/* Daily Tip Banner */}
          {insights.dailyTip && (
            <Card className="p-4 border-primary/20" style={{ background: 'var(--gradient-card)' }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gradient-primary)' }}>
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">💡 Dica do Dia — NAVANHULA AI</p>
                  <p className="text-sm text-muted-foreground mt-1">{insights.dailyTip}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Sales Analysis + Forecast */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.salesAnalysis && (
              <SectionCard icon={BarChart3} title="Análise de Vendas">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={insights.salesAnalysis.trend === 'up' ? 'default' : insights.salesAnalysis.trend === 'down' ? 'destructive' : 'secondary'}>
                    {insights.salesAnalysis.trend === 'up' && <ArrowUpRight className="w-3 h-3 mr-1" />}
                    {insights.salesAnalysis.trend === 'down' && <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {insights.salesAnalysis.trend === 'up' ? 'Em Alta' : insights.salesAnalysis.trend === 'down' ? 'Em Queda' : 'Estável'}
                    {insights.salesAnalysis.changePercent !== 0 && ` ${insights.salesAnalysis.changePercent > 0 ? '+' : ''}${insights.salesAnalysis.changePercent.toFixed(0)}%`}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{insights.salesAnalysis.summary}</p>
              </SectionCard>
            )}

            {insights.forecast && (
              <SectionCard icon={Target} title="Previsões" iconColor="text-success">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Próximos 7 dias</p>
                    <p className="text-sm mt-1">{insights.forecast.next7days}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Próximo mês</p>
                    <p className="text-sm mt-1">{insights.forecast.nextMonth}</p>
                  </div>
                </div>
              </SectionCard>
            )}
          </div>

          {/* Stock Alerts */}
          {insights.stockAlerts?.length > 0 && (
            <SectionCard icon={AlertTriangle} title="Alertas de Estoque" iconColor="text-warning">
              <div className="space-y-2">
                {insights.stockAlerts.map((alert, i) => {
                  const Icon = severityIcon[alert.severity] || Lightbulb;
                  return (
                    <div key={i} className={`p-3 rounded-lg border ${severityStyle[alert.severity] || severityStyle.info}`}>
                      <div className="flex items-start gap-2">
                        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm text-foreground">{alert.product}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                          <p className="text-xs font-medium mt-1 text-foreground">→ {alert.suggestedAction}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stale Products */}
            {insights.staleProducts?.length > 0 && (
              <SectionCard icon={Package} title="Produtos Parados" iconColor="text-destructive">
                {insights.staleProducts.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm">{p.product}</p>
                      <Badge variant="destructive" className="text-[10px]">{p.daysSinceLastSale} dias sem venda</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.suggestion}</p>
                  </div>
                ))}
              </SectionCard>
            )}

            {/* Restock Suggestions */}
            {insights.restockSuggestions?.length > 0 && (
              <SectionCard icon={ShoppingCart} title="Sugestões de Reposição" iconColor="text-primary">
                {insights.restockSuggestions.map((r, i) => (
                  <div key={i} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm">{r.product}</p>
                      <Badge variant="outline" className="text-[10px]">+{r.suggestedQuantity} unidades</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.reason}</p>
                  </div>
                ))}
              </SectionCard>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profit Insights */}
            {insights.profitInsights && (
              <SectionCard icon={DollarSign} title="Análise de Lucro" iconColor="text-success">
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                    <p className="text-xs font-semibold text-success flex items-center gap-1"><Star className="w-3 h-3" /> Mais lucrativo</p>
                    <p className="text-sm mt-0.5">{insights.profitInsights.topProfitable}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-xs font-semibold text-destructive flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Menos lucrativo</p>
                    <p className="text-sm mt-0.5">{insights.profitInsights.leastProfitable}</p>
                  </div>
                  <p className="text-xs text-muted-foreground italic">{insights.profitInsights.suggestion}</p>
                </div>
              </SectionCard>
            )}

            {/* Promotion Suggestions */}
            {insights.promotionSuggestions?.length > 0 && (
              <SectionCard icon={Tag} title="Sugestões de Promoção" iconColor="text-warning">
                {insights.promotionSuggestions.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm">{p.product}</p>
                      <Badge variant="secondary" className="text-[10px]">{p.suggestedDiscount}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.reason}</p>
                  </div>
                ))}
              </SectionCard>
            )}
          </div>
        </>
      ) : (
        <Card className="p-12 text-center">
          <Brain className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg">Nenhum insight disponível</h3>
          <p className="text-sm text-muted-foreground mt-1">Clique em "Gerar Insights" para analisar os dados da sua empresa.</p>
        </Card>
      )}

      {/* Floating AI Assistant */}
      <div className="fixed bottom-6 right-6 z-50">
        {assistantOpen && insights?.dailyTip ? (
          <Card className="w-80 p-4 border-primary/30 animate-in slide-in-from-bottom-4" style={{ boxShadow: 'var(--shadow-lg, 0 10px 30px -10px rgba(0,0,0,0.3))' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-semibold text-sm">NAVANHULA AI</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAssistantOpen(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{insights.dailyTip}</p>
            {insights.salesAnalysis && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground">
                  Tendência: <span className={insights.salesAnalysis.trend === 'up' ? 'text-success font-semibold' : insights.salesAnalysis.trend === 'down' ? 'text-destructive font-semibold' : ''}>
                    {insights.salesAnalysis.trend === 'up' ? '📈 Em alta' : insights.salesAnalysis.trend === 'down' ? '📉 Em queda' : '➡️ Estável'}
                  </span>
                </p>
              </div>
            )}
          </Card>
        ) : (
          <Button
            onClick={() => setAssistantOpen(true)}
            className="rounded-full w-14 h-14 shadow-lg"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <Brain className="w-6 h-6 text-white" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default AIBusinessEnginePage;
