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
  Wallet, FileText, Boxes
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const CHART_COLORS = [
  'hsl(217, 91%, 53%)',
  'hsl(160, 84%, 39%)',
  'hsl(38, 92%, 50%)',
  'hsl(199, 89%, 48%)',
  'hsl(280, 67%, 55%)',
  'hsl(0, 84%, 60%)',
];

const KPICard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  color: string;
}> = ({ icon: Icon, label, value, trend, trendUp, color }) => (
  <Card className="p-5 hover:translate-y-[-2px] transition-all duration-200 group border-transparent"
    style={{ boxShadow: 'var(--shadow-card)' }}>
    <div className="flex items-center justify-between mb-4">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
    {trend && (
      <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${trendUp ? 'text-success' : 'text-muted-foreground'}`}>
        {trendUp && <TrendingUp className="w-3 h-3" />}
        {trend}
      </p>
    )}
  </Card>
);

const QuickAction: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}> = ({ icon: Icon, title, description, onClick }) => (
  <Card 
    className="p-4 cursor-pointer hover:translate-y-[-1px] transition-all duration-200 group border-transparent"
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
);

const LocalDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { store, sales, products, cashRegisterOpen, startNewSale, loading } = useLocalPOS();
  const { user } = useAuth();

  const todaySales = useMemo(() => sales.filter(s => {
    const today = new Date();
    const saleDate = new Date(s.createdAt);
    return saleDate.toDateString() === today.toDateString();
  }), [sales]);

  const totalRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);
  const totalSalesCount = todaySales.length;
  const lowStockProducts = products.filter(p => p.stock <= 10 && p.isActive);
  const totalProfit = todaySales.reduce((acc, sale) => {
    if (sale.profit != null) return acc + sale.profit;
    return acc + sale.items.reduce((itemAcc, item) => {
      return itemAcc + (item.product.salePrice - item.product.costPrice) * item.quantity;
    }, 0);
  }, 0);

  // Chart data: Sales by last 7 days
  const salesByDay = useMemo(() => {
    const days: { name: string; vendas: number; receita: number; lucro: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toDateString();
      const daySales = sales.filter(s => new Date(s.createdAt).toDateString() === dayStr);
      days.push({
        name: date.toLocaleDateString('pt-MZ', { weekday: 'short', day: 'numeric' }),
        vendas: daySales.length,
        receita: daySales.reduce((a, s) => a + s.total, 0),
        lucro: daySales.reduce((a, s) => a + (s.profit ?? 0), 0),
      });
    }
    return days;
  }, [sales]);

  // Chart data: Top products by revenue
  const topProducts = useMemo(() => {
    const productMap = new Map<string, { name: string; revenue: number; qty: number }>();
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productMap.get(item.product.id) || { name: item.product.name, revenue: 0, qty: 0 };
        existing.revenue += item.total;
        existing.qty += item.quantity;
        productMap.set(item.product.id, existing);
      });
    });
    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [sales]);

  // Chart data: Sales by payment method
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

  const handleNewSale = () => {
    startNewSale();
    navigate('/app/pdv');
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-40 rounded bg-muted/60 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1,2,3,4].map(i => <SkeletonKPI key={i} />)}
        </div>
        <SkeletonList rows={3} />
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
              Bem-vindo{user?.full_name && !/^[0-9a-f-]{36}$/i.test(user.full_name) ? `, ${user.full_name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'hsl(214 32% 70%)' }}>{store.name} — Painel de Controle</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge 
              variant={cashRegisterOpen ? 'default' : 'destructive'} 
              className="text-xs py-1.5 px-4 font-medium rounded-full"
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${cashRegisterOpen ? 'bg-success animate-pulse' : 'bg-destructive/60'}`} />
              Caixa {cashRegisterOpen ? 'Aberto' : 'Fechado'}
            </Badge>
            <Button size="default" onClick={handleNewSale} className="gap-2 rounded-lg font-semibold"
              style={{ boxShadow: 'var(--shadow-glow)' }}>
              <Plus className="w-4 h-4" />
              Nova Venda
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 -mt-6 md:-mt-8 pb-8 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <KPICard icon={ShoppingCart} label="Vendas Hoje" value={totalSalesCount} color="bg-primary/10 text-primary" />
          <KPICard icon={DollarSign} label="Receita Hoje" value={formatCurrency(totalRevenue)} color="bg-success/10 text-success" />
          <KPICard icon={TrendingUp} label="Lucro Hoje" value={formatCurrency(totalProfit)} color="bg-profit/10 text-profit" />
          <KPICard icon={BarChart3} label="Ticket Médio" value={totalSalesCount > 0 ? formatCurrency(totalRevenue / totalSalesCount) : formatCurrency(0)} color="bg-primary/10 text-primary" />
        </div>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Card className="p-4 border-warning/30 bg-warning/5 animate-fade-in">
            <h3 className="font-semibold text-warning text-sm mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Produtos com Estoque Baixo ({lowStockProducts.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {lowStockProducts.slice(0, 8).map(product => (
                <div key={product.id} className="flex items-center justify-between p-2.5 bg-card rounded-lg text-sm border border-border">
                  <span className="truncate mr-2 text-foreground">{product.name}</span>
                  <Badge variant="destructive" className="text-xs flex-shrink-0">{product.stock}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Sales by Day Chart */}
          <Card className="p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Vendas — Últimos 7 Dias
            </h3>
            {sales.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Sem dados de vendas para exibir
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={salesByDay} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(0 0% 100%)', 
                      border: '1px solid hsl(214 32% 91%)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'receita' || name === 'lucro' ? formatCurrency(value) : value,
                      name === 'receita' ? 'Receita' : name === 'lucro' ? 'Lucro' : 'Vendas'
                    ]}
                  />
                  <Legend formatter={(v) => v === 'receita' ? 'Receita' : v === 'lucro' ? 'Lucro' : 'Vendas'} />
                  <Bar dataKey="receita" fill="hsl(217, 91%, 53%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lucro" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Payment Methods Pie */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Métodos de Pagamento
            </h3>
            {salesByPayment.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Sem vendas hoje
              </div>
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

        {/* Top Products */}
        {topProducts.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Produtos Mais Vendidos
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="revenue" fill="hsl(199, 89%, 48%)" radius={[0, 4, 4, 0]} name="Receita" />
              </BarChart>
            </ResponsiveContainer>
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
            <EmptyState
              icon={ShoppingCart}
              title="Nenhuma venda ainda"
              description="Clique em 'Nova Venda' para registrar sua primeira venda no sistema."
              action={{ label: 'Nova Venda', onClick: handleNewSale }}
            />
          ) : (
            <div className="space-y-2">
              {sales.slice(-5).reverse().map((sale) => (
                <div 
                  key={sale.id} 
                  className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors duration-200 border border-transparent hover:border-border"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{sale.items.length} itens</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleString('pt-MZ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm text-foreground font-mono">{formatCurrency(sale.total)}</p>
                    <Badge variant="secondary" className="capitalize text-xs mt-0.5">
                      {sale.paymentMethod === 'cash' ? 'Dinheiro' :
                       sale.paymentMethod === 'card' ? 'Cartão' :
                       sale.paymentMethod === 'mpesa' ? 'M-Pesa' :
                       sale.paymentMethod === 'emola' ? 'E-Mola' : sale.paymentMethod}
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
