import React, { useState, useMemo } from 'react';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { useAuth } from '@/contexts/AuthContext';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  Eye,
  XCircle,
  AlertTriangle,
  Package
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import PDFReportPreview, { exportPDFReport, exportExcelReport } from '@/components/reports/PDFReport';

// Relatórios profissionais com templates separados

const LocalReportsPage: React.FC = () => {
  const { sales, stores, currentStore, products, getCancelledSales, getCancellationHistory } = useLocalPOS();
  const { role, company } = useAuth();
  const targetCompanyId = (company as any)?.id;

  // Check admin access
  const isAdmin = role === 'admin' || role === 'manager';

  // Filters
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showPDFPreview, setShowPDFPreview] = useState(false);

  // Filtered sales (completed only)
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

  // Cancelled sales
  const cancelledSales = useMemo(() => {
    return getCancelledSales().filter(sale => {
      const saleDate = new Date(sale.createdAt);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      if (saleDate < start || saleDate > end) return false;
      if (selectedStore !== 'all' && sale.storeId !== selectedStore) return false;
      return true;
    });
  }, [getCancelledSales, selectedStore, startDate, endDate]);

  const cancellationHistory = getCancellationHistory();

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
    const cancelledTotal = cancelledSales.reduce((acc, s) => acc + s.total, 0);

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
    const bySeller: Record<string, { count: number; total: number; name: string; avgTicket: number }> = {};
    filteredSales.forEach(sale => {
      const sellerId = sale.sellerId || 'unknown';
      const sellerName = sale.sellerName || 'Operador';
      if (!bySeller[sellerId]) {
        bySeller[sellerId] = { count: 0, total: 0, name: sellerName, avgTicket: 0 };
      }
      bySeller[sellerId].count++;
      bySeller[sellerId].total += sale.total;
    });
    // Calculate average ticket per seller
    Object.values(bySeller).forEach(seller => {
      seller.avgTicket = seller.count > 0 ? seller.total / seller.count : 0;
    });

    // Top products
    const productSales: Record<string, { name: string; qty: number; total: number; profit: number }> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const pid = item.product.id;
        if (!productSales[pid]) {
          productSales[pid] = { name: item.product.name, qty: 0, total: 0, profit: 0 };
        }
        productSales[pid].qty += item.quantity;
        productSales[pid].total += item.total;
        productSales[pid].profit += (item.product.salePrice - item.product.costPrice) * item.quantity;
      });
    });
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Product margins
    const productMargins = products.map(p => ({
      id: p.id,
      name: p.name,
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      margin: p.salePrice - p.costPrice,
      marginPercent: p.costPrice > 0 ? ((p.salePrice - p.costPrice) / p.costPrice) * 100 : 0,
      stock: p.stock,
    })).sort((a, b) => b.marginPercent - a.marginPercent);

    return {
      totalRevenue,
      totalDiscount,
      totalProfit,
      averageTicket,
      salesCount: filteredSales.length,
      cancelledCount: cancelledSales.length,
      cancelledTotal,
      byPaymentMethod,
      byStore,
      bySeller,
      topProducts,
      productMargins,
    };
  }, [filteredSales, cancelledSales, stores, products]);

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
      companyName: 'NAVANHULA CLOUD',
    });
  };

  const handleExportPDF = () => {
    exportPDFReport({
      sales,
      stores,
      startDate,
      endDate,
      selectedStore,
      companyName: 'NAVANHULA CLOUD',
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-warning" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Apenas administradores podem acessar os relatórios completos.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance
          </h1>
          <p className="text-muted-foreground">
            Dados filtrados por período
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
            <Label htmlFor="store-filter">Loja</Label>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger id="store-filter" className="w-48">
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { icon: ShoppingCart, label: 'Vendas', value: String(stats.salesCount), accent: 'primary' },
          { icon: DollarSign, label: 'Receita', value: formatCurrency(stats.totalRevenue), accent: 'success' },
          { icon: TrendingUp, label: 'Lucro', value: formatCurrency(stats.totalProfit), accent: 'profit' },
          { icon: BarChart3, label: 'Ticket Médio', value: formatCurrency(stats.averageTicket), accent: 'accent' },
          { icon: Calendar, label: 'Descontos', value: formatCurrency(stats.totalDiscount), accent: 'warning' },
          { icon: XCircle, label: 'Canceladas', value: String(stats.cancelledCount), accent: 'destructive' },
        ].map((stat, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-${stat.accent}/10`}>
                <stat.icon className={`w-5 h-5 text-${stat.accent}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className={`text-lg font-semibold truncate text-${stat.accent}`}>{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs for different report views */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Geral</TabsTrigger>
          <TabsTrigger value="sellers">Vendedores</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="margins">Margens</TabsTrigger>
          <TabsTrigger value="cancellations">Cancelamentos</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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

            {/* Top Products */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Top 5 Produtos
              </h3>
              <div className="space-y-3">
                {stats.topProducts.slice(0, 5).map((product, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant={i < 3 ? 'default' : 'secondary'} className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                        {i + 1}
                      </Badge>
                      <p className="font-medium truncate">{product.name}</p>
                    </div>
                    <p className="font-bold">{product.qty}</p>
                  </div>
                ))}
                {stats.topProducts.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">Sem dados</p>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Sellers Tab */}
        <TabsContent value="sellers">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Desempenho por Vendedor
            </h3>
            {Object.keys(stats.bySeller).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Sem dados para o período selecionado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Vendedor</th>
                      <th className="text-right p-3 font-medium">Vendas</th>
                      <th className="text-right p-3 font-medium">Total</th>
                      <th className="text-right p-3 font-medium">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.values(stats.bySeller)
                      .sort((a, b) => b.total - a.total)
                      .map((seller, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="p-3 font-medium">{seller.name}</td>
                          <td className="p-3 text-right">{seller.count}</td>
                          <td className="p-3 text-right font-bold">{formatCurrency(seller.total)}</td>
                          <td className="p-3 text-right">{formatCurrency(seller.avgTicket)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Produtos Mais Vendidos
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
                      <th className="text-right p-3 font-medium">Receita</th>
                      <th className="text-right p-3 font-medium">Lucro</th>
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
                        <td className="p-3 text-right text-profit">{formatCurrency(product.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Margins Tab */}
        <TabsContent value="margins">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Margem por Produto
            </h3>
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Produto</th>
                    <th className="text-right p-3 font-medium">Preço Compra</th>
                    <th className="text-right p-3 font-medium">Preço Venda</th>
                    <th className="text-right p-3 font-medium">Margem</th>
                    <th className="text-right p-3 font-medium">% Margem</th>
                    <th className="text-right p-3 font-medium">Estoque</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.productMargins.map((product, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="p-3 font-medium">{product.name}</td>
                      <td className="p-3 text-right">{formatCurrency(product.costPrice)}</td>
                      <td className="p-3 text-right">{formatCurrency(product.salePrice)}</td>
                      <td className="p-3 text-right text-profit">{formatCurrency(product.margin)}</td>
                      <td className="p-3 text-right">
                        <Badge variant={product.marginPercent > 30 ? 'default' : 'secondary'}>
                          {product.marginPercent.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className={`p-3 text-right ${product.stock < 10 ? 'text-destructive' : ''}`}>
                        {product.stock}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Cancellations Tab */}
        <TabsContent value="cancellations">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Histórico de Cancelamentos
            </h3>
            
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm text-muted-foreground">Total Cancelado</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(stats.cancelledTotal)}</p>
              </div>
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm text-muted-foreground">Vendas Canceladas</p>
                <p className="text-2xl font-bold text-destructive">{stats.cancelledCount}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Taxa de Cancelamento</p>
                <p className="text-2xl font-bold">
                  {stats.salesCount + stats.cancelledCount > 0 
                    ? ((stats.cancelledCount / (stats.salesCount + stats.cancelledCount)) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>

            {cancelledSales.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum cancelamento no período</p>
            ) : (
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Código</th>
                      <th className="text-left p-3 font-medium">Data Venda</th>
                      <th className="text-left p-3 font-medium">Cancelado Por</th>
                      <th className="text-left p-3 font-medium">Motivo</th>
                      <th className="text-right p-3 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cancelledSales.map((sale, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="p-3 font-mono text-sm">#{sale.id.slice(-6).toUpperCase()}</td>
                        <td className="p-3">{new Date(sale.createdAt).toLocaleString('pt-MZ')}</td>
                        <td className="p-3">{sale.cancelledByName || 'N/A'}</td>
                        <td className="p-3 text-sm max-w-xs truncate">{sale.cancellationReason || 'N/A'}</td>
                        <td className="p-3 text-right font-bold text-destructive">{formatCurrency(sale.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* PDF Preview Modal */}
      {showPDFPreview && (
        <PDFReportPreview
          sales={sales}
          stores={stores}
          startDate={startDate}
          endDate={endDate}
          selectedStore={selectedStore}
          companyName="NAVANHULA CLOUD"
          onClose={() => setShowPDFPreview(false)}
        />
      )}
    </div>
  );
};

export default LocalReportsPage;
