import React from 'react';
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
  ArrowRight, Plus, AlertTriangle, BarChart3
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

const KPICard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  highlight?: 'primary' | 'success' | 'profit' | 'accent';
}> = ({ icon: Icon, label, value, trend, trendUp, highlight }) => (
  <Card className="p-5 transition-all duration-150 hover:border-primary/30 hover:shadow-lg group">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-150 ${
        highlight === 'success' ? 'bg-success/10 group-hover:bg-success/20' :
        highlight === 'profit' ? 'bg-profit/10 group-hover:bg-profit/20' :
        highlight === 'accent' ? 'bg-accent/10 group-hover:bg-accent/20' :
        'bg-primary/10 group-hover:bg-primary/20'
      }`}>
        <Icon className={`w-4.5 h-4.5 ${
          highlight === 'success' ? 'text-success' :
          highlight === 'profit' ? 'text-profit' :
          highlight === 'accent' ? 'text-accent' :
          'text-primary'
        }`} />
      </div>
    </div>
    <p className={`text-2xl lg:text-3xl font-bold tracking-tight ${
      highlight === 'profit' ? 'text-profit' : 'text-foreground'
    }`}>{value}</p>
    {trend && (
      <p className={`text-xs mt-1.5 flex items-center gap-1 ${trendUp ? 'text-success' : 'text-muted-foreground'}`}>
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
    className="p-5 cursor-pointer transition-all duration-150 hover:border-primary/40 hover:shadow-lg group"
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-150">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-150" />
    </div>
  </Card>
);

const LocalDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { store, sales, products, cashRegisterOpen, startNewSale, loading } = useLocalPOS();
  const { user } = useAuth();

  const todaySales = sales.filter(s => {
    const today = new Date();
    const saleDate = new Date(s.createdAt);
    return saleDate.toDateString() === today.toDateString();
  });

  const totalRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);
  const totalSalesCount = todaySales.length;
  const lowStockProducts = products.filter(p => p.stock <= 10 && p.isActive);
  const totalProfit = todaySales.reduce((acc, sale) => {
    return acc + sale.items.reduce((itemAcc, item) => {
      return itemAcc + (item.product.salePrice - item.product.costPrice) * item.quantity;
    }, 0);
  }, 0);

  const handleNewSale = () => {
    startNewSale();
    navigate('/pdv');
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 rounded bg-muted/50 animate-pulse" />
            <div className="h-4 w-40 rounded bg-muted/30 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkeletonKPI key={i} />)}
        </div>
        <SkeletonList rows={3} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            Bem-vindo, {user?.full_name?.split(' ')[0] || 'Usuário'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{store.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant={cashRegisterOpen ? 'default' : 'destructive'} 
            className="text-xs py-1 px-3 font-medium"
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${cashRegisterOpen ? 'bg-success animate-pulse' : 'bg-destructive-foreground'}`} />
            Caixa {cashRegisterOpen ? 'Aberto' : 'Fechado'}
          </Badge>
          <Button size="default" onClick={handleNewSale} className="gap-2 shadow-md">
            <Plus className="w-4 h-4" />
            Nova Venda
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          icon={ShoppingCart} 
          label="Vendas Hoje" 
          value={totalSalesCount}
          highlight="primary"
        />
        <KPICard 
          icon={DollarSign} 
          label="Receita Hoje" 
          value={formatCurrency(totalRevenue)}
          highlight="success"
        />
        <KPICard 
          icon={TrendingUp} 
          label="Lucro Hoje" 
          value={formatCurrency(totalProfit)}
          highlight="profit"
        />
        <KPICard 
          icon={BarChart3} 
          label="Ticket Médio" 
          value={totalSalesCount > 0 ? formatCurrency(totalRevenue / totalSalesCount) : formatCurrency(0)}
          highlight="accent"
        />
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="p-4 border-warning/40 bg-warning/5 animate-fade-in">
          <h3 className="font-semibold text-warning text-sm mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Produtos com Estoque Baixo ({lowStockProducts.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {lowStockProducts.slice(0, 8).map(product => (
              <div key={product.id} className="flex items-center justify-between p-2 bg-background/80 rounded-lg text-sm">
                <span className="truncate mr-2">{product.name}</span>
                <Badge variant="destructive" className="text-xs flex-shrink-0">{product.stock}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickAction
          icon={ShoppingCart}
          title="Nova Venda"
          description="Iniciar uma nova venda no PDV"
          onClick={handleNewSale}
        />
        <QuickAction
          icon={Package}
          title="Produtos"
          description="Gerenciar catálogo de produtos"
          onClick={() => navigate('/produtos')}
        />
      </div>

      {/* Recent Sales */}
      <Card className="p-5">
        <h3 className="text-base font-semibold mb-4">Vendas Recentes</h3>
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
                className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors duration-150"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm">{sale.items.length} itens</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(sale.createdAt).toLocaleString('pt-MZ')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm text-primary font-mono">{formatCurrency(sale.total)}</p>
                  <Badge variant="secondary" className="capitalize text-xs">
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
  );
};

export default LocalDashboardPage;
