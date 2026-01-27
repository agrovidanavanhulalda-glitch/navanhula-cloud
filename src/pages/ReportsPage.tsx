import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatNumber, formatDate, getPaymentMethodLabel } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Download,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar,
} from 'lucide-react';
import type { Store } from '@/types/pos';

interface SaleReport {
  date: string;
  total_sales: number;
  total_revenue: number;
  total_profit: number;
}

const ReportsPage: React.FC = () => {
  const { store: currentStore, role } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    avgTicket: 0,
  });
  const [salesByPayment, setSalesByPayment] = useState<{ method: string; total: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number; revenue: number }[]>([]);
  const [salesByUser, setSalesByUser] = useState<{ name: string; sales: number; revenue: number }[]>([]);

  useEffect(() => {
    if (role === 'admin') {
      supabase.from('stores').select('*').then(({ data }) => {
        setStores(data as Store[] || []);
      });
    }
  }, [role]);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);

      try {
        let query = supabase
          .from('sales')
          .select(`
            *,
            sale_items(product_name, quantity, total, profit),
            profiles:user_id(full_name)
          `)
          .eq('status', 'completed')
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo + 'T23:59:59');

        if (selectedStore !== 'all') {
          query = query.eq('store_id', selectedStore);
        } else if (role !== 'admin' && currentStore) {
          query = query.eq('store_id', currentStore.id);
        }

        const { data: sales } = await query;

        if (!sales) {
          setLoading(false);
          return;
        }

        // Calculate summary
        const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
        const totalProfit = sales.reduce((sum, s) => {
          return sum + s.sale_items?.reduce((p: number, i: any) => p + Number(i.profit), 0) || 0;
        }, 0);

        setSummary({
          totalSales: sales.length,
          totalRevenue,
          totalProfit,
          avgTicket: sales.length > 0 ? totalRevenue / sales.length : 0,
        });

        // Sales by payment method
        const byPayment = sales.reduce((acc, s) => {
          const method = s.payment_method;
          if (!acc[method]) acc[method] = 0;
          acc[method] += Number(s.total);
          return acc;
        }, {} as Record<string, number>);

        setSalesByPayment(
          Object.entries(byPayment).map(([method, total]) => ({ method, total }))
        );

        // Top products
        const productMap: Record<string, { quantity: number; revenue: number }> = {};
        sales.forEach(sale => {
          sale.sale_items?.forEach((item: any) => {
            if (!productMap[item.product_name]) {
              productMap[item.product_name] = { quantity: 0, revenue: 0 };
            }
            productMap[item.product_name].quantity += item.quantity;
            productMap[item.product_name].revenue += Number(item.total);
          });
        });

        setTopProducts(
          Object.entries(productMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)
        );

        // Sales by user
        const userMap: Record<string, { sales: number; revenue: number }> = {};
        sales.forEach(sale => {
          const name = (sale.profiles as any)?.full_name || 'Desconhecido';
          if (!userMap[name]) {
            userMap[name] = { sales: 0, revenue: 0 };
          }
          userMap[name].sales += 1;
          userMap[name].revenue += Number(sale.total);
        });

        setSalesByUser(
          Object.entries(userMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
        );

      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [selectedStore, dateFrom, dateTo, currentStore, role]);

  const StatCard = ({ icon: Icon, label, value, subValue, color }: any) => (
    <div className="pos-card">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="pos-stat-label">{label}</p>
          <p className="pos-stat-value pos-money">{value}</p>
          {subValue && <p className="text-sm text-muted-foreground">{subValue}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise de vendas e desempenho
          </p>
        </div>
        <Button className="pos-button-secondary">
          <Download className="w-5 h-5 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Filters */}
      <div className="pos-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="pos-input w-40"
            />
            <span className="text-muted-foreground">até</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="pos-input w-40"
            />
          </div>

          {role === 'admin' && (
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="pos-input w-48">
                <SelectValue placeholder="Todas as lojas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Lojas</SelectItem>
                {stores.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ShoppingCart}
          label="Total de Vendas"
          value={formatNumber(summary.totalSales)}
          color="bg-primary/20 text-primary"
        />
        <StatCard
          icon={DollarSign}
          label="Receita Total"
          value={formatCurrency(summary.totalRevenue)}
          color="bg-success/20 text-success"
        />
        <StatCard
          icon={TrendingUp}
          label="Lucro Total"
          value={formatCurrency(summary.totalProfit)}
          subValue={`Margem: ${summary.totalRevenue > 0 ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1) : 0}%`}
          color="bg-profit/20 text-profit"
        />
        <StatCard
          icon={FileText}
          label="Ticket Médio"
          value={formatCurrency(summary.avgTicket)}
          color="bg-accent/20 text-accent"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Payment */}
        <div className="pos-card">
          <h3 className="font-semibold mb-4">Vendas por Forma de Pagamento</h3>
          <div className="space-y-3">
            {salesByPayment.map(({ method, total }) => (
              <div key={method} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{getPaymentMethodLabel(method)}</span>
                    <span className="text-sm pos-money">{formatCurrency(total)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(total / summary.totalRevenue) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {((total / summary.totalRevenue) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sales by User */}
        <div className="pos-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Vendas por Vendedor
          </h3>
          <div className="space-y-3">
            {salesByUser.map(({ name, sales, revenue }) => (
              <div key={name} className="pos-cart-item">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{name}</p>
                  <p className="text-xs text-muted-foreground">{sales} vendas</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold pos-money">{formatCurrency(revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="pos-card lg:col-span-2">
          <h3 className="font-semibold mb-4">Top 10 Produtos Mais Vendidos</h3>
          <div className="overflow-x-auto">
            <table className="pos-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Produto</th>
                  <th className="text-right">Quantidade</th>
                  <th className="text-right">Receita</th>
                  <th className="text-right">% do Total</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, i) => (
                  <tr key={product.name}>
                    <td className="font-semibold text-primary">{i + 1}</td>
                    <td className="font-medium">{product.name}</td>
                    <td className="text-right">{formatNumber(product.quantity)}</td>
                    <td className="text-right pos-money">{formatCurrency(product.revenue)}</td>
                    <td className="text-right text-muted-foreground">
                      {((product.revenue / summary.totalRevenue) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
