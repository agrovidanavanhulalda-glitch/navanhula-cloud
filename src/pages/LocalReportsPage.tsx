import React, { useState, useMemo } from 'react';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart3, 
  Calendar,
  Store,
  Users,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  FileSpreadsheet,
  FileText,
  Eye
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import PDFReportPreview, { exportPDFReport, exportExcelReport } from '@/components/reports/PDFReport';

// 100% LOCAL - Relatórios profissionais com templates separados

const LocalReportsPage: React.FC = () => {
  const { sales, stores, currentStore } = useLocalPOS();

  // Filters
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showPDFPreview, setShowPDFPreview] = useState(false);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      if (saleDate < start || saleDate > end) return false;
      if (selectedStore !== 'all' && sale.storeId !== selectedStore) return false;
      return sale.status === 'completed';
    });
  }, [sales, selectedStore, startDate, endDate]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const totalDiscount = filteredSales.reduce((acc, s) => acc + s.discount, 0);
    const totalProfit = filteredSales.reduce((acc, sale) => {
      return acc + sale.items.reduce((itemAcc, item) => {
        return itemAcc + (item.product.salePrice - item.product.costPrice) * item.quantity;
      }, 0);
    }, 0);
    const averageTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

    // By payment method
    const byPaymentMethod: Record<string, { count: number; total: number }> = {};
    filteredSales.forEach(sale => {
      const method = sale.paymentMethod || 'cash';
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = { count: 0, total: 0 };
      }
      byPaymentMethod[method].count++;
      byPaymentMethod[method].total += sale.total;
    });

    // By store
    const byStore: Record<string, { count: number; total: number; name: string }> = {};
    filteredSales.forEach(sale => {
      const store = stores.find(s => s.id === sale.storeId);
      const storeName = store?.name || 'Loja Principal';
      if (!byStore[sale.storeId]) {
        byStore[sale.storeId] = { count: 0, total: 0, name: storeName };
      }
      byStore[sale.storeId].count++;
      byStore[sale.storeId].total += sale.total;
    });

    // By seller
    const bySeller: Record<string, { count: number; total: number; name: string }> = {};
    filteredSales.forEach(sale => {
      const sellerId = sale.sellerId || 'unknown';
      const sellerName = sale.sellerName || 'Operador';
      if (!bySeller[sellerId]) {
        bySeller[sellerId] = { count: 0, total: 0, name: sellerName };
      }
      bySeller[sellerId].count++;
      bySeller[sellerId].total += sale.total;
    });

    // Top products
    const productSales: Record<string, { name: string; qty: number; total: number }> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const pid = item.product.id;
        if (!productSales[pid]) {
          productSales[pid] = { name: item.product.name, qty: 0, total: 0 };
        }
        productSales[pid].qty += item.quantity;
        productSales[pid].total += item.total;
      });
    });
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return {
      totalRevenue,
      totalDiscount,
      totalProfit,
      averageTicket,
      salesCount: filteredSales.length,
      byPaymentMethod,
      byStore,
      bySeller,
      topProducts,
    };
  }, [filteredSales, stores]);

  // Payment method label - human readable
  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Dinheiro';
      case 'card': return 'Cartão';
      case 'mpesa': return 'M-Pesa';
      case 'emola': return 'E-Mola';
      default: return 'Outro';
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    exportExcelReport({
      sales,
      stores,
      startDate,
      endDate,
      selectedStore,
      companyName: 'NAVANHULA POS',
    });
  };

  const handleExportPDF = () => {
    exportPDFReport({
      sales,
      stores,
      startDate,
      endDate,
      selectedStore,
      companyName: 'NAVANHULA POS',
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Relatórios
          </h1>
          <p className="text-muted-foreground">
            Análise de vendas e desempenho
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPDFPreview(true)}>
            <Eye className="w-4 h-4 mr-2" />
            Visualizar
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button onClick={handleExportPDF}>
            <FileText className="w-4 h-4 mr-2" />
            Relatório
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label>Loja</Label>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Lojas</SelectItem>
                {stores.map(store => (
                  <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>

          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vendas</p>
              <p className="text-2xl font-bold">{stats.salesCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receita</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lucro</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalProfit)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.averageTicket)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Descontos</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalDiscount)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Payment Method */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Por Forma de Pagamento
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byPaymentMethod).map(([method, data]) => (
              <div key={method} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">{getPaymentLabel(method)}</p>
                  <p className="text-sm text-muted-foreground">{data.count} vendas</p>
                </div>
                <p className="font-bold">{formatCurrency(data.total)}</p>
              </div>
            ))}
            {Object.keys(stats.byPaymentMethod).length === 0 && (
              <p className="text-muted-foreground text-center py-4">Sem dados</p>
            )}
          </div>
        </Card>

        {/* By Store */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Store className="w-5 h-5" />
            Por Loja
          </h3>
          <div className="space-y-3">
            {Object.values(stats.byStore).map((store, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">{store.name}</p>
                  <p className="text-sm text-muted-foreground">{store.count} vendas</p>
                </div>
                <p className="font-bold">{formatCurrency(store.total)}</p>
              </div>
            ))}
            {Object.keys(stats.byStore).length === 0 && (
              <p className="text-muted-foreground text-center py-4">Sem dados</p>
            )}
          </div>
        </Card>

        {/* By Seller */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Por Vendedor
          </h3>
          <div className="space-y-3">
            {Object.values(stats.bySeller).map((seller, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">{seller.name}</p>
                  <p className="text-sm text-muted-foreground">{seller.count} vendas</p>
                </div>
                <p className="font-bold">{formatCurrency(seller.total)}</p>
              </div>
            ))}
            {Object.keys(stats.bySeller).length === 0 && (
              <p className="text-muted-foreground text-center py-4">Sem dados</p>
            )}
          </div>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="p-6 mt-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Top 10 Produtos Mais Vendidos
        </h3>
        {stats.topProducts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Sem dados para o período selecionado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">#</th>
                  <th className="text-left p-3 font-medium">Produto</th>
                  <th className="text-right p-3 font-medium">Quantidade</th>
                  <th className="text-right p-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.topProducts.map((product, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="p-3">
                      <Badge variant={i < 3 ? 'default' : 'secondary'}>{i + 1}</Badge>
                    </td>
                    <td className="p-3 font-medium">{product.name}</td>
                    <td className="p-3 text-right">{product.qty}</td>
                    <td className="p-3 text-right font-bold">{formatCurrency(product.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* PDF Preview Modal */}
      {showPDFPreview && (
        <PDFReportPreview
          sales={sales}
          stores={stores}
          startDate={startDate}
          endDate={endDate}
          selectedStore={selectedStore}
          companyName="NAVANHULA POS"
          onClose={() => setShowPDFPreview(false)}
        />
      )}
    </div>
  );
};

export default LocalReportsPage;
