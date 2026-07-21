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
import { QuantityEditor } from '@/components/ui/quantity-editor';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '@/hooks/useOnboarding';
import PageTransition from '@/components/layout/PageTransition';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';


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
    updateDiscount,
    completeSale,
    clearCart,
    getSubtotal,
    getTotal,
    getTotalDiscount,
    getLastSale,
  } = useLocalPOS();
  const { updateStep } = useOnboarding();

  const { user, company, branch } = useAuth();
  const { activeMembers: eligibleSellers, isLoading: loadingSellers } = useTeamMembers({
    permission: 'sales.create',
    branchId: branch?.id ?? null,
  });
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');

  // Default to logged-in user if they appear in the eligible list
  React.useEffect(() => {
    if (!selectedSellerId && user?.id) {
      const meIsEligible = eligibleSellers.some((m) => m.id === user.id);
      if (meIsEligible) setSelectedSellerId(user.id);
      else if (eligibleSellers.length === 1) setSelectedSellerId(eligibleSellers[0].id);
    }
  }, [user?.id, eligibleSellers, selectedSellerId]);

  // Perf metric — POS mount duration (unified team source)
  React.useEffect(() => {
    const t0 = performance.now();
    return () => {
      // eslint-disable-next-line no-console
      console.log('[POS] mount duration ms', Math.round(performance.now() - t0));
    };
  }, []);

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

  const handlePaymentConfirm = async (paymentDetails: PaymentDetails) => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }
    if (!selectedSellerId) {
      toast.error('Selecione o vendedor responsável pela venda');
      return;
    }
    const seller = eligibleSellers.find((m) => m.id === selectedSellerId);
    const detailsWithSeller: PaymentDetails = {
      ...paymentDetails,
      sellerId: selectedSellerId,
      sellerName: seller?.name,
    };

    try {
      const sale = await completeSale(detailsWithSeller);
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
      } else {
        console.warn('[POSPage] Venda não retornada pelo contexto');
      }
    } catch (error) {
      console.error('[POSPage] Erro ao concluir venda:', error);
      toast.error('Erro ao processar venda');
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
    <PageTransition>

    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,_rgba(11,31,58,0.04),_transparent_60%)] bg-slate-50/60">
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
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Search Bar - Premium Enterprise */}
            <div className="px-5 md:px-8 py-4 md:py-5 bg-white/70 backdrop-blur-2xl border-b border-slate-200/60 sticky top-0 z-10">

              <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-[#0B1F3A] transition-colors" />
                  <Input
                    placeholder="Pesquisar produto, código ou SKU…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-4 h-14 text-[15px] bg-white/80 backdrop-blur border border-slate-200/80 focus-visible:ring-2 focus-visible:ring-[#0B1F3A]/20 focus-visible:border-[#0B1F3A]/40 shadow-[0_1px_2px_rgba(15,31,58,0.04)] rounded-xl placeholder:text-slate-400 placeholder:font-normal font-medium text-slate-800 transition-all"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-14 w-14 flex-shrink-0 bg-white border border-slate-200/80 hover:bg-[#0B1F3A]/5 hover:border-[#0B1F3A]/30 hover:text-[#0B1F3A] transition-all rounded-xl shadow-[0_1px_2px_rgba(15,31,58,0.04)]"
                    onClick={() => setShowBarcodeScanner(true)}
                    aria-label="Scanner de código"
                  >
                    <ScanLine className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-14 px-5 flex-1 sm:flex-none bg-white border border-slate-200/80 hover:bg-[#0B1F3A]/5 hover:border-[#0B1F3A]/30 hover:text-[#0B1F3A] gap-2 font-semibold text-sm tracking-tight rounded-xl shadow-[0_1px_2px_rgba(15,31,58,0.04)]"
                    onClick={() => setShowManualEntry(!showManualEntry)}
                  >
                    <Plus className="w-4 h-4" />
                    Item avulso
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
            <div className="flex-1 overflow-y-auto px-5 md:px-8 py-6">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                  {filteredProducts.map((product, i) => {
                    const outOfStock = product.stock <= 0;
                    const lowStock = product.stock > 0 && product.stock <= 5;
                    return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3), ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Card
                        className={`group relative overflow-hidden h-full flex flex-col border border-slate-200/60 rounded-2xl bg-white transition-all duration-300 cursor-pointer hover:border-[#0B1F3A]/30 hover:shadow-[0_12px_32px_-16px_rgba(11,31,58,0.25)] ${
                          outOfStock ? 'opacity-60 grayscale' : 'shadow-[0_1px_3px_rgba(15,31,58,0.05)]'
                        }`}
                        onClick={() => !outOfStock && handleAddToCart(product)}
                      >
                        <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100/70 flex items-center justify-center overflow-hidden relative">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                            />
                          ) : (
                            <ShoppingCart className="w-9 h-9 text-slate-300" strokeWidth={1.5} />
                          )}
                          {outOfStock ? (
                            <div className="absolute top-2.5 left-2.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-slate-900/85 text-white backdrop-blur">
                                Sem stock
                              </span>
                            </div>
                          ) : lowStock ? (
                            <div className="absolute top-2.5 left-2.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-[#D4A94C]/95 text-[#0B1F3A] shadow-sm">
                                Baixo stock
                              </span>
                            </div>
                          ) : null}
                          <div className="absolute top-2.5 right-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wide bg-white/90 backdrop-blur text-slate-600 border border-slate-200/70 shadow-sm">
                              {product.stock} un
                            </span>
                          </div>
                        </div>
                        <div className="p-3.5 flex-1 flex flex-col justify-between gap-2 bg-white">
                          <h3 className="font-semibold text-[14px] text-[#0B1F3A] leading-snug line-clamp-2 tracking-tight">
                            {product.name}
                          </h3>
                          <div className="flex items-center justify-between mt-auto">
                            <p className="text-[17px] font-bold text-[#0B1F3A] tabular-nums tracking-tight">
                              {formatCurrency(product.salePrice)}
                            </p>
                            <div className="w-8 h-8 rounded-full bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] group-hover:bg-[#0B1F3A] group-hover:text-[#D4A94C] transition-all duration-200">
                              <Plus className="w-4 h-4" strokeWidth={2.5} />
                            </div>
                          </div>
                        </div>
                      </Card>

                    </motion.div>
                    );
                  })}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center h-72 text-center px-6"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/70 flex items-center justify-center mb-4 shadow-[0_1px_3px_rgba(15,31,58,0.04)]">
                    <Search className="w-9 h-9 text-slate-300" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#0B1F3A] tracking-tight">Nenhum produto encontrado</h3>
                  <p className="text-[13px] text-slate-500 mt-1 max-w-xs">
                    Tente outro nome, código ou SKU{searchTerm ? <> para <span className="font-medium text-slate-700">"{searchTerm}"</span></> : null}.
                  </p>
                  {searchTerm && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 h-9 rounded-lg text-[12px] font-semibold border-slate-200/80 hover:border-[#0B1F3A]/30 hover:text-[#0B1F3A]"
                      onClick={() => setSearchTerm('')}
                    >
                      Limpar pesquisa
                    </Button>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          {/* Cart Section - Right Side */}
          <div className="w-full md:w-[380px] lg:w-[440px] bg-white border-l border-slate-200 shadow-[-20px_0_50px_-20px_rgba(11,31,58,0.15)] flex flex-col z-20">
            {/* Cart Header — Navy + Gold */}
            <div className="relative p-5 md:p-6 border-b flex items-center justify-between bg-gradient-to-br from-[#0B1F3A] via-[#0F2A50] to-[#0B1F3A] text-white overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4A94C] to-transparent" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/15">
                  <ShoppingCart className="w-5 h-5 text-[#D4A94C]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">Venda em curso</p>
                  <h2 className="text-lg font-bold tracking-tight">Itens da Venda</h2>
                </div>
              </div>
              <Badge variant="outline" className="text-white border-white/20 bg-white/5 text-sm py-1 px-3 font-bold tabular-nums">
                {cart.length} {cart.length === 1 ? 'item' : 'itens'}
              </Badge>
            </div>


            {/* Cart Items - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {cart.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20 px-6"
                  >
                    <div className="relative">
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/70 flex items-center justify-center shadow-[0_1px_3px_rgba(15,31,58,0.05)]">
                        <ShoppingCart className="w-11 h-11 text-slate-300" strokeWidth={1.5} />
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-slate-200/80 flex items-center justify-center shadow-sm">
                        <Plus className="w-4 h-4 text-[#D4A94C]" strokeWidth={2.5} />
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-[15px] font-semibold text-[#0B1F3A] tracking-tight">Carrinho vazio</h3>
                      <p className="text-[13px] text-slate-500 max-w-[220px] leading-relaxed">
                        Toque nos produtos ao lado para iniciar uma nova venda.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  cart.map((item) => {
                    const p: any = item.product;
                    const sku = p.code || p.barcode || p.sku;
                    const category = p.categoryName || p.category;
                    return (
                    <motion.div
                      key={item.product.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <div className="px-4 py-3.5 rounded-xl border border-slate-200/60 bg-white hover:border-[#0B1F3A]/20 hover:shadow-[0_4px_14px_-6px_rgba(11,31,58,0.15)] transition-all group">
                        <div className="flex items-start gap-3.5">
                          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100/70 border border-slate-200/60 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                            ) : (
                              <ShoppingCart className="w-6 h-6 text-slate-300" strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-[15px] text-[#0B1F3A] truncate tracking-tight leading-snug">{item.product.name}</h4>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                              {sku && <span className="font-mono tracking-tight">{sku}</span>}
                              {sku && category && <span className="text-slate-300">•</span>}
                              {category && <span className="truncate">{category}</span>}
                            </div>
                            <p className="text-[12px] text-slate-500 mt-1 tabular-nums">
                              {formatCurrency(item.product.salePrice)} <span className="text-slate-300">/ un</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label={`Remover ${item.product.name}`}
                            className="h-11 w-11 rounded-lg flex items-center justify-center text-slate-400 hover:text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 transition-colors flex-shrink-0 opacity-70 group-hover:opacity-100"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-3.5 gap-3">
                          <div
                            className="inline-flex items-center gap-0.5 bg-slate-100/80 rounded-xl p-1 min-w-[112px] h-12"
                            role="group"
                            aria-label={`Quantidade de ${item.product.name}`}
                          >
                            <button
                              type="button"
                              aria-label="Diminuir quantidade"
                              className="h-11 w-11 rounded-lg flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-sm hover:text-[#0B1F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F3A]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (!isNaN(v) && v > 0) updateQuantity(item.product.id, v);
                              }}
                              aria-label={`Quantidade de ${item.product.name}`}
                              className="w-12 h-11 bg-transparent text-center font-bold text-[16px] tabular-nums text-[#0B1F3A] border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F3A]/30 rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              aria-label="Aumentar quantidade"
                              className="h-11 w-11 rounded-lg flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-sm hover:text-[#0B1F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F3A]/30 transition-all"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            >
                              <Plus className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                          </div>
                          <div className="flex flex-col items-end min-w-0">
                            <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-slate-400">Subtotal</span>
                            <span className="font-bold text-[16px] text-[#0B1F3A] tabular-nums tracking-tight leading-tight">
                              {formatCurrency(item.total)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-dashed border-slate-200/70">
                          <span className="text-[11px] text-slate-500 font-medium">Desconto</span>
                          <Input
                            type="number"
                            value={item.discount || ''}
                            onChange={(e) => updateDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                            placeholder="0,00"
                            className="h-8 text-[12px] w-24 px-2 border-slate-200/70 focus-visible:ring-1 focus-visible:ring-[#0B1F3A]/20 rounded-md tabular-nums"
                            aria-label={`Desconto para ${item.product.name}`}
                          />
                          <span className="text-[11px] text-slate-400">MT</span>
                        </div>
                      </div>
                    </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>

            {/* Cart Footer - Total & Checkout */}
            <div className="p-4 md:p-6 bg-gradient-to-b from-white to-slate-50 border-t border-slate-200 space-y-4">
              {/* Seller selector — RBAC: sales.create @ current branch */}
              <div className="space-y-1.5">

                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  Vendedor Responsável
                </label>
                <Select
                  value={selectedSellerId}
                  onValueChange={setSelectedSellerId}
                  disabled={loadingSellers || eligibleSellers.length === 0}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue
                      placeholder={
                        loadingSellers
                          ? 'A carregar vendedores...'
                          : eligibleSellers.length === 0
                          ? 'Nenhum vendedor com permissão sales.create'
                          : 'Selecionar vendedor'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleSellers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{m.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {m.role}
                            {m.branchName ? ` • ${m.branchName}` : ''}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!loadingSellers && eligibleSellers.length === 0 && (
                  <p className="text-xs text-destructive">
                    Adicione vendedores em <a href="/app/equipa" className="underline">Gestão de Equipa</a>.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,31,58,0.04)] space-y-3">
                <div className="flex justify-between text-[13px] text-slate-500 font-medium">
                  <span>Subtotal</span>
                  <span className="tabular-nums text-slate-700">{formatCurrency(getSubtotal())}</span>
                </div>
                {getTotalDiscount() > 0 && (
                  <div className="flex justify-between text-[13px] text-emerald-600 font-medium">
                    <span>Desconto</span>
                    <span className="tabular-nums">−{formatCurrency(getTotalDiscount())}</span>
                  </div>
                )}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-400">Total</span>
                    <motion.div
                      key={getTotal()}
                      initial={{ scale: 1.06, opacity: 0.7 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="text-[2.25rem] leading-none font-bold tracking-tight tabular-nums text-[#0B1F3A]"
                    >
                      {formatCurrency(getTotal())}
                    </motion.div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-1">
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-destructive hover:bg-destructive/5 gap-1.5 self-end h-8 text-[12px] font-medium"
                    onClick={() => {
                      clearCart();
                      toast.success('Carrinho limpo');
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar
                  </Button>
                )}

                <Button
                  className="group relative w-full h-[60px] text-[15px] font-semibold rounded-2xl gap-3 tracking-tight text-white bg-gradient-to-br from-[#0B1F3A] via-[#12315C] to-[#0B1F3A] hover:from-[#0F2A50] hover:via-[#173C6E] hover:to-[#0F2A50] shadow-[0_10px_30px_-12px_rgba(11,31,58,0.55)] hover:shadow-[0_16px_40px_-14px_rgba(11,31,58,0.7)] ring-1 ring-inset ring-white/10 transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.995] disabled:opacity-40 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-none overflow-hidden"
                  disabled={cart.length === 0 || !selectedSellerId}
                  onClick={() => setShowPaymentModal(true)}
                >
                  <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4A94C]/40 to-transparent" />
                  <span className="w-8 h-8 rounded-full bg-[#D4A94C]/15 flex items-center justify-center ring-1 ring-[#D4A94C]/25 group-hover:bg-[#D4A94C]/25 transition-colors">
                    <CreditCard className="w-4 h-4 text-[#D4A94C]" strokeWidth={2.25} />
                  </span>
                  <span>Receber pagamento</span>
                </Button>

                {cart.length === 0 && (
                  <p className="text-center text-xs font-medium text-slate-400">
                    Escolha os produtos para finalizar a venda
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
        storeId={store?.id || ''}
        storeName={store?.name || ''}
      />

      {/* Thermal Receipt Modal */}
      {showReceipt && lastSale && (
        <ThermalReceipt
          sale={lastSale}
          storeName={store?.name || ''}
          storeAddress={store?.address || ''}
          storePhone={store?.phone || ''}
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
          storeName={store?.name || ''}
          storeAddress={store?.address || ''}
          storePhone={store?.phone || ''}
          storeNuit={company?.nif || ''}
          fiscalRegime={(company as any)?.fiscal_regime || ''}
          companyName={company?.name || ''}
          onPrintReceipt={handlePostSalePrintReceipt}
        />
      )}
      </div>
    </PageTransition>
  );
};


export default LocalPOSPage;
