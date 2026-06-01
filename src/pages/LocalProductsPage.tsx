import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalPOS, LocalProduct } from '@/contexts/LocalPOSContext';
import { useProducts } from '@/hooks/useProducts';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermissions } from '@/hooks/usePermissions';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Package, 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  Image as ImageIcon,
  History,
  Trash
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import ProductImageUpload from '@/components/products/ProductImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { useOnboarding } from '@/hooks/useOnboarding';
import { SkeletonTable } from '@/components/ui/skeleton-card';
import PageTransition from '@/components/layout/PageTransition';
import { useVirtualizer } from '@tanstack/react-virtual';

const LocalProductsPage: React.FC = () => {
  const { company } = useAuth();
  const { addProduct, updateProduct, deleteProduct, restoreProduct, currentStore, refreshData } = useLocalPOS();
  const { updateStep } = useOnboarding();
  const { isAdmin } = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const [showDeleted, setShowDeleted] = useState(false);
  
  const parentRef = useRef<HTMLDivElement>(null);

  const { data: productsData, isLoading: productsLoading } = useProducts({
    searchTerm: debouncedSearch,
    page,
    pageSize,
    storeId: currentStore?.id,
    includeDeleted: showDeleted
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .eq('company_id', company.id)
        .order('name');
      return data || [];
    },
    enabled: !!company?.id
  });

  const products = productsData?.data || [];
  const totalCount = productsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LocalProduct | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteZeroStockLoading, setDeleteZeroStockLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    costPrice: '',
    salePrice: '',
    stock: '',
    isActive: true,
    imageUrl: '' as string | null,
    galleryUrls: [] as string[],
    description: '',
    categoryId: '',
  });

  // Mapping from DB products to LocalProduct for the table
  const mappedProducts = useMemo(() => {
    return products.map(p => ({
      id: p.id,
      name: p.name,
      code: p.code || '',
      salePrice: p.sale_price,
      costPrice: p.cost_price,
      isActive: p.is_active,
      stock: p.product_stock.reduce((acc, s) => acc + (s.quantity || 0), 0), // Total stock across stores for list
      imageUrl: p.image_url,
      galleryUrls: p.gallery_urls || [],
      description: p.description,
      categoryId: p.category_id,
      categoryName: (p as any).categories?.name || 'Geral'
    }));
  }, [products]);

  const rowVirtualizer = useVirtualizer({
    count: mappedProducts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      costPrice: '',
      salePrice: '',
      stock: '',
      isActive: true,
      imageUrl: null,
      galleryUrls: [],
      description: '',
      categoryId: '',
    });
    setEditingProduct(null);
  };

  // Open form for new product
  const handleNewProduct = () => {
    resetForm();
    setShowForm(true);
  };

  // Open form for editing
  const handleEdit = (product: any) => {
    setFormData({
      name: product.name,
      code: product.code || '',
      costPrice: product.costPrice.toString(),
      salePrice: product.salePrice.toString(),
      stock: product.stock.toString(),
      isActive: product.isActive,
      imageUrl: product.imageUrl || null,
      galleryUrls: product.galleryUrls || [],
      description: product.description || '',
      categoryId: product.categoryId || '',
    });
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleSave = async () => {
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
      code: formData.code.trim() || undefined,
      costPrice,
      salePrice,
      stock,
      isActive: formData.isActive,
      imageUrl: formData.imageUrl,
      galleryUrls: formData.galleryUrls,
      description: formData.description.trim() || undefined,
      categoryId: formData.categoryId === 'none' ? null : (formData.categoryId || null),
    };

    try {
      let success = false;
      if (editingProduct) {
        success = await updateProduct(editingProduct.id, productData);
      } else {
        success = await addProduct(productData);
        if (success) {
          updateStep('first_product_added');
        }
      }

      if (success) {
        setShowForm(false);
        resetForm();
      }
    } catch (error) {
      console.error('[ProductsPage] Erro ao salvar:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteProduct(id);
    if (success) {
      setDeleteConfirm(null);
    }
  };

  const handleDeleteZeroStock = async () => {
    if (!company?.id) return;
    
    setDeleteZeroStockLoading(true);
    try {
      // Find products that have zero stock across all stores
      // First, get all products
      const { data: allProducts, error: fetchError } = await supabase
        .from('products')
        .select('id')
        .eq('company_id', company.id)
        .neq('status', 'deleted');

      if (fetchError) throw fetchError;

      // Get products that HAVE stock > 0
      const { data: stockedProducts } = await supabase
        .from('product_stock')
        .select('product_id')
        .gt('quantity', 0)
        .eq('company_id', company.id);
      
      const stockedIds = new Set(stockedProducts?.map(p => p.product_id) || []);
      const allProductIds = allProducts?.map(p => p.id) || [];
      const toDelete = allProductIds.filter(id => !stockedIds.has(id));

      if (toDelete.length === 0) {
        toast.info('Nenhum produto com estoque zero encontrado.');
        return;
      }

      // Use the deleteProduct from context which handles soft delete
      let count = 0;
      for (const id of toDelete) {
        const success = await deleteProduct(id);
        if (success) count++;
      }

      toast.success(`${count} produtos removidos com sucesso`);
      refreshData();
    } catch (error: any) {
      toast.error('Erro ao remover produtos: ' + error.message);
    } finally {
      setDeleteZeroStockLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    const success = await restoreProduct(id);
    if (success) {
      refreshData();
    }
  };

  const calculateMargin = (cost: number, sale: number) => {
    if (cost === 0) return 100;
    return ((sale - cost) / cost * 100).toFixed(1);
  };

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
        
        try {
          await addProduct({ name, salePrice, costPrice: costPrice || 0, stock: stock || 0, isActive: true });
          imported++;
        } catch (err) {
          console.error(`Erro ao importar produto ${name}:`, err);
        }
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
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6" />
              Produtos
            </h1>
            <p className="text-muted-foreground">{totalCount} produtos cadastrados</p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelImport} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
              Importar Excel
            </Button>
            <Button variant="destructive" onClick={handleDeleteZeroStock} disabled={deleteZeroStockLoading}>
              {deleteZeroStockLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash className="w-4 h-4 mr-2" />}
              Eliminar Estoque Zero
            </Button>
            <Button onClick={handleNewProduct}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar produto por nome ou SKU..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            className="pl-10 max-w-md"
          />
          <div className="flex items-center gap-2 ml-auto">
            <Label htmlFor="show-deleted" className="text-sm text-muted-foreground">Mostrar Eliminados</Label>
            <Switch 
              id="show-deleted" 
              checked={showDeleted} 
              onCheckedChange={setShowDeleted} 
            />
          </div>
        </div>

        {productsLoading ? (
          <SkeletonTable rows={pageSize} cols={6} />
        ) : (
          <Card className="overflow-hidden">
            <div 
              ref={parentRef}
              className="overflow-x-auto max-h-[600px] overflow-y-auto"
            >
              <table className="w-full relative border-collapse">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-4 font-medium w-16 bg-muted/50">Img</th>
                    <th className="text-left p-4 font-medium w-32 bg-muted/50">SKU</th>
                    <th className="text-left p-4 font-medium bg-muted/50">Nome</th>
                    <th className="text-right p-4 font-medium w-32 bg-muted/50">Estoque</th>
                    <th className="text-right p-4 font-medium w-32 bg-muted/50">Compra</th>
                    <th className="text-right p-4 font-medium w-32 bg-muted/50">Venda</th>
                    <th className="text-left p-4 font-medium w-32 bg-muted/50">Categoria</th>
                    <th className="text-center p-4 font-medium w-28 bg-muted/50">Status</th>
                    <th className="text-center p-4 font-medium w-28 bg-muted/50">Ações</th>
                  </tr>
                </thead>
                <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const product = mappedProducts[virtualRow.index];
                    return (
                      <tr 
                        key={product.id} 
                        className="hover:bg-muted/30 absolute left-0 w-full flex items-center divide-x border-b"
                        style={{ 
                          height: `${virtualRow.size}px`, 
                          transform: `translateY(${virtualRow.start}px)` 
                        }}
                      >
                        <td className="p-4 w-16">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded">
                              <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                            </div>
                          )}
                        </td>
                        <td className="p-4 w-32"><code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate block">{product.code || '---'}</code></td>
                        <td className="p-4 flex-1 min-w-0"><div className="font-medium truncate">{product.name}</div></td>
                        <td className="p-4 w-32 text-right">
                          <Badge variant={product.stock <= 0 ? "destructive" : product.stock <= 10 ? "secondary" : "outline"}>
                            {product.stock}
                          </Badge>
                        </td>
                        <td className="p-4 w-32 text-right text-muted-foreground">{formatCurrency(product.costPrice)}</td>
                        <td className="p-4 w-32 text-right font-medium">{formatCurrency(product.salePrice)}</td>
                        <td className="p-4 w-32 truncate">{product.categoryName}</td>
                        <td className="p-4 w-28 text-center">
                          <Badge variant={product.id.includes('deleted') || showDeleted ? 'destructive' : product.isActive ? 'default' : 'secondary'}>
                            {showDeleted ? 'Eliminado' : product.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="p-4 w-28">
                          <div className="flex items-center justify-center gap-2">
                            {showDeleted ? (
                              <Button variant="outline" size="sm" onClick={() => handleRestore(product.id)} className="gap-1">
                                <History className="w-4 h-4" />
                                Restaurar
                              </Button>
                            ) : (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteConfirm(product.id)}><Trash2 className="w-4 h-4" /></Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalCount === 0 && !productsLoading ? (
              <div className="text-center py-16 px-4 space-y-4">
                <Package className="w-20 h-20 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-2xl font-bold">Adicione o seu primeiro produto</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">O seu catálogo está vazio. Comece a adicionar produtos para vender.</p>
                <Button size="lg" onClick={handleNewProduct} className="gap-2"><Plus className="w-6 h-6" /> Adicionar Primeiro Produto</Button>
              </div>
            ) : totalCount > 0 && mappedProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum produto encontrado com este termo</p>
              </div>
            )}

          {totalCount > pageSize && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/5 mt-auto">
              <div className="text-sm text-muted-foreground">
                Mostrando {Math.min(mappedProducts.length, pageSize)} de {totalCount} produtos
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage(p => Math.max(0, p - 1));
                    parentRef.current?.scrollTo(0, 0);
                  }}
                  disabled={page === 0 || productsLoading}
                >
                  Anterior
                </Button>
                <div className="text-sm font-medium min-w-[100px] text-center">
                  Página {page + 1} de {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage(p => p + 1);
                    parentRef.current?.scrollTo(0, 0);
                  }}
                  disabled={page >= totalPages - 1 || productsLoading}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
          </Card>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Imagem do Produto</Label>
                <ProductImageUpload currentUrl={formData.imageUrl || null} productId={editingProduct?.id} onUploaded={(url) => setFormData({ ...formData, imageUrl: url })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Código (SKU)</Label>
                  <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Preço de Compra *</Label>
                  <Input id="costPrice" type="number" step="0.01" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salePrice">Preço de Venda *</Label>
                  <Input id="salePrice" type="number" step="0.01" value={formData.salePrice} onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Estoque Inicial *</Label>
                  <Input id="stock" type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Galeria de Fotos</Label>
                <div className="grid grid-cols-4 gap-2">
                  {formData.galleryUrls.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Gallery ${idx}`} className="w-full h-20 object-cover rounded" />
                      <button 
                        onClick={() => setFormData({ ...formData, galleryUrls: formData.galleryUrls.filter((_, i) => i !== idx) })}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <ProductImageUpload 
                    currentUrl={null} 
                    onUploaded={(url) => setFormData({ ...formData, galleryUrls: [...formData.galleryUrls, url] })} 
                    label="+"
                    compact
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Produto Ativo</Label>
                <Switch id="isActive" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
              </div>
              {formData.costPrice && formData.salePrice && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Margem de lucro: <span className="font-bold text-primary">{calculateMargin(parseFloat(formData.costPrice) || 0, parseFloat(formData.salePrice) || 0)}%</span></p>
                </div>
              )}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Deseja eliminar este produto?</DialogTitle></DialogHeader>
            <p className="text-muted-foreground">Esta ação removerá permanentemente o produto do catálogo e do estoque.</p>
            <DialogFooter><Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button><Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Eliminar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default LocalProductsPage;
