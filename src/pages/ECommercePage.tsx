import React, { useState } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ShoppingBag, Search, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, X, Package, CheckCircle2
} from 'lucide-react';
import ECommerceCheckout from '@/components/ecommerce/ECommerceCheckout';

interface ECommerceCartItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
}

const ECommercePage: React.FC = () => {
  const { store, company } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<ECommerceCartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const storeId = store?.id;

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['ecommerce-products', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data: stockData } = await supabase
        .from('product_stock')
        .select('product_id, quantity')
        .eq('store_id', storeId);

      const stockMap = new Map((stockData || []).map(s => [s.product_id, s.quantity ?? 0]));

      const { data: prods } = await supabase
        .from('products')
        .select('id, name, sale_price, image_url, category_id, is_active, code, description')
        .eq('is_active', true)
        .order('name');

      return (prods || []).map(p => ({
        ...p,
        stock: stockMap.get(p.id) ?? 0,
      }));
    },
    enabled: !!storeId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['ecommerce-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, color')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  const filtered = products
    .filter(p => p.stock > 0)
    .filter(p => !selectedCategory || p.category_id === selectedCategory)
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const addToCart = (product: typeof products[0]) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error('Estoque insuficiente');
          return prev;
        }
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.sale_price,
        image_url: product.image_url,
        quantity: 1,
      }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.id !== id));
    } else {
      setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
    }
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  if (showCheckout) {
    return (
      <ECommerceCheckout
        cart={cart}
        total={cartTotal}
        storeName={store?.name || ''}
        companyName={company?.name || ''}
        onBack={() => setShowCheckout(false)}
        onComplete={() => {
          setCart([]);
          setShowCheckout(false);
          toast.success('Pedido realizado com sucesso!');
        }}
      />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
      {/* Catalog */}
      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-primary" />
              Loja Online
            </h1>
            <p className="text-sm text-muted-foreground">{company?.name} — Catálogo Digital</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Badge
            variant={!selectedCategory ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Badge>
          {categories.map(cat => (
            <Badge
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Badge>
          ))}
        </div>

        {/* Products grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="w-full h-32 bg-muted rounded-lg mb-3" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-5 bg-muted rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(product => {
              const inCart = cart.find(i => i.id === product.id);
              return (
                <Card
                  key={product.id}
                  className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/30"
                  onClick={() => addToCart(product)}
                >
                  <div className="relative">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-36 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-36 bg-muted flex items-center justify-center">
                        <Package className="w-10 h-10 text-muted-foreground/40" />
                      </div>
                    )}
                    {inCart && (
                      <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                        {inCart.quantity}x
                      </Badge>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                    <p className="text-lg font-bold text-primary mt-1">
                      {formatCurrency(product.sale_price)}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {product.stock} em estoque
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => { e.stopPropagation(); addToCart(product); }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhum produto encontrado</p>
            <p className="text-sm">Tente outro termo de busca ou categoria</p>
          </div>
        )}
      </div>

      {/* Cart sidebar */}
      <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l bg-card flex flex-col max-h-[50vh] lg:max-h-none">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Carrinho
          </h2>
          <p className="text-sm text-muted-foreground">{cartCount} item(s)</p>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Carrinho vazio</p>
              <p className="text-sm">Clique nos produtos para adicionar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <Card key={item.id} className="p-3">
                  <div className="flex gap-3">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded bg-muted flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-medium truncate">{item.name}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive"
                          onClick={() => updateQty(item.id, 0)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-primary font-bold text-sm">{formatCurrency(item.price)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                          onClick={() => updateQty(item.id, item.quantity - 1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                          onClick={() => updateQty(item.id, item.quantity + 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <span className="ml-auto text-sm font-bold">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Cart footer */}
        <div className="border-t p-4 space-y-3">
          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(cartTotal)}</span>
          </div>
          {cart.length > 0 && (
            <>
              <Button variant="outline" className="w-full" onClick={() => setCart([])}>
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Carrinho
              </Button>
              <Button className="w-full h-12 text-base" onClick={() => setShowCheckout(true)}>
                <CreditCard className="w-5 h-5 mr-2" />
                Finalizar Pedido
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ECommercePage;
