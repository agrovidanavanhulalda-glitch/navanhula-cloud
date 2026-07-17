import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { syncManager } from '@/lib/syncQueue';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Package, Search, AlertTriangle, Plus, Minus, TrendingDown,
  History, RefreshCw, ArrowDownToLine, ArrowUpFromLine, XCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import StockMovementHistory from '@/components/inventory/StockMovementHistory';
import StockAlertsPanel from '@/components/inventory/StockAlertsPanel';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PremiumPageHeader } from '@/components/ui/premium-page-header';

interface InventoryProduct {
  id: string;
  name: string;
  code: string;
  cost_price: number;
  sale_price: number;
  low_stock_threshold: number;
  unit_type: string;
  conversion_factor: number;
  is_active: boolean;
  stock_qty: number;
}


type AdjustmentType = 'add' | 'remove' | 'set';

const LocalInventoryPage: React.FC = () => {
  const { isAdmin, hasMinimumRole } = usePermissions();
  const { user, store } = useAuth();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Adjust dialog
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('add');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Movement history
  const [historyProductId, setHistoryProductId] = useState('');
  const [historyProductName, setHistoryProductName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  
  const parentRef = useRef<HTMLDivElement>(null);

  // Computed
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.code || '').toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(p => !filterLowStock || p.stock_qty <= p.low_stock_threshold)
      .sort((a, b) => a.stock_qty - b.stock_qty);
  }, [products, searchTerm, filterLowStock]);

  const rowVirtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  useEffect(() => {
    loadProducts();

    const companyId = (user as any)?.company_id || (user as any)?.user_metadata?.company_id;
    if (!companyId) return;

    // Real-time subscription for inventory page
    const channel = supabase
      .channel('inventory-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_stock',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          console.log('[Inventory] Stock change detected, refreshing...');
          loadProducts(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          console.log('[Inventory] Product change detected, refreshing...');
          loadProducts(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store, user]);

  const loadProducts = async (isManualRefresh = false) => {
    if (!user?.id) return;
    
    // Maintain current products if it's a manual refresh to avoid flickering 0 counts
    if (!isManualRefresh) {
      setLoading(true);
    }
    
    try {
      
      const targetCompanyId = (user as any).company_id || (user as any).user_metadata?.company_id;
      
      if (!targetCompanyId) {
        console.error("LocalInventoryPage: company_id is missing");
        setLoading(false);
        return;
      }

      let query = (supabase
        .from('products')
        .select('id, name, code, cost_price, sale_price, low_stock_threshold, unit_type, conversion_factor, is_active, company_id, product_stock(quantity, store_id)') as any)

        .eq('company_id', targetCompanyId)
        .eq('is_active', true)
        .order('name');

      const { data, error } = await query;

      if (error) {
        console.error("LocalInventoryPage: Error loading products", error);
        toast.error("Erro ao carregar produtos: " + error.message);
        throw error;
      }

      const mapped: InventoryProduct[] = (data || []).map((p: any) => {
        // Strict store filtering: if we have a store, only show its stock. 
        // Otherwise, show 0 instead of randomly picking the first store's stock.
        const stockRecord = store?.id 
          ? (p.product_stock || []).find((s: any) => s.store_id === store.id)
          : null;

        return {
          id: p.id,
          name: p.name,
          code: p.code,
          cost_price: p.cost_price,
          sale_price: p.sale_price,
          low_stock_threshold: p.low_stock_threshold ?? 10,
          unit_type: p.unit_type ?? 'unit',
          conversion_factor: p.conversion_factor ?? 1,
          is_active: p.is_active,
          stock_qty: stockRecord?.quantity ?? 0,

        };
      });
      
      setProducts(mapped);
    } catch (err: any) {
      console.error("LocalInventoryPage: Unexpected error", err);
    } finally {
      setLoading(false);
    }
  };


  const lowStockCount = products.filter(p => p.stock_qty > 0 && p.stock_qty <= p.low_stock_threshold).length;
  const outOfStockCount = products.filter(p => p.stock_qty <= 0).length;
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.cost_price * p.stock_qty), 0);
  const totalSaleValue = products.reduce((acc, p) => acc + (p.sale_price * p.stock_qty), 0);

  // Adjust stock
  const handleOpenAdjust = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setAdjustmentType('add');
    setAdjustmentQty('');
    setAdjustmentReason('');
    setAdjustmentNotes('');
    setShowAdjustDialog(true);
  };

  const handleAdjustStock = async () => {
    if (!selectedProduct || !store?.id) return;
    const qty = parseInt(adjustmentQty);
    if (isNaN(qty) || qty <= 0) { toast.error('Quantidade inválida'); return; }
    if (!adjustmentReason) { toast.error('Selecione o motivo'); return; }

    setAdjusting(true);
    try {
      let movType: string;
      let movQty: number;

      if (adjustmentType === 'add') {
        movType = 'ENTRY';
        movQty = qty;
      } else if (adjustmentType === 'remove') {
        movType = 'ADJUSTMENT'; // Using ADJUSTMENT for manual removal
        movQty = -qty;
      } else {
        movType = 'ADJUSTMENT';
        // Calculate difference for SET
        movQty = qty - selectedProduct.stock_qty;
      }

      const adjustmentPayload = {
        p_product_id: selectedProduct.id,
        p_store_id: store.id,
        p_quantity: movQty,
        p_type: movType,
        p_reason: `${adjustmentReason}${adjustmentNotes ? ': ' + adjustmentNotes : ''}`,
        p_reference_type: 'MANUAL_ADJUSTMENT'
      };

      if (navigator.onLine) {
        const { data, error } = await supabase.rpc('add_inventory_adjustment', adjustmentPayload);

        if (error) {
          console.error("LocalInventoryPage: Error in add_inventory_adjustment, queuing...", error);
          await syncManager.addTask('STOCK_ADJUSTMENT', adjustmentPayload);
          toast.info('Erro de conexão. Ajuste agendado para sincronização.');
          setShowAdjustDialog(false);
          return;
        }
        
        const result = data as any;
        if (result?.success) {
          toast.success(`Estoque atualizado: ${selectedProduct.name} → ${result.new_stock} unidades`);
          setShowAdjustDialog(false);
          loadProducts();
        } else {
          toast.error(result?.message || 'Erro ao ajustar estoque');
        }
      } else {
        await syncManager.addTask('STOCK_ADJUSTMENT', adjustmentPayload);
        toast.info('Modo offline: Ajuste de estoque agendado.');
        setShowAdjustDialog(false);
      }
    } catch (err: any) {
      console.error("LocalInventoryPage: Caught error", err);
      toast.error('Erro ao atualizar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setAdjusting(false);
    }
  };

  const handleOpenHistory = (product: InventoryProduct) => {
    setHistoryProductId(product.id);
    setHistoryProductName(product.name);
    setShowHistory(true);
  };

  const getStockBadge = (product: InventoryProduct) => {
    if (product.stock_qty <= 0) {
      return <Badge variant="destructive">Esgotado</Badge>;
    }
    if (product.stock_qty <= product.low_stock_threshold) {
      return <Badge className="bg-orange-100 text-orange-700 border-orange-300">Baixo</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700 border-green-300">Normal</Badge>;
  };

  if (!isAdmin && !hasMinimumRole('manager')) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
        <p className="text-muted-foreground">Você não tem permissão para gerir o inventário.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PremiumPageHeader
        eyebrow="Inventário"
        title="Estoque"
        subtitle={`${products.length} produtos | ${lowStockCount} baixo | ${outOfStockCount} esgotados`}
        icon={Package}
        actions={
          <Button variant="outline" onClick={() => loadProducts(true)} size="sm">
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Valor em Estoque (Custo)</p>
          <p className="text-2xl font-bold">{formatCurrency(totalInventoryValue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Valor em Estoque (Venda)</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSaleValue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Margem Potencial</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalSaleValue - totalInventoryValue)}</p>
        </Card>
        <Card className={`p-4 ${(lowStockCount + outOfStockCount) > 0 ? 'border-destructive/50 bg-destructive/5' : ''}`}>
          <p className="text-sm text-muted-foreground">Produtos Críticos</p>
          <p className="text-2xl font-bold text-destructive">{lowStockCount + outOfStockCount}</p>
          <div className="flex gap-2 mt-1">
            {lowStockCount > 0 && <span className="text-xs text-orange-600">{lowStockCount} baixo</span>}
            {outOfStockCount > 0 && <span className="text-xs text-destructive">{outOfStockCount} esgotado</span>}
          </div>
        </Card>
      </div>

      {/* Smart Insights */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <Card className="p-4 border-orange-200 bg-orange-50/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              {outOfStockCount > 0 && (
                <p className="text-sm font-medium text-orange-800">
                  ⚠️ {outOfStockCount} produto(s) esgotado(s) — pode estar a perder vendas!
                </p>
              )}
              {lowStockCount > 0 && (
                <p className="text-sm text-orange-700">
                  {lowStockCount} produto(s) com estoque baixo — considere repor.
                </p>
              )}
              {totalInventoryValue > 0 && (
                <p className="text-sm text-muted-foreground">
                  Capital em estoque: {formatCurrency(totalInventoryValue)} — margem potencial de {formatCurrency(totalSaleValue - totalInventoryValue)}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Stock Alerts */}
      <StockAlertsPanel />

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar produto ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={filterLowStock ? 'default' : 'outline'}
          onClick={() => setFilterLowStock(!filterLowStock)}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Estoque Baixo
        </Button>
      </div>

      {/* Products Table */}
      <Card className="overflow-hidden">
        <div 
          ref={parentRef}
          className="overflow-x-auto max-h-[600px] overflow-y-auto"
        >
          <table className="w-full relative border-collapse">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="text-left p-4 font-medium bg-muted/50">Produto</th>
                <th className="text-right p-4 font-medium bg-muted/50">Estoque</th>
                <th className="text-right p-4 font-medium bg-muted/50">Custo Médio</th>
                <th className="text-right p-4 font-medium bg-muted/50">Valor Estoque</th>
                <th className="text-center p-4 font-medium bg-muted/50">Status</th>
                <th className="text-center p-4 font-medium bg-muted/50">Ações</th>
              </tr>
            </thead>
            <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const product = filteredProducts[virtualRow.index];
                return (
                  <tr 
                    key={product.id} 
                    className="hover:bg-muted/30 absolute left-0 w-full flex items-center divide-x border-b"
                    style={{ 
                      height: `${virtualRow.size}px`, 
                      transform: `translateY(${virtualRow.start}px)` 
                    }}
                  >
                    <td className="p-4 flex-1 min-w-0">
                      <div className="font-medium truncate">{product.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{product.code}</div>
                    </td>
                    <td className="p-4 w-40 text-right">
                      <span className={`font-bold ${product.stock_qty <= product.low_stock_threshold ? 'text-destructive' : ''}`}>
                        {product.stock_qty}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">/ mín {product.low_stock_threshold}</span>
                    </td>
                    <td className="p-4 w-40 text-right text-muted-foreground">
                      {formatCurrency(product.cost_price)}
                    </td>
                    <td className="p-4 w-40 text-right font-medium">
                      {formatCurrency(product.cost_price * product.stock_qty)}
                    </td>
                    <td className="p-4 w-32 text-center">{getStockBadge(product)}</td>
                    <td className="p-4 w-48 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleOpenAdjust(product)}>
                          <RefreshCw className="w-3 h-3 mr-1" /> Ajustar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenHistory(product)}>
                          <History className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {products.length === 0 && !loading && (
          <div className="text-center py-12 px-4 space-y-4">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Adicione o seu primeiro produto</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Comece a gerir o seu stock adicionando produtos ao sistema.
              </p>
            </div>
            <Button onClick={() => window.location.href = '/local/produtos'} className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar Produto
            </Button>
          </div>
        )}

        {products.length > 0 && filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum produto corresponde à sua busca</p>
          </div>
        )}
      </Card>

      {/* Adjust Stock Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Ajustar Estoque</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {selectedProduct && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Estoque atual: <span className="font-bold">{selectedProduct.stock_qty}</span> unidades
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Ajuste</Label>
                  <Select value={adjustmentType} onValueChange={(v: AdjustmentType) => setAdjustmentType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">
                        <div className="flex items-center gap-2"><ArrowDownToLine className="w-4 h-4 text-green-600" /> Adicionar (Entrada)</div>
                      </SelectItem>
                      <SelectItem value="remove">
                        <div className="flex items-center gap-2"><ArrowUpFromLine className="w-4 h-4 text-destructive" /> Remover (Saída)</div>
                      </SelectItem>
                      <SelectItem value="set">
                        <div className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-blue-600" /> Definir Valor (Ajuste)</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input type="number" min="1" value={adjustmentQty} onChange={(e) => setAdjustmentQty(e.target.value)} placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label>Motivo *</Label>
                  <Select value={adjustmentReason} onValueChange={setAdjustmentReason}>
                    <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Reposição de Estoque">Reposição de Estoque</SelectItem>
                      <SelectItem value="Correção de Inventário">Correção de Inventário</SelectItem>
                      <SelectItem value="Perda / Avaria">Perda / Avaria</SelectItem>
                      <SelectItem value="Roubo / Furto">Roubo / Furto</SelectItem>
                      <SelectItem value="Devolução de Cliente">Devolução de Cliente</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Observações (opcional)</Label>
                  <Textarea value={adjustmentNotes} onChange={(e) => setAdjustmentNotes(e.target.value)} placeholder="Detalhes adicionais..." rows={2} />
                </div>

                {adjustmentQty && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm">
                      Novo estoque:{' '}
                      <span className="font-bold">
                        {adjustmentType === 'add'
                          ? selectedProduct.stock_qty + parseInt(adjustmentQty || '0')
                          : adjustmentType === 'remove'
                          ? Math.max(0, selectedProduct.stock_qty - parseInt(adjustmentQty || '0'))
                          : parseInt(adjustmentQty || '0')
                        } unidades
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>Cancelar</Button>
            <Button onClick={handleAdjustStock} disabled={adjusting}>
              {adjusting ? 'Salvando...' : 'Confirmar Ajuste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement History */}
      <StockMovementHistory
        productId={historyProductId}
        productName={historyProductName}
        open={showHistory}
        onOpenChange={setShowHistory}
      />
    </div>
  );
};

export default LocalInventoryPage;
