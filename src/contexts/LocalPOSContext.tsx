import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isValidId, sanitizeId } from '@/lib/uuid';
import { syncManager } from '@/lib/syncQueue';

export interface LocalProduct {
  id: string;
  name: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  isActive: boolean;
  code?: string;
  barcode?: string;
  imageUrl?: string | null;
  galleryUrls?: string[];
  description?: string | null;
  categoryId?: string | null;
}

export interface LocalCartItem {
  product: LocalProduct;
  quantity: number;
  discount: number;
  total: number;
}

export interface PaymentDetails {
  method: 'cash' | 'mpesa' | 'emola' | 'card' | 'split' | 'voucher';
  amountReceived: number;
  change: number;
  splitDetails?: {
    cashAmount: number;
    electronicAmount: number;
    electronicMethod: 'mpesa' | 'emola' | 'card';
  };
  voucherDetails?: {
    code: string;
    voucherId: string;
    originalMethod: string;
    customerName?: string;
    phoneNumber?: string;
  };
  sellerId?: string;
  sellerName?: string;
}

export interface LocalSale {
  id: string;
  items: LocalCartItem[];
  subtotal: number;
  discount: number;
  total: number;
  costTotal?: number;
  profit?: number;
  status: 'open' | 'completed' | 'cancelled' | 'pending' | 'refunded';
  paymentMethod?: string;
  paymentDetails?: PaymentDetails;
  amountReceived?: number;
  changeGiven?: number;
  createdAt: Date;
  storeId: string;
  sellerId?: string;
  sellerName?: string;
  isOffline?: boolean;
  synced?: boolean;
  cancellationReason?: string;
}

export interface LocalStore {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  city?: string;
  business_type?: string;
  fiscal_regime?: string;
}

export interface LocalSeller {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'seller';
  storeId: string;
  isActive: boolean;
  password?: string;
}

export interface LocalCashRegister {
  id: string;
  storeId: string;
  sellerId: string;
  sellerName: string;
  openingAmount: number;
  closingAmount?: number;
  expectedAmount?: number;
  status: 'open' | 'closed';
  openedAt: Date;
  closedAt?: Date;
  salesTotal?: number;
  salesCount?: number;
}

interface LocalPOSState {
  stores: LocalStore[];
  currentStore: LocalStore | null;
  cashRegisters: LocalCashRegister[];
  currentCashRegister: LocalCashRegister | null;
  currentSale: LocalSale | null;
  cart: LocalCartItem[];
  products: LocalProduct[];
  sales: LocalSale[];
  loading: boolean;
}

interface LocalPOSContextType extends LocalPOSState {
  addToCart: (product: LocalProduct) => boolean;
  addManualItem: (name: string, price: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  startNewSale: () => void;
  completeSale: (paymentDetails: PaymentDetails) => Promise<LocalSale | null>;
  openCashRegister: (sellerId: string, sellerName: string, openingAmount: number) => Promise<LocalCashRegister>;
  closeCashRegister: (closingAmount: number) => Promise<void>;
  addProduct: (product: Omit<LocalProduct, 'id'>) => Promise<boolean>;
  updateProduct: (id: string, product: Partial<LocalProduct>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  restoreProduct: (id: string) => Promise<boolean>;
  addStore: (store: any) => Promise<void>;
  updateStore: (id: string, store: any) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  getTotal: () => number;
  getSubtotal: () => number;
  getTotalDiscount: () => number;
  getLastSale: () => LocalSale | null;
  getCancelledSales: () => LocalSale[];
  getCancellationHistory: () => any[];
  cancelCompletedSale: (id: string, reason: string, by: string, name: string) => Promise<boolean>;
  store: LocalStore | null;
  cashRegisterOpen: boolean;
  refreshData: () => Promise<void>;
  setCurrentStore: (storeId: string) => void;
}

const LocalPOSContext = createContext<LocalPOSContextType | undefined>(undefined);

export const useLocalPOS = () => {
  const context = useContext(LocalPOSContext);
  if (!context) throw new Error('useLocalPOS must be used within LocalPOSProvider');
  return context;
};

export const LocalPOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, store: authStore, company } = useAuth();
  const [state, setState] = useState<LocalPOSState>({
    stores: [],
    currentStore: null,
    cashRegisters: [],
    currentCashRegister: null,
    currentSale: null,
    cart: [],
    products: [],
    sales: [],
    loading: true,
  });

