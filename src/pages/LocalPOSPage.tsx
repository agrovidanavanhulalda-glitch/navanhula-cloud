import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalPOS, LocalProduct, PaymentDetails } from '@/contexts/LocalPOSContext';
import { useAuth } from '@/contexts/AuthContext';
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
  Printer,
  ScanLine,
  PackagePlus,
  Unlock,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import ThermalReceipt from '@/components/reports/ThermalReceipt';
import PaymentModal from '@/components/pos/PaymentModal';
import BarcodeScanner from '@/components/pos/BarcodeScanner';
import BluetoothPrintButton from '@/components/pos/BluetoothPrintButton';
import PostSaleModal from '@/components/pos/PostSaleModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '@/hooks/useOnboarding';

// HYBRID: Local POS data + Cloud Auth

const LocalPOSPage: React.FC = () => {
  const navigate = useNavigate();
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
  const { updateStep } = useOnboarding();

  const { user, company } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showPostSaleModal, setShowPostSaleModal] = useState(false);

  // Handle barcode scan result
  const handleBarcodeScan = useCallback((code: string) => {
    const product = products.find(p => p.barcode === code || p.code === code);
    if (product) {
      handleAddToCart(product);
    } else {
      toast.error(`Produto não encontrado para o código: ${code}`);
    }
  }, [products]);

  // Filter active products - SYNCHRONOUS
  const filteredProducts = products
    .filter(p => p.isActive)
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (p.barcode && p.barcode.includes(searchTerm)) || 
                (p.code && p.code.includes(searchTerm)));

  // Handle add to cart - SYNCHRONOUS
  const handleAddToCart = (product: LocalProduct) => {
    const success = addToCart(product);
    if (success) {
      toast.success(`${product.name} adicionado`, {
        duration: 1500,
        position: 'bottom-center',
      });
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
      updateStep('first_sale_completed');
      setShowPaymentModal(false);

      // Check user preference for skip modal
      const skipModal = localStorage.getItem('navanhula_skip_post_sale_modal') === 'true';
      if (skipModal) {
        setShowReceipt(true);
        setTimeout(() => window.print(), 500);
      } else {
        setShowPostSaleModal(true);
      }
    }
  };

  // Handle receipt print from post-sale modal
  const handlePostSalePrintReceipt = () => {
    setShowPostSaleModal(false);
    setShowReceipt(true);
    setTimeout(() => window.print(), 400);
  };

  const lastSale = getLastSale();

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row w-full bg-background overflow-hidden">
      {/* Three Clear States Logic */}
      {!cashRegisterOpen ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 bg-slate-50/50">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mb-2 animate-pulse"
          >
            <Unlock className="w-12 h-12 text-destructive" />
          </motion.div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-3xl font-bold tracking-tight text-[#0B1F3A]">O Caixa está fechado</h2>
            <p className="text-muted-foreground text-lg">
              Para começar a vender, você precisa abrir o caixa e informar quanto dinheiro tem para o troco.
            </p>
          </div>
          <Button 
            size="lg"
            className="h-20 w-full max-w-sm text-2xl font-black gap-3 shadow-xl hover:scale-105 transition-transform rounded-2xl"
            onClick={() => navigate('/caixa')}
          >
            <Unlock className="w-8 h-8" />
            COMEÇAR O DIA (ABRIR CAIXA)
          </Button>
        </div>
      ) : products.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 bg-slate-50/50">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-2"
          >
            <PackagePlus className="w-12 h-12 text-primary" />
          </motion.div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-3xl font-bold tracking-tight text-[#0B1F3A]">Ainda não tem produtos</h2>
            <p className="text-muted-foreground text-lg">
              Você ainda não cadastrou produtos. Adicione o que você vende para começar a usar o sistema.
            </p>
          </div>
          <Button 
            size="lg"
            className="h-20 w-full max-w-sm text-2xl font-black gap-3 shadow-xl hover:scale-105 transition-transform rounded-2xl"
            onClick={() => navigate('/produtos')}
          >
            <Plus className="w-8 h-8" />
            CADASTRAR MEU PRIMEIRO PRODUTO
          </Button>
        </div>
      ) : (
        <>
          {/* Products Grid - Left Side */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
            {/* Top Search Bar - Large & Prominent */}
            <div className="p-4 md:p-6 bg-white border-b shadow-sm sticky top-0 z-10">
              <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-6 h-6 group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Procure um produto ou use o leitor de código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-16 text-xl border-2 focus-visible:ring-primary shadow-sm rounded-xl"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-16 w-16 flex-shrink-0 border-2 hover:bg-primary/5 hover:text-primary transition-colors rounded-xl"
                    onClick={() => setShowBarcodeScanner(true)}
                  >
                    <ScanLine className="w-8 h-8" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-16 px-6 flex-1 sm:flex-none border-2 gap-2 font-bold text-lg rounded-xl"
                    onClick={() => setShowManualEntry(!showManualEntry)}
                  >
                    <Plus className="w-6 h-6" />
                    ITEM SEM CÓDIGO
                  </Button>
                </div>
              </div>

              {/* Manual Entry Expansion */}
              <AnimatePresence>
                {showManualEntry && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <Card className="mt-4 p-4 border-2 border-dashed bg-secondary/20">
                      <div className="flex flex-wrap items-center gap-3">
                        <Input
                          placeholder="Nome do produto ou serviço"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          className="flex-1 min-w-[200px]"
                        />
                        <Input
                          placeholder="Preço (MT)"
                          type="number"
                          value={manualPrice}
                          onChange={(e) => setManualPrice(e.target.value)}
                          className="w-32"
                        />
                        <Button onClick={handleAddManualItem} className="gap-2">
                          <Plus className="w-4 h-4" />
                          Adicionar
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setShowManualEntry(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Products Scrolling Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredProducts.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.4) }}
                      whileHover={{ y: -5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Card
                        className={`group relative overflow-hidden h-full flex flex-col border-2 hover:border-primary transition-all cursor-pointer ${
                          product.stock <= 0 ? 'opacity-50 grayscale' : 'shadow-sm'
                        }`}
                        onClick={() => product.stock > 0 && handleAddToCart(product)}
                      >
                        <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                            />
                          ) : (
                            <ShoppingCart className="w-10 h-10 text-muted-foreground opacity-20" />
                          )}
                          <div className="absolute top-2 right-2">
                            <Badge variant={product.stock <= 5 ? 'destructive' : 'secondary'} className="font-mono">
                              {product.stock} un
                            </Badge>
                          </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                          <h3 className="font-bold text-base text-[#0B1F3A] leading-tight line-clamp-2">
                            {product.name}
                          </h3>
                          <div className="flex items-center justify-between mt-auto">
                            <p className="text-xl font-black text-primary tabular-nums">
                              {formatCurrency(product.salePrice)}
                            </p>
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                              <Plus className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Search className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-lg">Nenhum produto encontrado para "{searchTerm}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Cart Section - Right Side */}
          <div className="w-full md:w-[380px] lg:w-[420px] bg-white border-l shadow-2xl flex flex-col z-20">
            {/* Cart Header */}
            <div className="p-5 md:p-6 border-b flex items-center justify-between bg-[#0B1F3A] text-white">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-7 h-7" />
                <h2 className="text-2xl font-black tracking-tight uppercase">Itens da Venda</h2>
              </div>
              <Badge variant="outline" className="text-white border-white/30 text-xl py-1.5 px-4 font-black">
                {cart.length} {cart.length === 1 ? 'ITEM' : 'ITENS'}
              </Badge>
            </div>

            {/* Cart Items - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {cart.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 py-20"
                  >
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                      <ShoppingCart className="w-10 h-10 opacity-20" />
                    </div>
                    <p className="text-center font-medium">Nenhum produto selecionado</p>
                    <p className="text-sm text-center px-10">Toque nos produtos ao lado para começar a vender.</p>
                  </motion.div>
                ) : (
                  cart.map((item) => (
                    <motion.div
                      key={item.product.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <Card className="p-3 border-2 hover:border-primary/30 transition-colors shadow-sm overflow-hidden group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[#0B1F3A] truncate">{item.product.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(item.product.salePrice)} x {item.quantity}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="w-6 h-6" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-12 w-12 rounded-lg hover:bg-white hover:shadow-sm flex-shrink-0"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            >
                              <Minus className="w-5 h-5" />
                            </Button>
                            <span className="w-12 text-center font-black text-xl tabular-nums">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-12 w-12 rounded-lg hover:bg-white hover:shadow-sm flex-shrink-0"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            >
                              <Plus className="w-5 h-5" />
                            </Button>
                          </div>
                          <span className="font-bold text-xl text-[#0B1F3A] tabular-nums">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Cart Footer - Total & Checkout */}
            <div className="p-4 md:p-6 bg-slate-50 border-t space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-muted-foreground font-medium">
                  <span>Soma dos Itens</span>
                  <span className="tabular-nums">{formatCurrency(getSubtotal())}</span>
                </div>
                {getTotalDiscount() > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Desconto Aplicado</span>
                    <span className="tabular-nums">-{formatCurrency(getTotalDiscount())}</span>
                  </div>
                )}
                <div className="flex justify-between items-end pt-2 border-t border-slate-200">
                  <span className="text-lg font-bold text-[#0B1F3A]">VALOR A COBRAR</span>
                  <motion.div
                    key={getTotal()}
                    initial={{ scale: 1.1, color: '#2563eb' }}
                    animate={{ scale: 1, color: '#0B1F3A' }}
                    className="text-4xl font-black tracking-tighter tabular-nums text-[#0B1F3A]"
                  >
                    {formatCurrency(getTotal())}
                  </motion.div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                {cart.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-muted-foreground hover:text-destructive gap-2 self-end"
                    onClick={() => {
                      clearCart();
                      toast.success('Carrinho limpo');
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpar tudo
                  </Button>
                )}

                <Button 
                  className="w-full h-20 text-2xl font-black shadow-2xl rounded-2xl gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
                  disabled={cart.length === 0}
                  onClick={() => setShowPaymentModal(true)}
                  style={{ 
                    backgroundColor: cart.length > 0 ? '#10b981' : undefined,
                    boxShadow: cart.length > 0 ? '0 10px 30px -10px rgba(16, 185, 129, 0.5)' : 'none'
                  }}
                >
                  <CreditCard className="w-8 h-8" />
                  PAGAR AGORA
                </Button>
                
                {cart.length === 0 && (
                  <p className="text-center text-sm font-medium text-muted-foreground animate-pulse">
                    Adicione itens para finalizar
                  </p>
                )}
              </div>

              {/* Quick Actions Footer */}
              <div className="flex items-center gap-2 pt-2">
                {lastSale && (
                  <Button 
                    variant="outline" 
                    className="flex-1 h-10 gap-2 text-xs font-bold"
                    onClick={() => setShowReceipt(true)}
                  >
                    <Printer className="w-3 h-3" />
                    ÚLTIMO RECIBO
                  </Button>
                )}
                {lastSale && (
                  <div className="flex-1">
                    <BluetoothPrintButton
                      sale={lastSale}
                      storeName={store.name}
                      storeAddress={store.address}
                      storePhone={store.phone}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Payment Modal with change calculation and split payment */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        total={getTotal()}
        onConfirm={handlePaymentConfirm}
        storeId={store.id}
        storeName={store.name}
      />

      {/* Thermal Receipt Modal */}
      {showReceipt && lastSale && (
        <ThermalReceipt
          sale={lastSale}
          storeName={store.name}
          storeAddress={store.address}
          storePhone={store.phone}
          storeNuit={company?.nif || ''}
          fiscalRegime={(company as any)?.fiscal_regime || ''}
          companyName={company?.name || ''}
          onClose={() => setShowReceipt(false)}
        />
      )}

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={handleBarcodeScan}
      />

      {/* Post-Sale Professional Modal */}
      {lastSale && (
        <PostSaleModal
          isOpen={showPostSaleModal}
          onClose={() => setShowPostSaleModal(false)}
          sale={lastSale}
          storeName={store.name}
          storeAddress={store.address}
          storePhone={store.phone}
          storeNuit={company?.nif || ''}
          fiscalRegime={(company as any)?.fiscal_regime || ''}
          companyName={company?.name || ''}
          onPrintReceipt={handlePostSalePrintReceipt}
        />
      )}
    </div>
  );
};

export default LocalPOSPage;
