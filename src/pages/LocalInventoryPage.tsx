import React, { useState } from 'react';
import { useLocalPOS, LocalProduct } from '@/contexts/LocalPOSContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Package, 
  Search,
  AlertTriangle,
  Plus,
  Minus,
  TrendingDown
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

// 100% LOCAL - NO ASYNC, NO BACKEND

type AdjustmentType = 'add' | 'remove' | 'set';

const LocalInventoryPage: React.FC = () => {
  const { products, updateProduct } = useLocalPOS();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<LocalProduct | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('add');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Filter products
  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(p => !filterLowStock || p.stock <= 10)
    .sort((a, b) => a.stock - b.stock);

  // Count low stock
  const lowStockCount = products.filter(p => p.stock <= 10 && p.isActive).length;

  // Total inventory value
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
  const totalSaleValue = products.reduce((acc, p) => acc + (p.salePrice * p.stock), 0);

  // Handle adjust stock
  const handleOpenAdjust = (product: LocalProduct) => {
    setSelectedProduct(product);
    setAdjustmentType('add');
    setAdjustmentQty('');
    setAdjustmentReason('');
    setShowAdjustDialog(true);
  };

  const handleAdjustStock = () => {
    if (!selectedProduct) return;

    const qty = parseInt(adjustmentQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantidade inválida');
      return;
    }

    if (!adjustmentReason.trim()) {
      toast.error('Informe o motivo do ajuste');
      return;
    }

    let newStock = selectedProduct.stock;
    switch (adjustmentType) {
      case 'add':
        newStock = selectedProduct.stock + qty;
        break;
      case 'remove':
        newStock = Math.max(0, selectedProduct.stock - qty);
        break;
      case 'set':
        newStock = qty;
        break;
    }

    updateProduct(selectedProduct.id, { stock: newStock });
    toast.success(`Estoque atualizado: ${selectedProduct.name} → ${newStock} unidades`);
    setShowAdjustDialog(false);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" />
            Estoque
          </h1>
          <p className="text-muted-foreground">
            {products.length} produtos | {lowStockCount} com estoque baixo
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor em Estoque (Custo)</p>
              <p className="text-2xl font-bold">{formatCurrency(totalInventoryValue)}</p>
            </div>
            <Package className="w-8 h-8 text-muted-foreground/50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor em Estoque (Venda)</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSaleValue)}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-muted-foreground/50" />
          </div>
        </Card>

        <Card className={`p-4 ${lowStockCount > 0 ? 'border-destructive/50 bg-destructive/5' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Produtos Críticos</p>
              <p className="text-2xl font-bold text-destructive">{lowStockCount}</p>
            </div>
            <AlertTriangle className={`w-8 h-8 ${lowStockCount > 0 ? 'text-destructive' : 'text-muted-foreground/50'}`} />
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar produto..."
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Produto</th>
                <th className="text-right p-4 font-medium">Estoque</th>
                <th className="text-right p-4 font-medium">Custo Unit.</th>
                <th className="text-right p-4 font-medium">Valor Estoque</th>
                <th className="text-center p-4 font-medium">Status</th>
                <th className="text-center p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-muted/30">
                  <td className="p-4">
                    <div className="font-medium">{product.name}</div>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`font-bold ${product.stock <= 10 ? 'text-destructive' : ''}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="p-4 text-right text-muted-foreground">
                    {formatCurrency(product.costPrice)}
                  </td>
                  <td className="p-4 text-right font-medium">
                    {formatCurrency(product.costPrice * product.stock)}
                  </td>
                  <td className="p-4 text-center">
                    {product.stock <= 0 ? (
                      <Badge variant="destructive">Esgotado</Badge>
                    ) : product.stock <= 10 ? (
                      <Badge variant="outline" className="border-orange-500 text-orange-600">Baixo</Badge>
                    ) : (
                      <Badge variant="secondary">Normal</Badge>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAdjust(product)}
                    >
                      Ajustar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum produto encontrado</p>
          </div>
        )}
      </Card>

      {/* Adjust Stock Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Estoque</DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground">
                  Estoque atual: <span className="font-bold">{selectedProduct.stock}</span> unidades
                </p>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Ajuste</Label>
                <Select
                  value={adjustmentType}
                  onValueChange={(value: AdjustmentType) => setAdjustmentType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-green-600" />
                        Adicionar
                      </div>
                    </SelectItem>
                    <SelectItem value="remove">
                      <div className="flex items-center gap-2">
                        <Minus className="w-4 h-4 text-destructive" />
                        Remover
                      </div>
                    </SelectItem>
                    <SelectItem value="set">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Definir Valor
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qty">Quantidade</Label>
                <Input
                  id="qty"
                  type="number"
                  min="1"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo do Ajuste *</Label>
                <Select
                  value={adjustmentReason}
                  onValueChange={setAdjustmentReason}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reposicao">Reposição de Estoque</SelectItem>
                    <SelectItem value="inventario">Correção de Inventário</SelectItem>
                    <SelectItem value="perda">Perda / Avaria</SelectItem>
                    <SelectItem value="roubo">Roubo / Furto</SelectItem>
                    <SelectItem value="devolucao">Devolução de Cliente</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {adjustmentQty && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm">
                    Novo estoque:{' '}
                    <span className="font-bold">
                      {adjustmentType === 'add' 
                        ? selectedProduct.stock + parseInt(adjustmentQty || '0')
                        : adjustmentType === 'remove'
                        ? Math.max(0, selectedProduct.stock - parseInt(adjustmentQty || '0'))
                        : parseInt(adjustmentQty || '0')
                      } unidades
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdjustStock}>
              Confirmar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocalInventoryPage;
