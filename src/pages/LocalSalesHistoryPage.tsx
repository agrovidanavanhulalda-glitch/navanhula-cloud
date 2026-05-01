import React, { useState, useMemo } from 'react';
import { useLocalPOS, LocalSale } from '@/contexts/LocalPOSContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ShoppingCart,
  Search,
  XCircle,
  CheckCircle,
  Clock,
  Eye,
  Receipt,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { UI_LABELS } from '@/lib/uiLabels';
import ThermalReceipt from '@/components/reports/ThermalReceipt';
import CancelSaleDialog from '@/components/pos/CancelSaleDialog';
import { toast } from 'sonner';
import { SkeletonList } from '@/components/ui/skeleton-card';
import PageTransition from '@/components/layout/PageTransition';

/**
 * Sales History Page with Admin Cancellation
 */
const LocalSalesHistoryPage: React.FC = () => {
  const { sales, stores, currentStore, cancelCompletedSale, currentCashRegister, loading } = useLocalPOS();
  const { role, user, company } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [selectedSale, setSelectedSale] = useState<LocalSale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const isAdmin = role === 'admin' || role === 'manager';

  // Filter sales
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // Status filter
      if (statusFilter !== 'all' && sale.status !== statusFilter) {
        return false;
      }

      // Date filter
      const saleDate = new Date(sale.createdAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dateFilter === 'today') {
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        if (saleDate < today || saleDate > todayEnd) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (saleDate < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        if (saleDate < monthAgo) return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchId = sale.id.toLowerCase().includes(searchLower);
        const matchSeller = sale.sellerName?.toLowerCase().includes(searchLower);
        const matchItems = sale.items.some(i => i.product.name.toLowerCase().includes(searchLower));
        if (!matchId && !matchSeller && !matchItems) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sales, statusFilter, dateFilter, searchTerm]);

  // Handle cancellation
  const handleCancelSale = (reason: string) => {
    if (!selectedSale) return;

    const sellerId = currentCashRegister?.sellerId || user?.id || 'admin';
    const sellerName = currentCashRegister?.sellerName || user?.full_name || 'Administrador';

    const success = cancelCompletedSale(
      selectedSale.id,
      reason,
      sellerId,
      sellerName
    );

    if (success) {
      setShowCancelDialog(false);
      setSelectedSale(null);
    }
  };

  // View receipt
  const handleViewReceipt = (sale: LocalSale) => {
    setSelectedSale(sale);
    setShowReceipt(true);
  };

  // Open cancel dialog
  const handleOpenCancelDialog = (sale: LocalSale) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem cancelar vendas');
      return;
    }
    if (sale.status === 'cancelled') {
      toast.error('Esta venda já foi cancelada');
      return;
    }
    setSelectedSale(sale);
    setShowCancelDialog(true);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-success/20 text-success border-success/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluída
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive" className="bg-destructive/20 border-destructive/30">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelada
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  // Get payment label
  const getPaymentLabel = (method?: string) => {
    return UI_LABELS.payment[method || ''] || 'N/A';
  };

  // Calculate profit for a sale
  const getSaleProfit = (sale: LocalSale) => {
    // Use pre-calculated profit from DB when available
    if (sale.profit != null) return sale.profit;
    return sale.items.reduce((acc, item) => {
      return acc + (item.product.salePrice - item.product.costPrice) * item.quantity - item.discount;
    }, 0);
  };

  // Calculate cost total for a sale
  const getSaleCost = (sale: LocalSale) => {
    if (sale.costTotal != null) return sale.costTotal;
    return sale.items.reduce((acc, item) => acc + item.product.costPrice * item.quantity, 0);
  };

  // Calculate margin %
  const getSaleMargin = (sale: LocalSale) => {
    if (sale.total === 0) return 0;
    return (getSaleProfit(sale) / sale.total) * 100;
  };

  return (
    <PageTransition>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Histórico de Vendas
            </h1>
            <p className="text-muted-foreground">
              {filteredSales.length} vendas encontradas
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, vendedor ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Concluídas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última Semana</SelectItem>
                <SelectItem value="month">Último Mês</SelectItem>
                <SelectItem value="all">Todo Período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Sales List */}
        {loading ? (
          <div className="space-y-4">
            <SkeletonList rows={5} />
            <SkeletonList rows={5} />
          </div>
        ) : filteredSales.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma venda encontrada</h3>
            <p className="text-muted-foreground">
              Ajuste os filtros ou faça uma nova venda
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSales.map((sale) => (
              <Card 
                key={sale.id} 
                className={`p-4 ${sale.status === 'cancelled' ? 'opacity-70 bg-destructive/5' : ''}`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Sale Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold">
                          #{sale.id.slice(-6).toUpperCase()}
                        </span>
                        {getStatusBadge(sale.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleString('pt-MZ')}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Vendedor:</span>{' '}
                        <span className="font-medium">{sale.sellerName || 'N/A'}</span>
                      </p>
                      {sale.status === 'cancelled' && sale.cancellationReason && (
                        <p className="text-sm text-destructive mt-1">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          {sale.cancellationReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Center: Items Summary */}
                  <div className="flex-1 px-4">
                    <p className="text-sm text-muted-foreground mb-1">
                      {sale.items.length > 0 
                        ? `${sale.items.reduce((acc, i) => acc + i.quantity, 0)} itens` 
                        : `${formatCurrency(sale.total)}`}
                    </p>
                    <p className="text-sm truncate">
                      {sale.items.length > 0 
                        ? sale.items.slice(0, 3).map(i => i.product.name).join(', ') + (sale.items.length > 3 ? '...' : '')
                        : 'Venda registada'}
                    </p>
                  </div>

                  {/* Right: Total and Actions */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-xl font-bold ${sale.status === 'cancelled' ? 'line-through text-muted-foreground' : 'text-primary'}`}>
                        {formatCurrency(sale.total)}
                      </p>
                      {sale.status === 'completed' && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">
                            Custo: {formatCurrency(getSaleCost(sale))}
                          </p>
                          <p className={`text-xs font-medium ${getSaleProfit(sale) >= 0 ? 'text-profit' : 'text-loss'}`}>
                            Lucro: {formatCurrency(getSaleProfit(sale))}
                          </p>
                          <p className={`text-xs font-medium ${getSaleMargin(sale) >= 0 ? 'text-profit' : 'text-loss'}`}>
                            Margem: {getSaleMargin(sale).toFixed(1)}%
                          </p>
                        </div>
                      )}
                      <Badge variant="outline" className="text-xs mt-1">
                        {getPaymentLabel(sale.paymentMethod)}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReceipt(sale)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      
                      {isAdmin && sale.status === 'completed' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleOpenCancelDialog(sale)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Receipt Modal */}
        {showReceipt && selectedSale && (
          <ThermalReceipt
            sale={selectedSale}
            storeName={currentStore.name}
            storeAddress={currentStore.address}
            storePhone={currentStore.phone}
            storeNuit={company?.nif || ''}
            fiscalRegime={(company as any)?.fiscal_regime || ''}
            companyName={company?.name || ''}
            onClose={() => {
              setShowReceipt(false);
              setSelectedSale(null);
            }}
          />
        )}

        {/* Cancel Dialog */}
        {showCancelDialog && selectedSale && (
          <CancelSaleDialog
            sale={selectedSale}
            onConfirm={handleCancelSale}
            onCancel={() => {
              setShowCancelDialog(false);
              setSelectedSale(null);
            }}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default LocalSalesHistoryPage;
