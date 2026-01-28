import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { withTimeout } from '@/lib/mockData';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Package,
  AlertTriangle,
  Store as StoreIcon,
} from 'lucide-react';

interface Stats {
  todaySales: number;
  todayRevenue: number;
  todayProfit: number;
  lowStockCount: number;
  totalProducts: number;
  totalUsers: number;
}

const DEFAULT_STATS: Stats = {
  todaySales: 0,
  todayRevenue: 0,
  todayProfit: 0,
  lowStockCount: 0,
  totalProducts: 0,
  totalUsers: 0,
};

const DashboardPage: React.FC = () => {
  const { user, store, role } = useAuth();
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [recentSales, setRecentSales] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      // Always render after 1 second max
      const timeout = setTimeout(() => setLoading(false), 1000);

      if (!store?.id) {
        clearTimeout(timeout);
        setLoading(false);
        return;
      }

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch today's sales with timeout
        const salesResult = await withTimeout(
          supabase
            .from('sales')
            .select('total, sale_items(profit)')
            .eq('store_id', store.id)
            .eq('status', 'completed')
            .gte('created_at', today.toISOString())
            .then(r => r),
          1000,
          { data: null, error: null }
        );

        const salesData = salesResult.data || [];
        const todaySales = salesData.length;
        const todayRevenue = salesData.reduce((sum: number, sale: any) => sum + Number(sale.total), 0);
        const todayProfit = salesData.reduce((sum: number, sale: any) => {
          const itemsProfit = sale.sale_items?.reduce((p: number, item: any) => p + Number(item.profit || 0), 0) || 0;
          return sum + itemsProfit;
        }, 0);

        // Fetch low stock products
        const stockResult = await withTimeout(
          supabase
            .from('product_stock')
            .select('quantity, product:products(low_stock_threshold)')
            .eq('store_id', store.id)
            .then(r => r),
          1000,
          { data: null, error: null }
        );

        const stockData = stockResult.data || [];
        const lowStockCount = stockData.filter((s: any) => 
          s.quantity <= (s.product?.low_stock_threshold || 10)
        ).length;

        // Fetch total products
        const productsResult = await withTimeout(
          supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .then(r => r),
          1000,
          { count: 0, error: null }
        );

        // Fetch recent sales
        const recentResult = await withTimeout(
          supabase
            .from('sales')
            .select('*, profiles:user_id(full_name)')
            .eq('store_id', store.id)
            .order('created_at', { ascending: false })
            .limit(5)
            .then(r => r),
          1000,
          { data: null, error: null }
        );

        setStats({
          todaySales,
          todayRevenue,
          todayProfit,
          lowStockCount,
          totalProducts: (productsResult as any).count || 0,
          totalUsers: 0,
        });
        setRecentSales(recentResult.data || []);
      } catch (error) {
        console.warn('Error fetching stats:', error);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    fetchStats();
  }, [store?.id]);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    trend,
    color,
  }: {
    icon: any;
    label: string;
    value: string;
    trend?: { value: number; isUp: boolean };
    color: string;
  }) => (
    <div className="pos-card animate-scale-in">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trend.isUp ? 'text-success' : 'text-loss'}`}>
            {trend.isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="pos-stat-label">{label}</p>
        <p className="pos-stat-value pos-money">{value}</p>
      </div>
    </div>
  );

  // Show skeleton for max 1 second, then render content
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="pos-card animate-pulse">
              <div className="w-12 h-12 rounded-xl pos-skeleton" />
              <div className="mt-4 space-y-2">
                <div className="h-4 w-24 pos-skeleton" />
                <div className="h-8 w-32 pos-skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Olá, {user?.full_name || 'Usuário'}! Bem-vindo ao NAVANHULA POS
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
          <StoreIcon className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{store?.name || 'Loja'}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ShoppingCart}
          label="Vendas Hoje"
          value={formatNumber(stats.todaySales)}
          trend={{ value: 12, isUp: true }}
          color="bg-primary/20 text-primary"
        />
        <StatCard
          icon={DollarSign}
          label="Receita Hoje"
          value={formatCurrency(stats.todayRevenue)}
          trend={{ value: 8, isUp: true }}
          color="bg-success/20 text-success"
        />
        <StatCard
          icon={TrendingUp}
          label="Lucro Hoje"
          value={formatCurrency(stats.todayProfit)}
          trend={{ value: 5, isUp: true }}
          color="bg-profit/20 text-profit"
        />
        <StatCard
          icon={AlertTriangle}
          label="Estoque Baixo"
          value={formatNumber(stats.lowStockCount)}
          color={stats.lowStockCount > 0 ? 'bg-warning/20 text-warning' : 'bg-muted text-muted-foreground'}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="pos-card">
          <h2 className="text-lg font-semibold mb-4">Vendas Recentes</h2>
          <div className="space-y-3">
            {recentSales.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma venda registrada hoje</p>
            ) : (
              recentSales.map((sale: any) => (
                <div key={sale.id} className="pos-cart-item">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">Venda #{sale.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">{sale.profiles?.full_name || 'Vendedor'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold pos-money text-success">{formatCurrency(sale.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sale.created_at).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pos-card">
          <h2 className="text-lg font-semibold mb-4">Acesso Rápido</h2>
          <div className="grid grid-cols-2 gap-3">
            <a href="/pos" className="pos-product-card hover:glow-primary">
              <ShoppingCart className="w-8 h-8 text-primary" />
              <span className="font-medium">Nova Venda</span>
            </a>
            <a href="/cash-register" className="pos-product-card">
              <DollarSign className="w-8 h-8 text-success" />
              <span className="font-medium">Caixa</span>
            </a>
            {(role === 'admin' || role === 'manager') && (
              <>
                <a href="/products" className="pos-product-card">
                  <Package className="w-8 h-8 text-accent" />
                  <span className="font-medium">Produtos</span>
                </a>
                <a href="/reports" className="pos-product-card">
                  <TrendingUp className="w-8 h-8 text-profit" />
                  <span className="font-medium">Relatórios</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Low stock alert */}
      {stats.lowStockCount > 0 && (
        <div className="pos-card border-warning/50 bg-warning/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-warning" />
            <div>
              <p className="font-semibold text-warning">Atenção: Estoque Baixo</p>
              <p className="text-sm text-muted-foreground">
                {stats.lowStockCount} produto(s) com estoque abaixo do limite mínimo
              </p>
            </div>
            <a href="/inventory" className="ml-auto pos-button-secondary px-4 py-2">
              Ver Detalhes
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