  const loadData = useCallback(async (force = false) => {
    if (!isValidId(company?.id)) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));
    try {
      const targetCompanyId = company.id;
      const [productsRes, storesRes, cashRegistersRes, profilesRes] = await Promise.all([
        supabase.from('products').select('*').eq('company_id', targetCompanyId).order('name').limit(500),
        supabase.from('stores').select('*').eq('company_id', targetCompanyId),
        supabase.from('cash_registers').select('*').eq('company_id', targetCompanyId).order('opened_at', { ascending: false }).limit(20),
        supabase.from('profiles').select('*').eq('company_id', targetCompanyId)
      ]);

      const stores = (storesRes.data || []).map(s => ({ 
        id: s.id, name: s.name, address: s.address || '', phone: s.phone || '', isActive: s.is_active, 
        city: (s as any).city, business_type: (s as any).business_type, fiscal_regime: (s as any).fiscal_regime 
      }));
      const storeId = authStore?.id || user?.store_id;
      const currentStore = stores.find(s => s.id === storeId) || stores[0] || null;

      const { data: stockData } = await supabase.from('product_stock').select('product_id, quantity').eq('store_id', currentStore?.id);
      const stockMap = new Map((stockData || []).map(s => [s.product_id, s.quantity]));

      const products = (productsRes.data || []).map(p => ({
        id: p.id,
        name: p.name,
        costPrice: p.cost_price || 0,
        salePrice: p.sale_price || 0,
        stock: stockMap.get(p.id) || 0,
        isActive: p.is_active,
        code: p.code,
        imageUrl: p.image_url
      }));

      const profileMap = new Map(
        (profilesRes.data || []).map((p) => [p.id, p.full_name || p.email || 'Operador'] as const)
      );

      const cashRegisters = (cashRegistersRes.data || []).map(cr => ({
        id: cr.id, storeId: cr.store_id, sellerId: cr.user_id, sellerName: profileMap.get(cr.user_id) || '', openingAmount: cr.opening_amount, expectedAmount: cr.expected_amount, status: cr.status as 'open' | 'closed', openedAt: new Date(cr.opened_at), closedAt: cr.closed_at ? new Date(cr.closed_at) : undefined, salesTotal: 0, salesCount: 0
      }));

      // Pull synced sales
      const { data: syncedSalesData } = await supabase.from('sales')
        .select('*, sale_items(*)')
        .eq('company_id', targetCompanyId)
        .order('created_at', { ascending: false })
        .limit(200);

      const syncedSales: LocalSale[] = (syncedSalesData || []).map(s => ({
        id: s.id,
        items: s.sale_items.map((si: any) => ({
          product: { id: si.product_id, name: si.product_name, salePrice: si.unit_price, costPrice: si.cost_price } as any,
          quantity: si.quantity,
          discount: 0,
          total: si.total
        })),
        subtotal: s.subtotal,
        discount: s.discount_amount,
        total: s.total,
        status: s.status,
        paymentMethod: s.payment_method,
        createdAt: new Date(s.created_at),
        storeId: s.store_id,
        sellerId: s.user_id,
        sellerName: s.seller_name,
        synced: true
      }));

      // Pull pending sales from sync manager
      const pendingTasks = syncManager.getTasksByType('SALE');
      const pendingSales: LocalSale[] = pendingTasks.map(t => {
        const { sale, items, paymentDetails } = t.payload;
        return {
          id: sale.id,
          items: items.map((i: any) => ({
            product: { id: i.product_id, name: i.product_name, salePrice: i.unit_price, costPrice: i.cost_price } as any,
            quantity: i.quantity,
            discount: 0,
            total: i.total
          })),
          subtotal: sale.subtotal,
          discount: sale.discount_amount,
          total: sale.total,
          status: sale.status,
          paymentMethod: sale.payment_method,
          paymentDetails,
          createdAt: new Date(sale.created_at),
          storeId: sale.store_id,
          sellerId: sale.user_id,
          sellerName: sale.seller_name,
          synced: false,
          isOffline: true
        };
      });

      const allSales = [...pendingSales, ...syncedSales].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setState(prev => ({ 
        ...prev, 
        stores, 
        currentStore, 
        products, 
        cashRegisters, 
        sales: allSales,
        // Single source of truth: latest open cash register for the current store
        // (any operator). Aligns dashboard status with history view and prevents
        // FECHADO/ABERTO divergence when a session is opened by a selected seller.
        currentCashRegister: cashRegisters.find(cr => cr.status === 'open' && cr.storeId === currentStore?.id) || null,
        loading: false 
      }));
    } catch (error) {
      console.error('POS Load Error:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [company?.id, authStore?.id, user?.id]);

  useEffect(() => {
    loadData();
    if (!company?.id) return;
    const stockChannel = supabase.channel(`stock-${company.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'product_stock', filter: `company_id=eq.${company.id}` }, (payload) => {
      const data = payload.new as any;
      if (data?.store_id === state.currentStore?.id) {
        setState(prev => ({ ...prev, products: prev.products.map(p => p.id === data.product_id ? { ...p, stock: data.quantity } : p) }));
      }
    }).subscribe();
    return () => { supabase.removeChannel(stockChannel); };
  }, [loadData, company?.id, state.currentStore?.id]);

  const addToCart = (product: LocalProduct) => {
    setState(prev => {
      const existing = prev.cart.find(item => item.product.id === product.id);
      if (existing) {
        const newQuantity = existing.quantity + 1;
        const total = (newQuantity * existing.product.salePrice) - existing.discount;
        return { 
          ...prev, 
          cart: prev.cart.map(item => item.product.id === product.id ? { ...item, quantity: newQuantity, total } : item) 
        };
      }
      return { ...prev, cart: [...prev.cart, { product, quantity: 1, discount: 0, total: product.salePrice }] };
    });
    return true;
  };

  const addManualItem = (name: string, price: number) => {
    const dummyProduct: LocalProduct = { id: `manual-${Date.now()}`, name, salePrice: price, costPrice: 0, stock: 999, isActive: true };
    addToCart(dummyProduct);
  };

  const removeFromCart = (productId: string) => setState(prev => ({ ...prev, cart: prev.cart.filter(i => i.product.id !== productId) }));
  
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setState(prev => ({ 
      ...prev, 
      cart: prev.cart.map(i => i.product.id === productId ? { 
        ...i, 
        quantity, 
        total: (quantity * i.product.salePrice) - i.discount 
      } : i) 
    }));
  };

  const updateDiscount = (productId: string, discount: number) => {
    setState(prev => ({ 
      ...prev, 
      cart: prev.cart.map(i => i.product.id === productId ? { 
        ...i, 
        discount, 
        total: (i.quantity * i.product.salePrice) - discount 
      } : i) 
    }));
  };

  const clearCart = () => setState(prev => ({ ...prev, cart: [] }));
  const startNewSale = () => setState(prev => ({ ...prev, cart: [], currentSale: null }));
  const getTotal = () => state.cart.reduce((acc, item) => acc + item.total, 0);
  const getSubtotal = () => state.cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);
  const getTotalDiscount = () => state.cart.reduce((acc, item) => acc + item.discount, 0);
  const getLastSale = () => state.sales[0] || null;
  const getCancelledSales = () => state.sales.filter(s => s.status === 'cancelled');
  const getCancellationHistory = () => [];

  const completeSale = async (details: PaymentDetails) => {
    if (!state.currentStore?.id || !user?.id) {
      toast.error('Loja ou utilizador não identificados');
      return null;
    }

    const subtotal = getSubtotal();
    const total = getTotal();
    const discount = total < subtotal ? subtotal - total : 0;
    
    // Calculate cost total and profit
    const costTotal = state.cart.reduce((acc, item) => acc + (item.product.costPrice * item.quantity), 0);
    const profit = total - costTotal;

    const effectiveSellerId = details.sellerId || user.id;
    const effectiveSellerName = details.sellerName || user.full_name || user.email;

    // Build canonical RPC payload — single source of truth for both online and offline flows.
    const itemsPayload = state.cart.map(item => ({
      product_id: item.product.id || null,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.product.salePrice,
      cost_price: item.product.costPrice,
      discount_amount: item.discount || 0,
      total: item.total,
    }));

    const clientSaleId = crypto.randomUUID();
    const rpcPayload = {
      p_store_id: state.currentStore.id,
      p_cash_register_id: state.currentCashRegister?.id ?? null,
      p_payment_method: details.method,
      p_items: itemsPayload as any,
      p_subtotal: subtotal,
      p_discount_amount: discount,
      p_discount_percent: 0,
      p_total: total,
      p_customer_name: (details as any).customerName ?? null,
      p_customer_phone: (details as any).customerPhone ?? null,
      p_seller_name: effectiveSellerName,
      p_notes: (details as any).notes ?? null,
      p_voucher_code: details.voucherDetails?.code ?? null,
      p_ip_address: null,
      p_client_sale_id: clientSaleId,
    };

    if (!navigator.onLine) {
      // Offline: enqueue the exact same RPC payload — syncManager will replay it verbatim.
      await syncManager.addTask('SALE', { rpcPayload });

      toast.success('Venda registada offline — será sincronizada assim que a conexão for restabelecida');

      const localSale: LocalSale = {
        id: clientSaleId,
        company_id: company?.id,
        store_id: state.currentStore.id,
        user_id: effectiveSellerId,
        cash_register_id: state.currentCashRegister?.id,
        subtotal,
        total,
        discount_amount: discount,
        payment_method: details.method,
        status: 'completed',
        cost_total: costTotal,
        profit,
        seller_name: effectiveSellerName,
        created_at: new Date().toISOString(),
        items: [...state.cart],
        createdAt: new Date(),
        isOffline: true,
        synced: false,
      } as any;

      setState(prev => ({
        ...prev,
        cart: [],
        products: prev.products.map(p => {
          const cartItem = state.cart.find(ci => ci.product.id === p.id);
          if (cartItem) {
            return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
          }
          return p;
        }),
        sales: [localSale, ...prev.sales]
      }));

      return localSale;
    }

    try {
      // ✅ RPC atômica única — persistência transacional (venda + itens + stock + financeiro + caixa + auditoria + voucher + carteira)
      const { data, error } = await supabase.rpc('pos_complete_sale', rpcPayload as any);

      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.error || 'Falha ao concluir venda');

      toast.success('Venda concluída com sucesso');
      const completedSale = {
        id: result.sale_id,
        company_id: company?.id,
        store_id: state.currentStore.id,
        user_id: effectiveSellerId,
        cash_register_id: state.currentCashRegister?.id,
        subtotal,
        total: result.total,
        discount_amount: discount,
        payment_method: details.method,
        status: 'completed',
        cost_total: costTotal,
        profit: result.profit,
        seller_name: effectiveSellerName,
        items: [...state.cart],
        createdAt: new Date(),
        synced: true,
      } as any;

      setState(prev => ({
        ...prev,
        cart: [],
        sales: [completedSale, ...prev.sales]
      }));

      await loadData(true);
      return completedSale;
    } catch (error: any) {
      console.error('Error completing sale:', error);
      const msg = error?.message || 'Erro desconhecido';
      toast.error('Erro ao processar venda: ' + msg);
      return null;
    }
  };

  const openCashRegister = async (sid: string, sn: string, amt: number) => {
    const { data, error } = await supabase.from('cash_registers').insert({ store_id: state.currentStore?.id, user_id: sid, opening_amount: amt, status: 'open', company_id: company?.id }).select().single();
    if (error) throw error;
    const cr: LocalCashRegister = { id: data.id, storeId: data.store_id, sellerId: data.user_id, sellerName: sn, openingAmount: data.opening_amount, status: 'open', openedAt: new Date(data.opened_at) };
    setState(prev => ({ ...prev, currentCashRegister: cr }));
    return cr;
  };

  const closeCashRegister = async (amt: number) => {
    if (!state.currentCashRegister) return;
    await supabase.from('cash_registers').update({ closing_amount: amt, status: 'closed', closed_at: new Date().toISOString() }).eq('id', state.currentCashRegister.id);
    setState(prev => ({ ...prev, currentCashRegister: null }));
  };

  const addProduct = async (p: any) => {
    const { stock, costPrice, salePrice, isActive, imageUrl, categoryId, galleryUrls, ...rest } = p;
    
    // Map to DB fields
    const dbProduct = {
      ...rest,
      cost_price: costPrice,
      sale_price: salePrice,
      is_active: isActive,
      image_url: imageUrl,
      category_id: categoryId,
      gallery_urls: galleryUrls,
      company_id: company?.id
    };

    if (!navigator.onLine) {
      const tempId = crypto.randomUUID();
      await syncManager.addTask('PRODUCT_UPDATE', { 
        id: tempId, 
        product: { ...dbProduct, id: tempId }, 
        action: 'CREATE' 
      });
      toast.info('Produto salvo localmente. Será sincronizado quando estiver online.');
      // Optimistic update
      setState(prev => ({
        ...prev,
        products: [...prev.products, {
          id: tempId,
          name: p.name,
          costPrice: p.costPrice || 0,
          salePrice: p.salePrice || 0,
          stock: p.stock || 0,
          isActive: p.isActive,
          code: p.code,
          imageUrl: p.imageUrl
        }]
      }));
      return true;
    }

    const { data, error } = await supabase.from('products').insert(dbProduct).select().single();
    
    if (error) {
      toast.error('Erro ao adicionar produto: ' + error.message);
      return false;
    }

    // Update stock if provided
    if (stock !== undefined && state.currentStore?.id) {
      const { data: result, error: stockError } = await supabase.rpc('record_stock_movement', {
        p_product_id: data.id,
        p_store_id: state.currentStore.id,
        p_type: 'entrada',
        p_quantity: stock,
        p_unit_cost: costPrice || 0,
        p_reason: 'Criação inicial de produto'
      });
      
      if (stockError) {
        console.error('Error recording initial stock:', stockError);
      }
    }

    toast.success('Produto adicionado com sucesso');
    await loadData(true);
    return true;
  };

  const updateProduct = async (id: string, p: any) => {
    const { stock, costPrice, salePrice, isActive, imageUrl, categoryId, galleryUrls, ...rest } = p;
    
    // Map to DB fields
    const dbProduct = {
      ...rest,
      cost_price: costPrice,
      sale_price: salePrice,
      is_active: isActive,
      image_url: imageUrl,
      category_id: categoryId,
      gallery_urls: galleryUrls
    };

    if (!navigator.onLine) {
      await syncManager.addTask('PRODUCT_UPDATE', { id, product: dbProduct, action: 'UPDATE' });
      toast.info('Alterações salvas localmente.');
      // Optimistic update
      setState(prev => ({
        ...prev,
        products: prev.products.map(prod => prod.id === id ? { ...prod, ...p } : prod)
      }));
      return true;
    }

    const { error } = await supabase.from('products').update(dbProduct).eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar produto: ' + error.message);
      return false;
    }

    // Update stock if provided
    if (stock !== undefined && state.currentStore?.id) {
      const { data: result, error: stockError } = await supabase.rpc('record_stock_movement', {
        p_product_id: id,
        p_store_id: state.currentStore.id,
        p_type: 'ajuste', // Using 'ajuste' which calculates difference in the RPC
        p_quantity: stock,
        p_unit_cost: costPrice || 0,
        p_reason: 'Atualização manual via cadastro'
      });

      if (stockError) {
        console.error('Error recording stock adjustment:', stockError);
      }
    }

    toast.success('Produto atualizado com sucesso');
    await loadData(true);
    return true;
  };

  const deleteProduct = async (id: string) => {
    if (!navigator.onLine) {
      await syncManager.addTask('PRODUCT_UPDATE', { id, action: 'DELETE' });
      toast.info('Produto será eliminado quando estiver online.');
      // Optimistic update
      setState(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== id)
      }));
      return true;
    }

    // Soft delete
    const { error } = await supabase
      .from('products')
      .update({ 
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id
      })
      .eq('id', id);
    if (error) {
      toast.error('Erro ao eliminar produto: ' + error.message);
      return false;
    }
    toast.success('Produto eliminado com sucesso');
    await loadData(true);
    return true;
  };

  const restoreProduct = async (id: string) => {
    const { data, error } = await supabase.rpc('restore_product', { p_product_id: id });
    if (error) {
      toast.error('Erro ao restaurar produto: ' + error.message);
      return false;
    }
    toast.success('Produto restaurado com sucesso');
    await loadData(true);
    return true;
  };

  const addStore = async (s: any) => { 

    if (!navigator.onLine) {
      const tempId = crypto.randomUUID();
      await syncManager.addTask('STORE_UPDATE', { id: tempId, store: { ...s, id: tempId, company_id: company?.id }, action: 'CREATE' });
      toast.info('Loja salva localmente.');
      return;
    }
    await supabase.from('stores').insert({ ...s, company_id: company?.id }); 
    await loadData(true); 
  };

  const updateStore = async (id: string, s: any) => { 
    if (!navigator.onLine) {
      await syncManager.addTask('STORE_UPDATE', { id, store: s, action: 'UPDATE' });
      toast.info('Alterações da loja salvas localmente.');
      return;
    }
    await supabase.from('stores').update(s).eq('id', id); 
    await loadData(true); 
  };

  const deleteStore = async (id: string) => { 
    if (!navigator.onLine) {
      await syncManager.addTask('STORE_UPDATE', { id, action: 'DELETE' });
      toast.info('Loja será eliminada quando estiver online.');
      return;
    }
    await supabase.from('stores').delete().eq('id', id); 
    await loadData(true); 
  };

  const cancelCompletedSale = async (id: string) => { await supabase.from('sales').update({ status: 'cancelled' }).eq('id', id); await loadData(true); return true; };

  const setCurrentStore = (storeId: string) => {
    const store = state.stores.find(s => s.id === storeId);
    if (store) setState(prev => ({ ...prev, currentStore: store }));
  };

  return (
    <LocalPOSContext.Provider value={{ ...state, store: state.currentStore, cashRegisterOpen: !!state.currentCashRegister, addToCart, addManualItem, removeFromCart, updateQuantity, updateDiscount, clearCart, startNewSale, completeSale, openCashRegister, closeCashRegister, addProduct, updateProduct, deleteProduct, restoreProduct, addStore, updateStore, deleteStore, getTotal, getSubtotal, getTotalDiscount, getLastSale, getCancelledSales, getCancellationHistory, cancelCompletedSale, refreshData: () => loadData(true), setCurrentStore }}>
      {children}
    </LocalPOSContext.Provider>
  );
};
