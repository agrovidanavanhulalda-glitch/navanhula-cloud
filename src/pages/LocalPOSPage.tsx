import React, { useState } from 'react';
import { useLocalPOS, LocalProduct, PaymentDetails } from '@/contexts/LocalPOSContext';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Search,
  X,
  Printer
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import ThermalReceipt from '@/components/reports/ThermalReceipt';
import PaymentModal from '@/components/pos/PaymentModal';

// HYBRID: Local POS data + SaaS Auth

const LocalPOSPage: React.FC = () => {
  const {
    cart,
    products,
    store,
    cashRegisterOpen,
    addToCart,
    addManualItem,
    removeFromCart,
    updateQuantity,
    completeSale,
    clearCart,
    getSubtotal,
    getTotal,
    getTotalDiscount,
    getLastSale,
  } = useLocalPOS();

  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  // Filter active products - SYNCHRONOUS
  const filteredProducts = products
    .filter(p => p.isActive)
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Handle add to cart - SYNCHRONOUS
  const handleAddToCart = (product: LocalProduct) => {
    const success = addToCart(product);
    if (success) {
      toast.success(`${product.name} adicionado`);
    }
  };

  // Handle manual item - SYNCHRONOUS
  const handleAddManualItem = () => {
    if (!manualName || !manualPrice) {
      toast.error('Preencha nome e preço');
      return;
    }
    const price = parseFloat(manualPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Preço inválido');
      return;
    }
    addManualItem(manualName, price);
    toast.success(`${manualName} adicionado`);
    setManualName('');
    setManualPrice('');
    setShowManualEntry(false);
  };

  // Handle payment confirmation with full details
  const handlePaymentConfirm = (paymentDetails: PaymentDetails) => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }
    const sale = completeSale(paymentDetails);
    if (sale) {
      const changeMsg = paymentDetails.change > 0 
        ? ` | Troco: ${formatCurrency(paymentDetails.change)}`
        : '';
      toast.success(`Venda concluída!${changeMsg}`);
      setShowPaymentModal(false);
      setShowReceipt(true);
    }
  };

  const lastSale = getLastSale();

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Products Grid - Left Side */}
      <div className="flex-1 p-4 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">PDV - {store.name}</h1>
            <p className="text-sm text-muted-foreground">Operador: {user?.full_name || 'N/A'}</p>
          </div>
          <Badge variant={cashRegisterOpen ? 'default' : 'destructive'}>
            Caixa {cashRegisterOpen ? 'Aberto' : 'Fechado'}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Manual Entry */}
        {showManualEntry && (
          <Card className="p-4 mb-4 bg-secondary/50">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">Item Manual</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowManualEntry(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nome do item"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Preço"
                type="number"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                className="w-32"
              />
              <Button onClick={handleAddManualItem}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Add Manual Item Button */}
        {!showManualEntry && (
          <Button 
            variant="outline" 
            className="mb-4 w-full"
            onClick={() => setShowManualEntry(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Item Manual
          </Button>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                product.stock <= 0 ? 'opacity-50' : ''
              }`}
              onClick={() => product.stock > 0 && handleAddToCart(product)}
            >
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-sm truncate">{product.name}</h3>
                <p className="text-lg font-bold text-primary mt-1">
                  {formatCurrency(product.salePrice)}
                </p>
                <p className={`text-xs ${product.stock <= 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  Estoque: {product.stock}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum produto encontrado</p>
          </div>
        )}
      </div>

      {/* Cart - Right Side */}
      <div className="w-96 border-l bg-card flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Carrinho
            </h2>
            <Badge variant="secondary">{cart.length} itens</Badge>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Carrinho vazio</p>
              <p className="text-sm">Clique nos produtos para adicionar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <Card key={item.product.id} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm truncate flex-1">
                      {item.product.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-6 w-6 p-0"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="font-bold text-primary">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        <div className="border-t p-4 space-y-3">
          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(getSubtotal())}</span>
            </div>
            {getTotalDiscount() > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto</span>
                <span>-{formatCurrency(getTotalDiscount())}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(getTotal())}</span>
            </div>
          </div>

          {/* Clear Cart */}
          {cart.length > 0 && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                clearCart();
                toast.success('Carrinho limpo');
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Carrinho
            </Button>
          )}

          {/* Payment Button - Opens Modal */}
          <Button 
            className="w-full h-14 text-lg"
            disabled={cart.length === 0}
            onClick={() => setShowPaymentModal(true)}
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Finalizar Venda
          </Button>

          {/* Last sale receipt button */}
          {lastSale && !showReceipt && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowReceipt(true)}
            >
              <Printer className="w-4 h-4 mr-2" />
              Ver Último Recibo
            </Button>
          )}
        </div>
      </div>

      {/* Payment Modal with change calculation and split payment */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        total={getTotal()}
        onConfirm={handlePaymentConfirm}
      />

      {/* Thermal Receipt Modal */}
      {showReceipt && lastSale && (
        <ThermalReceipt
          sale={lastSale}
          storeName={store.name}
          storeAddress={store.address}
          storePhone={store.phone}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
};

export default LocalPOSPage;
