import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { syncManager } from '@/lib/syncQueue';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Package,
  Download
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import PDFReportPreview, { exportPDFReport, exportExcelReport, exportLogsPDF, exportLogsExcel } from '@/components/reports/PDFReport';

// Relatórios profissionais com templates separados

const LocalReportsPage: React.FC = () => {
  const { sales, stores, currentStore, products, getCancelledSales, getCancellationHistory } = useLocalPOS();
  const { activeMembers: sellersRaw } = useTeamMembers({ permission: 'sales.create' });
  const sellers = useMemo(
    () => sellersRaw.map((m) => ({ id: m.id, name: m.name, email: m.email || '' })),
    [sellersRaw]
  );
  const { role, company } = useAuth();
  const { toast } = useToast();
  const targetCompanyId = (company as any)?.id;

  // Check admin access
  const isAdmin = role === 'admin' || role === 'manager';

  // Filters
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [autoExport, setAutoExport] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    pdf: { status: 'idle' | 'generating' | 'downloading' | 'completed' | 'error'; progress: number; error?: string };
    xlsx: { status: 'idle' | 'generating' | 'downloading' | 'completed' | 'error'; progress: number; error?: string };
  }>({ 
    pdf: { status: 'idle', progress: 0 }, 
    xlsx: { status: 'idle', progress: 0 } 
  });


  const [exportHistory, setExportHistory] = useState<{
    id: string;
    timestamp: Date;
    type: 'PDF' | 'XLSX';
    filters: { store: string; seller: string; start: string; end: string };
    status: 'success' | 'error';
    syncStatus: 'pending' | 'syncing' | 'completed';
    error?: string;
    attempts?: { id: string; timestamp: Date; status: string; error_message?: string; retry_count: number }[];
  }[]>([]);
  const [selectedSyncFilter, setSelectedSyncFilter] = useState<'all' | 'pending' | 'syncing' | 'completed'>('all');
  const [syncFilterError, setSyncFilterError] = useState<string | null>(null);
  const [showSyncError, setShowSyncError] = useState(false);
  const isInitialMount = useRef(true);

  // Validação em tempo real do filtro de status
  useEffect(() => {
    if (!selectedSyncFilter || selectedSyncFilter === 'all') {
      setSyncFilterError("Selecione um status válido: Pendente, Sincronizando, Sincronizado");
    } else {
      setSyncFilterError(null);
      setShowSyncError(false);
    }
  }, [selectedSyncFilter]);


  // Fetch history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('export_history')
        .select('*, export_attempts_logs(*)')
        .order('timestamp', { ascending: false })
        .limit(20);
      
      const pendingTasks = syncManager.getTasksByType('EXPORT_HISTORY');
      const pendingHistory = pendingTasks.map(task => ({
        id: task.payload.id || task.id,
        timestamp: new Date(task.payload.timestamp),
        type: task.payload.type as 'PDF' | 'XLSX',
        filters: task.payload.filters as any,
        status: task.payload.status as 'success' | 'error',
        syncStatus: (syncManager.getQueueStatus().isProcessing ? 'syncing' : 'pending') as 'syncing' | 'pending',
        error: task.payload.error_message || undefined
      }));

      if (!error && data) {
        const remoteHistory = data.map(item => ({
          id: item.id,
          timestamp: new Date(item.timestamp),
          type: item.type as 'PDF' | 'XLSX',
          filters: item.filters as any,
          status: item.status as 'success' | 'error',
          syncStatus: 'completed' as const,
          error: item.error_message || undefined,
          attempts: (item.export_attempts_logs || []).map((log: any) => ({
            id: log.id,
            timestamp: new Date(log.timestamp),
            status: log.status,
            error_message: log.error_message,
            retry_count: log.retry_count
          })).sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime())
        }));

        // Merge and avoid duplicates
        const combined: typeof exportHistory = [...pendingHistory];
        remoteHistory.forEach(remote => {
          if (!combined.find(p => p.id === remote.id)) {
            combined.push(remote);
          }
        });

        setExportHistory(combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 20));
      } else if (pendingHistory.length > 0) {
        setExportHistory(pendingHistory);
      }
    };

    if (isAdmin) {
      fetchHistory();
    }
  }, [isAdmin]);

  // Sync Status Listener
  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribe = syncManager.subscribe((event, task) => {
      if (task.type !== 'EXPORT_HISTORY') return;

      const taskId = task.payload.id || task.id;

      setExportHistory(prev => prev.map(item => {
        if (item.id === taskId) {
          if (event === 'started') return { ...item, syncStatus: 'syncing' as const };
          if (event === 'completed') return { ...item, syncStatus: 'completed' as const };
          if (event === 'failed') return { ...item, syncStatus: 'pending' as const };
        }
        return item;
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [isAdmin]);

  const saveToHistory = async (type: 'PDF' | 'XLSX', status: 'success' | 'error', filters: any, errorMsg?: string) => {
    const sessionPromise = supabase.auth?.getSession?.();
    const sessionRes = sessionPromise ? await Promise.resolve(sessionPromise).catch(() => null) : null;
    const user = sessionRes?.data?.session?.user;
    if (!user || !targetCompanyId) return;



    const entry = {
      id: crypto.randomUUID(), // Local ID
      user_id: user.id,
      company_id: targetCompanyId,
      type,
      status,
      filters,
      error_message: errorMsg,
      timestamp: new Date().toISOString()
    };

    // Optimistic UI update
    setExportHistory(prev => [{
      id: entry.id,
      timestamp: new Date(entry.timestamp),
      type: entry.type as 'PDF' | 'XLSX',
      filters: entry.filters as any,
      status: entry.status as 'success' | 'error',
      syncStatus: (navigator.onLine ? 'syncing' : 'pending') as 'syncing' | 'pending',
      error: entry.error_message || undefined
    }, ...prev].slice(0, 20));

    if (!navigator.onLine) {
      console.log('[Reports] Offline: Queueing export history task');
      await syncManager.addTask('EXPORT_HISTORY', entry);
      return;
    }

    try {
      const { error } = await supabase
        .from('export_history')
        .insert(entry);

      if (error) throw error;
      
      // Update status to completed on success
      setExportHistory(prev => prev.map(item => 
        item.id === entry.id ? { ...item, syncStatus: 'completed' } : item
      ));
    } catch (err) {
      console.error('[Reports] Error saving to history, queueing task', err);
      // Item already in list as 'pending' or 'syncing' from optimistic update
      await syncManager.addTask('EXPORT_HISTORY', entry);
    }
  };


  // Filtered sales (completed only)

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      if (saleDate < start || saleDate > end) return false;
      if (selectedStore !== 'all' && sale.storeId !== selectedStore) return false;
      if (selectedSeller !== 'all' && sale.sellerId !== selectedSeller) return false;
      return sale.status === 'completed';
    });
  }, [sales, selectedStore, selectedSeller, startDate, endDate]);

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
  const handleExportExcel = async () => {
    const filterSnapshot = { store: selectedStore, seller: selectedSeller, start: startDate, end: endDate };
    
    try {
      setExportStatus(prev => ({ ...prev, xlsx: { status: 'generating', progress: 0 } }));
      
      await exportExcelReport({
        sales,
        stores,
        startDate,
        endDate,
        selectedStore,
        selectedSeller,
        companyName: 'NAVANHULA CLOUD',
        onProgress: (progress) => {
          setExportStatus(prev => ({ 
            ...prev, 
            xlsx: { 
              status: progress < 100 ? 'generating' : 'downloading', 
              progress 
            } 
          }));
        }
      });

      setExportStatus(prev => ({ ...prev, xlsx: { status: 'completed', progress: 100 } }));
      await saveToHistory('XLSX', 'success', filterSnapshot);

      setTimeout(() => {
        setExportStatus(prev => ({ ...prev, xlsx: { ...prev.xlsx, status: 'idle' } }));
      }, 2000);
    } catch (error: any) {
      console.error('Excel Export Error:', error);
      const errorMessage = 'Falha ao gerar arquivo Excel';
      setExportStatus(prev => ({ 
        ...prev, 
        xlsx: { status: 'error', progress: 0, error: errorMessage } 
      }));
      await saveToHistory('XLSX', 'error', filterSnapshot, error.message || errorMessage);
    }
  };

  const handleExportPDF = async () => {
    const filterSnapshot = { store: selectedStore, seller: selectedSeller, start: startDate, end: endDate };

    try {
      setExportStatus(prev => ({ ...prev, pdf: { status: 'generating', progress: 0 } }));


      await exportPDFReport({
        sales,
        stores,
        startDate,
        endDate,
        selectedStore,
        selectedSeller,
        companyName: 'NAVANHULA CLOUD',
        onProgress: (progress) => {
          setExportStatus(prev => ({ 
            ...prev, 
            pdf: { 
              status: progress < 100 ? 'generating' : 'downloading', 
              progress 
            } 
          }));
        }
      });

      setExportStatus(prev => ({ ...prev, pdf: { status: 'completed', progress: 100 } }));
      await saveToHistory('PDF', 'success', filterSnapshot);

      setTimeout(() => {
        setExportStatus(prev => ({ ...prev, pdf: { ...prev.pdf, status: 'idle' } }));
      }, 2000);
    } catch (error: any) {
      console.error('PDF Export Error:', error);
      const errorMessage = 'Falha ao gerar relatório PDF';
      setExportStatus(prev => ({ 
        ...prev, 
        pdf: { status: 'error', progress: 0, error: errorMessage } 
      }));
      await saveToHistory('PDF', 'error', filterSnapshot, error.message || errorMessage);
    }
  };





  // Auto-export logic
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (autoExport) {
      const timer = setTimeout(() => {
        handleExportExcel();
        handleExportPDF();
      }, 1000); // 1 second debounce to allow multiple filter changes

      return () => clearTimeout(timer);
    }
  }, [selectedStore, selectedSeller, startDate, endDate, autoExport]);

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
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPDFPreview(true)}>
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
            <Button 
              variant={exportStatus.xlsx.status === 'error' ? 'destructive' : 'outline'} 
              onClick={handleExportExcel}
              disabled={exportStatus.xlsx.status !== 'idle' && exportStatus.xlsx.status !== 'error'}
            >

              <FileSpreadsheet className="w-4 h-4 mr-2" />
              {exportStatus.xlsx.status === 'idle' ? 'Excel' : 
               exportStatus.xlsx.status === 'generating' ? `Gerando ${exportStatus.xlsx.progress}%` :
               exportStatus.xlsx.status === 'downloading' ? 'Baixando...' : 
               exportStatus.xlsx.status === 'error' ? 'Tentar novamente' : 'Concluído'}
            </Button>
            <Button 
              onClick={handleExportPDF}
              disabled={exportStatus.pdf.status !== 'idle' && exportStatus.pdf.status !== 'error'}
              variant={exportStatus.pdf.status === 'error' ? 'destructive' : 'default'}
            >
              <FileText className="w-4 h-4 mr-2" />
              {exportStatus.pdf.status === 'idle' ? 'Relatório' : 
               exportStatus.pdf.status === 'generating' ? `Gerando ${exportStatus.pdf.progress}%` :
               exportStatus.pdf.status === 'downloading' ? 'Baixando...' : 
               exportStatus.pdf.status === 'error' ? 'Tentar novamente' : 'Concluído'}
            </Button>
          </div>
          {(exportStatus.pdf.status !== 'idle' || exportStatus.xlsx.status !== 'idle') && (
            <div className="text-[10px] text-muted-foreground flex flex-col items-end gap-1">
              {exportStatus.pdf.status !== 'idle' && (
                <div className="flex flex-col items-end">
                  <span className={`flex items-center gap-1 ${exportStatus.pdf.status === 'error' ? 'text-destructive font-bold' : ''}`}>
                    {exportStatus.pdf.status === 'error' && <AlertTriangle className="w-3 h-3" />}
                    PDF: {exportStatus.pdf.status === 'generating' ? 'Preparando arquivo' : 
                          exportStatus.pdf.status === 'downloading' ? 'Iniciando download' : 
                          exportStatus.pdf.status === 'error' ? exportStatus.pdf.error : 'Finalizado'}
                  </span>
                  {exportStatus.pdf.status !== 'error' && (
                    <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300" 
                        style={{ width: `${exportStatus.pdf.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              {exportStatus.xlsx.status !== 'idle' && (
                <div className="flex flex-col items-end">
                  <span className={`flex items-center gap-1 ${exportStatus.xlsx.status === 'error' ? 'text-destructive font-bold' : ''}`}>
                    {exportStatus.xlsx.status === 'error' && <AlertTriangle className="w-3 h-3" />}
                    XLSX: {exportStatus.xlsx.status === 'generating' ? 'Processando dados' : 
                           exportStatus.xlsx.status === 'downloading' ? 'Iniciando download' : 
                           exportStatus.xlsx.status === 'error' ? exportStatus.xlsx.error : 'Finalizado'}
                  </span>
                  {exportStatus.xlsx.status !== 'error' && (
                    <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300" 
                        style={{ width: `${exportStatus.xlsx.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
            <Label htmlFor="seller-filter">Vendedor</Label>
            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
              <SelectTrigger id="seller-filter" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Vendedores</SelectItem>
                {sellers.map(seller => (
                  <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-date">Data Início</Label>

            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">Data Fim</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>

          <div className="flex items-center space-x-2 pb-2">
            <Switch
              id="auto-export"
              checked={autoExport}
              onCheckedChange={setAutoExport}
            />
            <Label htmlFor="auto-export" className="cursor-pointer">Exportação Automática</Label>
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
          <TabsTrigger value="history">Histórico Export</TabsTrigger>
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
                        <td className="p-3">{sale.sellerName || 'N/A'}</td>
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

        {/* Export History Tab */}
        <TabsContent value="history">
          <Card className="p-6">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Histórico de Exportações
                </h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8 flex items-center gap-1"
                    onClick={async () => {
                      const filters = { 
                        store: selectedStore, 
                        seller: selectedSeller, 
                        start: startDate, 
                        end: endDate,
                        syncStatus: selectedSyncFilter
                      };

                      if (!selectedSyncFilter || selectedSyncFilter === 'all') {
                        setShowSyncError(true);
                        toast({
                          title: "Erro de Filtro",
                          description: "Selecione um status válido para exportar o PDF de auditoria.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      try {
                        // Backend validation via history insert
                        await saveToHistory('PDF', 'success', filters);

                        exportLogsPDF({ 
                          history: exportHistory, 
                          stores, 
                          filters,
                          companyName: 'NAVANHULA CLOUD'
                        });
                      } catch (error: any) {
                        toast({
                          title: "Erro na Exportação",
                          description: error.message || "Falha na validação do backend.",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <Download className="w-3 h-3" />
                    Auditoria PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`text-xs h-8 flex items-center gap-1 ${(!selectedSyncFilter || selectedSyncFilter === 'all') ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={async () => {
                      const filters = { 
                        store: selectedStore, 
                        seller: selectedSeller, 
                        start: startDate, 
                        end: endDate,
                        syncStatus: selectedSyncFilter
                      };

                      if (!selectedSyncFilter || selectedSyncFilter === 'all') {
                        setShowSyncError(true);
                        toast({
                          title: "Erro de Filtro",
                          description: "Selecione um status válido para exportar o Excel de auditoria.",
                          variant: "destructive"
                        });
                        return;
                      }

                      try {
                        // Backend validation via history insert
                        await saveToHistory('XLSX', 'success', filters);

                        exportLogsExcel({ 
                          history: exportHistory, 
                          stores, 
                          filters
                        });
                      } catch (error: any) {
                        toast({
                          title: "Erro na Exportação",
                          description: error.message || "Falha na validação do backend.",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    Auditoria XLSX
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8"
                    onClick={() => syncManager.retryAllFailed()}
                  >
                    Reprocessar Falhas
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sync-filter" className="text-xs whitespace-nowrap">Filtrar Status:</Label>
                    <Select 
                      value={selectedSyncFilter} 
                      onValueChange={(v: any) => setSelectedSyncFilter(v)}
                    >
                      <SelectTrigger 
                        id="sync-filter" 
                        className={`h-8 w-[140px] text-xs ${(syncFilterError && showSyncError) ? 'border-destructive ring-destructive' : ''}`}
                      >
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="completed">Sincronizado</SelectItem>
                        <SelectItem value="syncing">Sincronizando</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {syncFilterError && showSyncError && (
                    <span className="text-[10px] text-destructive font-medium animate-in fade-in slide-in-from-top-1">
                      {syncFilterError}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground self-center">
                  * Este filtro também será aplicado na exportação do relatório de auditoria PDF.
                </div>
              </div>
            </div>

            {exportHistory.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma exportação realizada nesta sessão</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Data/Hora</th>
                      <th className="text-left p-3 font-medium">Tipo</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Filtros</th>
                      <th className="text-right p-3 font-medium">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {exportHistory
                      .filter(item => selectedSyncFilter === 'all' || item.syncStatus === selectedSyncFilter)
                      .map((item) => (

                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="p-3 text-sm">{item.timestamp.toLocaleString('pt-MZ')}</td>
                        <td className="p-3">
                          <Badge variant="outline">{item.type}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <Badge variant={item.status === 'success' ? 'default' : 'destructive'} className="gap-1 w-fit">
                              {item.status === 'success' ? (
                                'Sucesso'
                              ) : (
                                <>
                                  <AlertTriangle className="w-3 h-3" />
                                  Falha
                                </>
                              )}
                            </Badge>
                            
                            <div className="flex items-center gap-1.5 px-1">
                              {item.syncStatus === 'completed' ? (
                                <div className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                  Sincronizado
                                </div>
                              ) : item.syncStatus === 'syncing' ? (
                                <div className="flex items-center gap-1 text-[10px] text-blue-600 font-medium animate-pulse">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  Sincronizando...
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  Pendente
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-[10px] text-muted-foreground leading-tight">
                            Loja: {item.filters.store === 'all' ? 'Todas' : stores.find(s => s.id === item.filters.store)?.name}<br/>
                            Vendedor: {item.filters.seller === 'all' ? 'Todos' : sellers.find(s => s.id === item.filters.seller)?.name}<br/>
                            Período: {item.filters.start} a {item.filters.end}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          {item.status === 'error' && item.error && (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 text-xs text-destructive hover:text-destructive"
                                  onClick={() => {
                                    const logs = item.attempts?.map(a => 
                                      `[${a.timestamp.toLocaleString('pt-MZ')}] Status: ${a.status}${a.error_message ? ` - Erro: ${a.error_message}` : ''}`
                                    ).join('\n') || 'Sem logs adicionais.';
                                    alert(`Detalhes do Histórico:\nErro principal: ${item.error}\n\nTentativas:\n${logs}`);
                                  }}
                                >
                                  Ver Log
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs flex items-center gap-1"
                                  onClick={() => exportLogsPDF({ 
                                    history: [item], 
                                    stores, 
                                    filters: { store: item.filters.store, seller: item.filters.seller, start: item.filters.start, end: item.filters.end },
                                    companyName: 'NAVANHULA CLOUD'
                                  })}
                                >
                                  <Download className="w-3 h-3" />
                                  Log PDF
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs flex items-center gap-1"
                                  onClick={() => exportLogsExcel({ 
                                    history: [item], 
                                    stores, 
                                    filters: { store: item.filters.store, seller: item.filters.seller, start: item.filters.start, end: item.filters.end }
                                  })}
                                >
                                  <FileSpreadsheet className="w-3 h-3" />
                                  Log XLSX
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs"
                                  onClick={() => syncManager.retryTask(item.id)}
                                >
                                  Reprocessar
                                </Button>
                              </div>
                              {item.attempts && item.attempts.length > 0 && (
                                <div className="text-[9px] text-muted-foreground italic">
                                  {item.attempts.length} tentativa{item.attempts.length > 1 ? 's' : ''} registrada{item.attempts.length > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
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
