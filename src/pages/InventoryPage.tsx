import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatNumber, getAdjustmentReasonLabel } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Package,
  Search,
  Plus,
  Minus,
  History,
} from 'lucide-react';
import type { Product, StockAdjustmentReason } from '@/types/pos';
import { toast } from 'sonner';

const adjustmentReasons: { value: StockAdjustmentReason; label: string }[] = [
  { value: 'loss', label: 'Perda' },
  { value: 'theft', label: 'Roubo' },
  { value: 'breakage', label: 'Quebra' },
  { value: 'admin_adjustment', label: 'Ajuste Administrativo' },
  { value: 'inventory_correction', label: 'Correção de Inventário' },
];

const InventoryPage: React.FC = () => {
  const { store, user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<StockAdjustmentReason>('admin_adjustment');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const fetchProducts = async () => {
    if (!store) return;

    const { data, error } = await supabase
      .from('product_stock')
      .select(`
        *,
        product:products(*)
      `)
      .eq('store_id', store.id);

    if (error) {
      console.error('Error fetching stock:', error);
      return;
    }

    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [store]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchTerm || 
      p.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product?.code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLowStock = !showLowStockOnly || 
      p.quantity <= (p.product?.low_stock_threshold || 10);

    return matchesSearch && matchesLowStock;
  });

  const lowStockCount = products.filter(
    p => p.quantity <= (p.product?.low_stock_threshold || 10)
  ).length;

  const openAdjustment = (product: any, type: 'add' | 'remove') => {
    setSelectedProduct(product);
    setAdjustmentType(type);
    setQuantity('');
    setNotes('');
    setReason('admin_adjustment');
    setAdjustModal(true);
  };

  const handleAdjustment = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      toast.error('Insira uma quantidade válida');
      return;
    }

    setSaving(true);
    try {
      const change = adjustmentType === 'add' ? qty : -qty;
      const newQuantity = selectedProduct.quantity + change;

      if (newQuantity < 0) {
        toast.error('Estoque não pode ficar negativo');
        setSaving(false);
        return;
      }

      // Update stock
      const { error: stockError } = await supabase
        .from('product_stock')
        .update({ quantity: newQuantity })
        .eq('id', selectedProduct.id);

      if (stockError) throw stockError;

      // Log adjustment
      const { error: logError } = await supabase
        .from('stock_adjustments')
        .insert({
          product_id: selectedProduct.product_id,
          store_id: store?.id,
          quantity_change: change,
          reason,
          notes: notes || null,
          adjusted_by: user?.id,
        });

      if (logError) throw logError;

      toast.success('Estoque ajustado com sucesso!');
      setAdjustModal(false);
      fetchProducts();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Estoque</h1>
          <p className="text-muted-foreground">
            Controle de inventário por loja
          </p>
        </div>
        {lowStockCount > 0 && (
          <Button
            variant={showLowStockOnly ? 'default' : 'outline'}
            className={showLowStockOnly ? 'pos-button-primary' : 'border-warning text-warning'}
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          >
            <AlertTriangle className="w-5 h-5 mr-2" />
            {lowStockCount} com Estoque Baixo
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Pesquisar produto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pos-search"
        />
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && !showLowStockOnly && (
        <div className="pos-card border-warning/50 bg-warning/10 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-warning" />
            <div>
              <p className="font-semibold text-warning">Atenção: Produtos com Estoque Baixo</p>
              <p className="text-sm text-muted-foreground">
                {lowStockCount} produto(s) precisam de reposição
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stock Table */}
      <div className="pos-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="pos-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto</th>
                <th className="text-center">Quantidade</th>
                <th className="text-center">Mín.</th>
                <th className="text-center">Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6}>
                      <div className="h-12 pos-skeleton" />
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhum produto encontrado</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => {
                  const isLow = item.quantity <= (item.product?.low_stock_threshold || 10);
                  const isOut = item.quantity === 0;

                  return (
                    <tr key={item.id}>
                      <td className="font-mono text-sm">{item.product?.code}</td>
                      <td className="font-medium">{item.product?.name}</td>
                      <td className="text-center">
                        <span className={`font-semibold text-lg ${
                          isOut ? 'text-destructive' : isLow ? 'text-warning' : 'text-foreground'
                        }`}>
                          {formatNumber(item.quantity)}
                        </span>
                      </td>
                      <td className="text-center text-muted-foreground">
                        {item.product?.low_stock_threshold || 10}
                      </td>
                      <td className="text-center">
                        {isOut ? (
                          <span className="pos-badge-error">Esgotado</span>
                        ) : isLow ? (
                          <span className="pos-badge-warning">Baixo</span>
                        ) : (
                          <span className="pos-badge-success">Normal</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-success hover:text-success"
                            onClick={() => openAdjustment(item, 'add')}
                          >
                            <Plus className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openAdjustment(item, 'remove')}
                          >
                            <Minus className="w-5 h-5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustment Modal */}
      <Dialog open={adjustModal} onOpenChange={setAdjustModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === 'add' ? 'Adicionar' : 'Remover'} Estoque
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.product?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-sm text-muted-foreground">Estoque Atual</p>
              <p className="text-3xl font-bold">{selectedProduct?.quantity}</p>
            </div>

            <div className="space-y-2">
              <Label>Quantidade a {adjustmentType === 'add' ? 'adicionar' : 'remover'}</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="pos-input text-center text-2xl h-16"
                placeholder="0"
                autoFocus
              />
            </div>

            {quantity && (
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex justify-between">
                  <span>Novo Estoque</span>
                  <span className="font-bold">
                    {selectedProduct?.quantity + (adjustmentType === 'add' ? parseInt(quantity) || 0 : -(parseInt(quantity) || 0))}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Motivo do Ajuste *</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as StockAdjustmentReason)}>
                <SelectTrigger className="pos-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adjustmentReasons.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="pos-input"
                placeholder="Notas adicionais..."
              />
            </div>

            <Button
              className={`w-full h-12 ${adjustmentType === 'add' ? 'pos-button-success' : 'bg-destructive hover:bg-destructive/90'}`}
              onClick={handleAdjustment}
              disabled={saving}
            >
              {saving ? 'Processando...' : 'Confirmar Ajuste'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
