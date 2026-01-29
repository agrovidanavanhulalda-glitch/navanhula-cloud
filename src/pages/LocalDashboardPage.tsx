import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Package, 
  DollarSign,
  TrendingUp,
  Users,
  ArrowRight,
  Plus
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

// 100% LOCAL - NO ASYNC, NO BACKEND, NO LOADING

const LocalDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    user, 
    store, 
    sales, 
    products, 
    cashRegisterOpen,
    startNewSale 
  } = useLocalPOS();

  // Calculate stats - SYNCHRONOUS
  const todaySales = sales.filter(s => {
    const today = new Date();
    const saleDate = new Date(s.createdAt);
    return saleDate.toDateString() === today.toDateString();
  });

  const totalRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);
  const totalSalesCount = todaySales.length;

  // Handle new sale - SYNCHRONOUS + IMMEDIATE NAVIGATION
  const handleNewSale = () => {
    startNewSale();
    navigate('/pos'); // Navigate immediately - NO LOADING
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bem-vindo, {user.name}!</h1>
          <p className="text-muted-foreground">{store.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={cashRegisterOpen ? 'default' : 'destructive'} className="text-sm py-1 px-3">
            Caixa {cashRegisterOpen ? 'Aberto' : 'Fechado'}
          </Badge>
          <Button size="lg" onClick={handleNewSale} className="gap-2">
            <Plus className="w-5 h-5" />
            Nova Venda
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Vendas Hoje</p>
              <p className="text-3xl font-bold">{totalSalesCount}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Receita Hoje</p>
              <p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Produtos</p>
              <p className="text-3xl font-bold">{products.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-3xl font-bold">
                {totalSalesCount > 0 
                  ? formatCurrency(totalRevenue / totalSalesCount)
                  : formatCurrency(0)
                }
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className="p-6 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={handleNewSale}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Nova Venda</h3>
                <p className="text-sm text-muted-foreground">Iniciar uma nova venda no PDV</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Card>

        <Card 
          className="p-6 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate('/products')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Package className="w-7 h-7 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Produtos</h3>
                <p className="text-sm text-muted-foreground">Gerenciar catálogo de produtos</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Vendas Recentes</h3>
        {sales.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma venda ainda</p>
            <p className="text-sm">Clique em "Nova Venda" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sales.slice(-5).reverse().map((sale) => (
              <div 
                key={sale.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <div>
                  <p className="font-medium">{sale.items.length} itens</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(sale.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{formatCurrency(sale.total)}</p>
                  <Badge variant="secondary" className="capitalize">
                    {sale.paymentMethod}
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
