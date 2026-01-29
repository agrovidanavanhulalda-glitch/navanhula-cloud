import React, { useState } from 'react';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Plus, 
  Search,
  Edit,
  Trash2
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

// 100% LOCAL - NO ASYNC, NO BACKEND, NO LOADING

const LocalProductsPage: React.FC = () => {
  const { products, addProduct } = useLocalPOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock: ''
  });

  // Filter products - SYNCHRONOUS
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle add product - SYNCHRONOUS
  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) {
      toast.error('Preencha nome e preço');
      return;
    }

    const price = parseFloat(newProduct.price);
    const stock = parseInt(newProduct.stock) || 0;

    if (isNaN(price) || price <= 0) {
      toast.error('Preço inválido');
      return;
    }

    addProduct({
      name: newProduct.name,
      price,
      stock
    });

    toast.success('Produto adicionado!');
    setNewProduct({ name: '', price: '', stock: '' });
    setShowAddForm(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">{products.length} produtos cadastrados</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
          <Plus className="w-5 h-5" />
          Novo Produto
        </Button>
      </div>

      {/* Add Product Form */}
      {showAddForm && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Adicionar Novo Produto</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Nome do produto"
              value={newProduct.name}
              onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="Preço"
              type="number"
              value={newProduct.price}
              onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
            />
            <Input
              placeholder="Estoque"
              type="number"
              value={newProduct.stock}
              onChange={(e) => setNewProduct(prev => ({ ...prev, stock: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button onClick={handleAddProduct} className="flex-1">
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar produto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Products Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-semibold">Produto</th>
                <th className="text-right p-4 font-semibold">Preço</th>
                <th className="text-right p-4 font-semibold">Estoque</th>
                <th className="text-right p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b hover:bg-accent/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-bold text-primary">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="p-4 text-right">
                    <Badge variant={product.stock > 10 ? 'default' : 'destructive'}>
                      {product.stock} un
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
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
    </div>
  );
};

export default LocalProductsPage;
