import React, { useState } from 'react';
import { useLocalPOS, LocalProduct } from '@/contexts/LocalPOSContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Package, 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  AlertTriangle,
  Upload,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import ProductImageUpload from '@/components/products/ProductImageUpload';
import * as XLSX from 'xlsx';
import { useOnboarding } from '@/hooks/useOnboarding';
import { SkeletonTable } from '@/components/ui/skeleton-card';
import PageTransition from '@/components/layout/PageTransition';

// HYBRID: Local POS data + SaaS Auth

const LocalProductsPage: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, loading } = useLocalPOS();
  const { updateStep } = useOnboarding();
  const { role } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LocalProduct | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    costPrice: '',
    salePrice: '',
    stock: '',
    isActive: true,
    imageUrl: '' as string | null,
  });

  const isAdmin = role === 'admin' || role === 'manager';

  // Filter products
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      costPrice: '',
      salePrice: '',
      stock: '',
      isActive: true,
      imageUrl: null,
    });
    setEditingProduct(null);
  };

  // Open form for new product
  const handleNewProduct = () => {
    resetForm();
    setShowForm(true);
  };

  // Open form for editing
  const handleEdit = (product: LocalProduct) => {
    setFormData({
      name: product.name,
      costPrice: product.costPrice.toString(),
      salePrice: product.salePrice.toString(),
      stock: product.stock.toString(),
      isActive: product.isActive,
      imageUrl: (product as any).imageUrl || null,
    });
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleSave = async () => {
    console.log('[ProductsPage] Iniciando salvamento do produto');
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    const costPrice = parseFloat(formData.costPrice);
    const salePrice = parseFloat(formData.salePrice);
    const stock = parseInt(formData.stock);

    if (isNaN(costPrice) || costPrice < 0) {
      toast.error('Preço de compra inválido');
      return;
    }

    if (isNaN(salePrice) || salePrice <= 0) {
      toast.error('Preço de venda inválido');
      return;
    }

    if (isNaN(stock) || stock < 0) {
      toast.error('Estoque inválido');
      return;
    }

    const productData = {
      name: formData.name.trim(),
      costPrice,
      salePrice,
      stock,
      isActive: formData.isActive,
      imageUrl: formData.imageUrl
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        // Note: updateProduct context handles the toast and state update
      } else {
        await addProduct(productData);
        updateStep('first_product_added');
      }

      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('[ProductsPage] Erro ao salvar:', error);
      toast.error('Erro ao salvar produto');
    }
  };

  // Delete product
  const handleDelete = (id: string) => {
    deleteProduct(id);
    toast.success('Produto excluído');
    setDeleteConfirm(null);
  };

  // Calculate margin
  const calculateMargin = (cost: number, sale: number) => {
    if (cost === 0) return 100;
    return ((sale - cost) / cost * 100).toFixed(1);
  };

  // Excel Import
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
      
      let imported = 0;
      for (const row of rows) {
        const name = String(row['nome'] || row['Nome'] || row['name'] || row['Produto'] || '').trim();
        const salePrice = parseFloat(row['preço de venda'] || row['preco_venda'] || row['sale_price'] || row['preco'] || row['Preço'] || 0);
        const costPrice = parseFloat(row['preço de compra'] || row['preco_compra'] || row['cost_price'] || row['custo'] || row['Custo'] || 0);
        const stock = parseInt(row['estoque'] || row['stock'] || row['quantidade'] || row['Estoque'] || 0);
        
        if (!name || salePrice <= 0) continue;
        
        addProduct({ name, salePrice, costPrice: costPrice || 0, stock: stock || 0, isActive: true });
        imported++;
      }
      
      toast.success(`${imported} produtos importados com sucesso.`);
    } catch (err: any) {
      toast.error('Erro ao importar: ' + (err.message || 'Ficheiro inválido'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
        <p className="text-muted-foreground">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6" />
              Produtos
            </h1>
            <p className="text-muted-foreground">
              {products.length} produtos cadastrados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleExcelImport}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
              Importar Excel
            </Button>
            <Button onClick={handleNewProduct}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        {/* Products Table */}
        {loading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Produto</th>
                    <th className="text-right p-4 font-medium">Preço Compra</th>
                    <th className="text-right p-4 font-medium">Preço Venda</th>
                    <th className="text-right p-4 font-medium">Margem</th>
                    <th className="text-right p-4 font-medium">Estoque</th>
                    <th className="text-center p-4 font-medium">Status</th>
                    <th className="text-center p-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="font-medium">{product.name}</div>
                      </td>
                      <td className="p-4 text-right text-muted-foreground">
                        {formatCurrency(product.costPrice)}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {formatCurrency(product.salePrice)}
                      </td>
                      <td className="p-4 text-right">
                        <Badge variant="secondary">
                          {calculateMargin(product.costPrice, product.salePrice)}%
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <span className={product.stock <= 10 ? 'text-destructive font-medium' : ''}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant={product.isActive ? 'default' : 'secondary'}>
                          {product.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setDeleteConfirm(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
        )}

        {/* Product Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Product Image */}
              <div className="space-y-2">
                <Label>Imagem do Produto</Label>
                <ProductImageUpload
                  currentUrl={formData.imageUrl || null}
                  productId={editingProduct?.id}
                  onUploaded={(url) => setFormData({ ...formData, imageUrl: url })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do produto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Preço de Compra *</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salePrice">Preço de Venda *</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Estoque *</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Produto Ativo</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              {formData.costPrice && formData.salePrice && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Margem de lucro: <span className="font-bold text-primary">
                      {calculateMargin(
                        parseFloat(formData.costPrice) || 0,
                        parseFloat(formData.salePrice) || 0
                      )}%
                    </span>
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingProduct ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default LocalProductsPage;
