import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatNumber, calculateMargin } from '@/lib/formatters';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Edit,
  Package,
  TrendingUp,
} from 'lucide-react';
import type { Product, Category } from '@/types/pos';
import { toast } from 'sonner';

const ProductsPage: React.FC = () => {
  const { store, role } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    setProducts(data as Product[] || []);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    setCategories(data as Category[] || []);
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async () => {
    if (!editProduct?.name || !editProduct?.code) {
      toast.error('Nome e código são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      if (editProduct.id) {
        // Update
        const { error } = await supabase
          .from('products')
          .update({
            name: editProduct.name,
            code: editProduct.code,
            category_id: editProduct.category_id,
            cost_price: editProduct.cost_price || 0,
            sale_price: editProduct.sale_price || 0,
            low_stock_threshold: editProduct.low_stock_threshold || 10,
            description: editProduct.description,
          })
          .eq('id', editProduct.id);

        if (error) throw error;
        toast.success('Produto atualizado!');
      } else {
        // Create
        const { error } = await supabase
          .from('products')
          .insert({
            name: editProduct.name,
            code: editProduct.code,
            category_id: editProduct.category_id,
            cost_price: editProduct.cost_price || 0,
            sale_price: editProduct.sale_price || 0,
            low_stock_threshold: editProduct.low_stock_threshold || 10,
            description: editProduct.description,
          });

        if (error) throw error;
        toast.success('Produto criado!');
      }

      setEditModal(false);
      setEditProduct(null);
      fetchProducts();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const openNewProduct = () => {
    setEditProduct({
      name: '',
      code: '',
      cost_price: 0,
      sale_price: 0,
      low_stock_threshold: 10,
    });
    setEditModal(true);
  };

  const openEditProduct = (product: Product) => {
    setEditProduct(product);
    setEditModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">
            Gestão de catálogo de produtos
          </p>
        </div>
        <Button className="pos-button-primary" onClick={openNewProduct}>
          <Plus className="w-5 h-5 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome ou código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pos-search"
        />
      </div>

      {/* Products Table */}
      <div className="pos-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="pos-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th className="text-right">Preço Custo</th>
                <th className="text-right">Preço Venda</th>
                <th className="text-right">Margem</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="h-12 pos-skeleton" />
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhum produto encontrado</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const margin = calculateMargin(product.cost_price, product.sale_price);
                  return (
                    <tr key={product.id}>
                      <td className="font-mono text-sm">{product.code}</td>
                      <td>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td>
                        {product.category && (
                          <span
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: product.category.color + '20', color: product.category.color }}
                          >
                            {product.category.name}
                          </span>
                        )}
                      </td>
                      <td className="text-right pos-money">{formatCurrency(product.cost_price)}</td>
                      <td className="text-right pos-money font-semibold">{formatCurrency(product.sale_price)}</td>
                      <td className="text-right">
                        <span className={`flex items-center justify-end gap-1 ${margin >= 30 ? 'text-success' : margin >= 15 ? 'text-warning' : 'text-destructive'}`}>
                          <TrendingUp className="w-4 h-4" />
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditProduct(product)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editProduct?.id ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={editProduct?.code || ''}
                  onChange={(e) => setEditProduct(p => ({ ...p, code: e.target.value }))}
                  className="pos-input"
                  placeholder="P001"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={editProduct?.category_id || ''}
                  onValueChange={(v) => setEditProduct(p => ({ ...p, category_id: v }))}
                >
                  <SelectTrigger className="pos-input">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome do Produto *</Label>
              <Input
                value={editProduct?.name || ''}
                onChange={(e) => setEditProduct(p => ({ ...p, name: e.target.value }))}
                className="pos-input"
                placeholder="Nome do produto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço de Custo (MZN)</Label>
                <Input
                  type="number"
                  value={editProduct?.cost_price || ''}
                  onChange={(e) => setEditProduct(p => ({ ...p, cost_price: parseFloat(e.target.value) || 0 }))}
                  className="pos-input"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Preço de Venda (MZN)</Label>
                <Input
                  type="number"
                  value={editProduct?.sale_price || ''}
                  onChange={(e) => setEditProduct(p => ({ ...p, sale_price: parseFloat(e.target.value) || 0 }))}
                  className="pos-input"
                  placeholder="0.00"
                />
              </div>
            </div>

            {editProduct?.cost_price && editProduct?.sale_price && (
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Margem de Lucro</span>
                  <span className={`font-semibold ${
                    calculateMargin(editProduct.cost_price, editProduct.sale_price) >= 30 
                      ? 'text-success' 
                      : 'text-warning'
                  }`}>
                    {calculateMargin(editProduct.cost_price, editProduct.sale_price).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Limite de Estoque Baixo</Label>
              <Input
                type="number"
                value={editProduct?.low_stock_threshold || 10}
                onChange={(e) => setEditProduct(p => ({ ...p, low_stock_threshold: parseInt(e.target.value) || 10 }))}
                className="pos-input"
                placeholder="10"
              />
            </div>

            <Button
              className="w-full pos-button-primary h-12"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar Produto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsPage;
