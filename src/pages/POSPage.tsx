import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePOS } from '@/contexts/POSContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { MOCK_PRODUCT, withTimeout } from '@/lib/mockData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Smartphone,
  Banknote,
  X,
  Percent,
  User,
  Package,
} from 'lucide-react';
import type { Product, PaymentMethod } from '@/types/pos';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const paymentMethods: { method: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { method: 'cash', label: 'Dinheiro', icon: <Banknote className="w-6 h-6" /> },
  { method: 'mpesa', label: 'M-Pesa', icon: <Smartphone className="w-6 h-6" /> },
  { method: 'emola', label: 'e-Mola', icon: <Smartphone className="w-6 h-6" /> },
  { method: 'card', label: 'Cartão', icon: <CreditCard className="w-6 h-6" /> },
];

const POSPage: React.FC = () => {
  const { store } = useAuth();
  const {
    cart,
    cashRegister,
    isReady,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getSubtotal,
    getTotal,
    getTotalDiscount,
    completeSale,
    ensureCashRegister,
  } = usePOS();

  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [customerName, setCustomerName] = useState('');
  const [processing, setProcessing] = useState(false);

  // Auto-ensure cash register on mount
  useEffect(() => {
    if (isReady && !cashRegister) {
      ensureCashRegister();
    }
  }, [isReady, cashRegister, ensureCashRegister]);

  // Fetch products with 1s timeout and fallback
  useEffect(() => {
    const fetchProducts = async () => {
      // Force render after 1s max
      const timeout = setTimeout(() => {
        if (products.length === 0) {
          setProducts([MOCK_PRODUCT]);
        }
        setLoading(false);
      }, 1000);

      const storeId = store?.id;

      // If no store, use mock product immediately
      if (!storeId) {
        clearTimeout(timeout);
        setProducts([MOCK_PRODUCT]);
        setLoading(false);
        return;
      }

      try {
        const result = await withTimeout(
          supabase
            .from('products')
            .select(`
              *,
              category:categories(*),
              stock:product_stock!inner(quantity)
            `)
            .eq('is_active', true)
            .eq('product_stock.store_id', storeId)
            .then(r => r),
          1000,
          { data: null, error: null }
        );

        clearTimeout(timeout);

        if (result.data && result.data.length > 0) {
          const productsWithStock = result.data.map((p: any) => ({
            ...p,
            stock: p.stock?.[0] || { quantity: 0 },
          }));
          setProducts(productsWithStock);
        } else {
          // No products found - use mock
          setProducts([MOCK_PRODUCT]);
        }
      } catch (err) {
        clearTimeout(timeout);
        console.warn('Error fetching products:', err);
        setProducts([MOCK_PRODUCT]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [store?.id]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const handleCompleteSale = async () => {
    setProcessing(true);
    try {
      await completeSale(selectedPayment, customerName || undefined);
      setPaymentModalOpen(false);
      setCustomerName('');
    } catch {
      // Error handled in context
    } finally {
      setProcessing(false);
    }
  };

  const subtotal = getSubtotal();
  const discount = getTotalDiscount();
  const total = getTotal();

  return (
    <div className="flex flex-col lg:flex-row h-screen max-h-screen overflow-hidden">
      {/* Products Section */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar produto por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pos-search h-12 text-lg"
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="pos-card animate-pulse h-32" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Package className="w-12 h-12 mb-2" />
              <p>Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const stockQty = product.stock?.quantity || 0;
                const isLowStock = stockQty <= product.low_stock_threshold;
                const isOutOfStock = stockQty === 0;

                return (
                  <button
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    disabled={isOutOfStock}
                    className={`pos-product-card text-left ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="w-full">
                      <p className="font-semibold text-sm truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.code}</p>
                    </div>
                    <div className="w-full flex items-center justify-between mt-2">
                      <span className="font-bold pos-money text-primary">
                        {formatCurrency(product.sale_price)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isOutOfStock ? 'bg-destructive/20 text-destructive' :
                        isLowStock ? 'bg-warning/20 text-warning' :
                        'bg-success/20 text-success'
                      }`}>
                        {stockQty}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-96 flex flex-col bg-card border-l border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Carrinho</h2>
            </div>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-50" />
              <p>Carrinho vazio</p>
              <p className="text-sm">Adicione produtos para iniciar uma venda</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="pos-cart-item">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.product.sale_price)} x {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="w-20 text-right">
                  <p className="font-semibold pos-money">{formatCurrency(item.total)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeFromCart(item.product.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="pos-money">{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-success">
              <span className="flex items-center gap-1">
                <Percent className="w-3 h-3" />
                Desconto
              </span>
              <span className="pos-money">-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold border-t border-border pt-3">
            <span>Total</span>
            <span className="pos-money text-primary">{formatCurrency(total)}</span>
          </div>

          <Button
            className="w-full pos-button-success h-14 text-lg"
            disabled={cart.length === 0}
            onClick={() => setPaymentModalOpen(true)}
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Finalizar Venda
          </Button>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Venda</DialogTitle>
            <DialogDescription>
              Selecione a forma de pagamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Total display */}
            <div className="text-center py-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total a pagar</p>
              <p className="text-3xl font-bold pos-money text-primary">
                {formatCurrency(total)}
              </p>
            </div>

            {/* Payment methods */}
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map(({ method, label, icon }) => (
                <button
                  key={method}
                  onClick={() => setSelectedPayment(method)}
                  className={`pos-card-interactive flex flex-col items-center gap-2 p-4 ${
                    selectedPayment === method ? 'border-primary ring-2 ring-primary' : ''
                  }`}
                >
                  {icon}
                  <span className="font-medium text-sm">{label}</span>
                </button>
              ))}
            </div>

            {/* Customer name (optional) */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Nome do Cliente (opcional)
              </label>
              <Input
                placeholder="Nome do cliente"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="pos-input"
              />
            </div>

            {/* Complete button */}
            <Button
              className="w-full pos-button-success h-12"
              onClick={handleCompleteSale}
              disabled={processing}
            >
              {processing ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSPage;
