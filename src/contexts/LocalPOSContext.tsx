import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { autoIssueFiscalDocument } from '@/lib/fiscalPipeline';
import { isValidId, sanitizeId, isUuid } from '@/lib/uuid';
import { syncManager } from '@/lib/syncQueue';

/**
 * NAVANHULA CLOUD Context - SUPABASE BACKED
 * 
 * - Products, sales, stores, cash registers → Supabase
 * - Cart → in-memory only (ephemeral)
 * - Optimistic updates: local state updated immediately, Supabase in background
 */

// ============ TYPES (kept for backward compat) ============

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
}

export interface LocalSale {
  id: string;
  items: LocalCartItem[];
  subtotal: number;
  discount: number;
  total: number;
  costTotal?: number;
  profit?: number;
  status: 'open' | 'completed' | 'cancelled';
  paymentMethod?: string;
  paymentDetails?: PaymentDetails;
  amountReceived?: number;
  changeGiven?: number;
  createdAt: Date;
  storeId: string;
  sellerId?: string;
  sellerName?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancelledByName?: string;
  cancellationReason?: string;
  isOffline?: boolean;
  synced?: boolean;
}

export interface LocalStore {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
}

export interface LocalSeller {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'vendedor';
  storeId: string;
  isActive: boolean;
  password: string;
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
  salesTotal: number;
  salesCount: number;
}

export interface SaleCancellation {
  id: string;
  saleId: string;
  saleTotal: number;
  reason: string;
  cancelledBy: string;
  cancelledByName: string;
  cancelledAt: Date;
  itemsRestored: number;
}

interface LocalPOSState {
  stores: LocalStore[];
  currentStore: LocalStore;
  sellers: LocalSeller[];
  cashRegisters: LocalCashRegister[];
  currentCashRegister: LocalCashRegister | null;
  currentSale: LocalSale | null;
  cart: LocalCartItem[];
  products: LocalProduct[];
  sales: LocalSale[];
  cancellations: SaleCancellation[];
  loading: boolean;
}

interface LocalPOSContextType extends LocalPOSState {
  addToCart: (product: LocalProduct) => boolean;
  addManualItem: (name: string, price: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  applyItemDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  startNewSale: () => void;
  completeSale: (paymentDetails: PaymentDetails) => Promise<LocalSale | null>;
  cancelSale: () => void;
  cancelCompletedSale: (saleId: string, reason: string, cancelledBy: string, cancelledByName: string) => Promise<boolean>;
  openCashRegister: (sellerId: string, sellerName: string, openingAmount: number) => Promise<LocalCashRegister>;
  closeCashRegister: (closingAmount: number, notes?: string) => Promise<void>;
  getCashRegisterHistory: () => LocalCashRegister[];
  addStore: (store: Omit<LocalStore, 'id'>) => Promise<void>;
  updateStore: (id: string, store: Partial<LocalStore>) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  setCurrentStore: (storeId: string) => void;
  addSeller: (seller: Omit<LocalSeller, 'id'>) => Promise<boolean>;
  updateSeller: (id: string, seller: Partial<LocalSeller>) => Promise<void>;
  deleteSeller: (id: string) => Promise<void>;
  getSellersByStore: (storeId: string) => LocalSeller[];
  addProduct: (product: Omit<LocalProduct, 'id'>) => Promise<boolean>;
  updateProduct: (id: string, product: Partial<LocalProduct>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getSubtotal: () => number;
  getTotal: () => number;
  getTotalDiscount: () => number;
  getLastSale: () => LocalSale | null;
  getSalesByStore: (storeId: string) => LocalSale[];
  getSalesBySeller: (sellerId: string) => LocalSale[];
  getSalesByPeriod: (startDate: Date, endDate: Date) => LocalSale[];
  getCancelledSales: () => LocalSale[];
  getCancellationHistory: () => SaleCancellation[];
  store: LocalStore;
  cashRegisterOpen: boolean;
  refreshData: () => Promise<void>;
}

const LocalPOSContext = createContext<LocalPOSContextType | undefined>(undefined);

const FALLBACK_STORE: LocalStore = {
  id: '',
  name: 'Carregando Loja...',
  address: '',
  phone: '',
  isActive: false,
};

export const useLocalPOS = () => {
  const context = useContext(LocalPOSContext);
  if (!context) {
    console.warn('useLocalPOS called outside LocalPOSProvider – using fallback');
    // Return a safe fallback to prevent crashes during HMR
    return {
      store: { id: '', name: '', address: '', phone: '', email: '' },
      products: [],
      cart: [],
      sales: [],
      cashRegisters: [],
      sellers: [],
      stores: [],
      cancellations: [],
      cashRegisterOpen: false,
      currentCashRegister: null,
      currentSeller: null,
      setCurrentSeller: () => {},
      addToCart: () => false,
      addManualItem: () => {},
      removeFromCart: () => {},
      updateQuantity: () => {},
      clearCart: () => {},
      completeSale: () => null as any,
      getSubtotal: () => 0,
      getTotal: () => 0,
      getTotalDiscount: () => 0,
      getLastSale: () => null,
      openCashRegister: () => null as any,
      closeCashRegister: () => null as any,
      getSalesByPeriod: () => [],
      addProduct: async () => {},
      updateProduct: async () => {},
      deleteProduct: async () => {},
      addStore: async () => {},
      updateStore: async () => {},
      deleteStore: async () => {},
      switchStore: () => {},
      addSeller: async () => {},
      updateSeller: async () => {},
      deleteSeller: async () => {},
      cancelSale: () => null as any,
      refreshData: async () => {},
    } as any;
  }
  return context;
};

// ============ MAPPERS ============

const mapDbProductToLocal = (p: any, stockQty: number): LocalProduct => ({
  id: p.id,
  name: p.name,
  costPrice: p.cost_price || 0,
  salePrice: p.sale_price || 0,
  stock: stockQty,
  isActive: p.is_active ?? true,
  code: p.code,
  barcode: p.barcode,
  imageUrl: p.image_url || null,
  description: p.description || null,
  categoryId: p.category_id || null,
});

const mapDbStoreToLocal = (s: any): LocalStore => ({
  id: s.id,
  name: s.name,
  address: s.address || '',
  phone: s.phone || '',
  isActive: s.is_active ?? true,
});

const mapDbCashRegisterToLocal = (cr: any, profileName?: string): LocalCashRegister => ({
  id: cr.id,
  storeId: cr.store_id,
  sellerId: cr.user_id,
  sellerName: profileName || cr.user_id || '',
  openingAmount: cr.opening_amount || 0,
  closingAmount: cr.closing_amount,
  expectedAmount: cr.expected_amount,
  status: cr.status || 'open',
  openedAt: new Date(cr.opened_at),
  closedAt: cr.closed_at ? new Date(cr.closed_at) : undefined,
  salesTotal: 0,
  salesCount: 0,
});

const mapDbSaleToLocal = (s: any, items: any[], sellerName?: string): LocalSale => {
  const costTotal = s.cost_total || items.reduce((acc: number, si: any) => acc + (si.cost_price || 0) * (si.quantity || 0), 0);
  const profit = s.profit != null ? s.profit : (s.total || 0) - costTotal;
  
  return {
    id: s.id,
    items: items.map((si: any) => ({
      product: {
        id: si.product_id,
        name: si.product_name || 'Produto',
        costPrice: si.cost_price || 0,
        salePrice: si.unit_price || 0,
        stock: 0,
        isActive: true,
      },
      quantity: si.quantity || 1,
      discount: si.discount_amount || 0,
      total: si.total || 0,
    })),
    subtotal: s.subtotal || 0,
    discount: s.discount_amount || 0,
    total: s.total || 0,
    costTotal,
    profit,
    status: s.status === 'cancelled' ? 'cancelled' : 'completed',
    paymentMethod: s.payment_method,
    createdAt: new Date(s.created_at),
    storeId: s.store_id,
    sellerId: s.user_id,
    sellerName: s.seller_name || sellerName || undefined,
    cancellationReason: s.notes || undefined,
    synced: true,
  };
};

// ============ PROVIDER ============

export const LocalPOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, store: authStore, company, refreshUserData } = useAuth();

  const [state, setState] = useState<LocalPOSState>({
    stores: [],
    currentStore: { ...FALLBACK_STORE },
    sellers: [],
    cashRegisters: [],
    currentCashRegister: null,
    currentSale: null,
    cart: [],
    products: [],
    sales: [],
    cancellations: [],
    loading: true,
  });

  const [lastSale, setLastSale] = useState<LocalSale | null>(null);
  const dataLoaded = useRef(false);
  const fetchingRef = useRef<string | null>(null);
  const lastFetchTime = useRef<number>(0);

  const loadData = useCallback(async (force = false) => {
    // Enterprise guard: block queries if UUIDs are not real
    if (!isValidId(company?.id)) {
      console.warn('[POS] Invalid company ID, skipping data load');
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    // Prevent redundant fetches (deduplication 3s for dashboard stability), unless forced
    const now = Date.now();
    if (!force && fetchingRef.current === company.id && now - lastFetchTime.current < 3000) return;
    fetchingRef.current = company.id;
    lastFetchTime.current = now;

    if (force) {
      console.log('[POS] Forced refresh requested');
    }

    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const storeId = sanitizeId(authStore?.id || user?.store_id);
      const targetCompanyId = company.id;

      if (!isValidId(targetCompanyId)) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      // Fetch all data in parallel, filtering by company_id where applicable
      const [
        productsRes,
        storesRes,
        cashRegistersRes,
      ] = await Promise.all([
        (supabase.from('products').select('*') as any).eq('company_id', targetCompanyId).eq('is_active', true).order('name'),
        (supabase.from('stores').select('*') as any).eq('company_id', targetCompanyId),
        (supabase.from('cash_registers').select('*') as any).eq('company_id', targetCompanyId).order('opened_at', { ascending: false }).limit(50),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (storesRes.error) throw storesRes.error;

      const storeIds = (storesRes.data || []).map(s => s.id);
      let salesResData = [];
      
      if (storeIds.length > 0) {
        const { data, error: salesError } = await supabase
          .from('sales')
          .select('*, sale_items(*)')
          .in('store_id', storeIds)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (salesError) throw salesError;
        salesResData = data || [];
      }

      // Fetch stock for these products in the current store
      let stockMap = new Map<string, number>();
      if (storeId) {
        const { data: stockData } = await supabase
          .from('product_stock')
          .select('*')
          .eq('store_id', storeId);
        
        (stockData || []).forEach((s: any) => {
          stockMap.set(s.product_id, s.quantity || 0);
        });
      }

      const products: LocalProduct[] = (productsRes.data || []).map((p: any) =>
        mapDbProductToLocal(p, stockMap.get(p.id) || 0)
      );

      const stores: LocalStore[] = (storesRes.data || []).map(mapDbStoreToLocal);
      
      // Map cash registers
      const crUserIds = [...new Set((cashRegistersRes.data || []).map((cr: any) => cr.user_id))];
      let profileMap = new Map<string, string>();
      if (crUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', crUserIds as string[]);
        (profilesData || []).forEach((p: any) => profileMap.set(p.id, p.full_name));
      }
      
      const cashRegisters = (cashRegistersRes.data || []).map((cr: any) =>
        mapDbCashRegisterToLocal(cr, profileMap.get(cr.user_id))
      );
      const openRegister = cashRegisters.find(cr => cr.status === 'open' && cr.sellerId === user.id) || null;

      const sales: LocalSale[] = (salesResData || []).map((s: any) =>
        mapDbSaleToLocal(s, s.sale_items || [], profileMap.get(s.user_id))
      );

      setState(prev => {
        let currentStore = stores.find(s => s.id === storeId);
        
        // AUTO-FALLBACK ENTERPRISE: Se não houver loja selecionada mas existem lojas, escolhe a primeira
        if (!currentStore && stores.length > 0) {
          currentStore = stores[0];
          console.log('[POS] Fallback automático para primeira loja:', currentStore.id);
          
          // Sincroniza em background sem bloquear
          supabase.rpc('set_active_store', { p_store_id: currentStore.id }).then(({ error }) => {
            if (error) console.error('[POS] Erro ao sincronizar fallback de loja:', error);
            else {
              console.log('[POS] Sincronização de fallback concluída');
              refreshUserData(); // Atualiza AuthContext para refletir a nova loja
            }
          });
        } else if (!currentStore) {
          currentStore = prev.currentStore;
        }

        return {
          ...prev,
          products,
          stores,
          currentStore,
          cashRegisters,
          currentCashRegister: openRegister,
          sales,
          loading: false,
        };
      });
      
      dataLoaded.current = true;
    } catch (error) {
      console.error('[POS] Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do sistema');
      setState(prev => ({ ...prev, loading: false }));
    } finally {
      fetchingRef.current = null;
    }
  }, [user?.id, company?.id, authStore?.id, refreshUserData]);


  // ============ LOAD DATA FROM SUPABASE ============
  useEffect(() => {
    loadData();

    const companyId = company?.id;
    if (!companyId) return;

    // Enterprise Realtime subscriptions
    const channel = supabase
      .channel('pos-realtime-updates')
      // 1. Stock updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_stock',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('[POS] Realtime stock update:', payload);
          setState(prev => {
            const updatedProducts = prev.products.map(p => {
              const data = payload.new as any;
              if (p.id === data?.product_id && data?.store_id === (authStore?.id || user?.store_id)) {
                return { ...p, stock: data.quantity };
              }
              return p;
            });
            return { ...prev, products: updatedProducts };
          });
        }
      )
      // 2. Product updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `company_id=eq.${companyId}`
        },
        async (payload) => {
          console.log('[POS] Realtime product update:', payload.eventType);
          if (payload.eventType === 'INSERT') {
            const newProd = payload.new as any;
            // When a new product is added, we might need to fetch its stock too
            // or just add it with 0 stock initially
            setState(prev => ({
              ...prev,
              products: [...prev.products, mapDbProductToLocal(newProd, 0)].sort((a, b) => a.name.localeCompare(b.name))
            }));
            // Refresh to get correct stock mapping if needed
            loadData(true);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setState(prev => ({
              ...prev,
              products: prev.products.map(p => p.id === updated.id ? { ...p, ...mapDbProductToLocal(updated, p.stock) } : p)
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setState(prev => ({
              ...prev,
              products: prev.products.filter(p => p.id !== oldId)
            }));
          }
        }
      )
      // 3. Store updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stores',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('[POS] Realtime store update:', payload.eventType);
          if (payload.eventType === 'INSERT') {
            const newStore = mapDbStoreToLocal(payload.new);
            setState(prev => ({
              ...prev,
              stores: [...prev.stores, newStore]
            }));
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapDbStoreToLocal(payload.new);
            setState(prev => ({
              ...prev,
              stores: prev.stores.map(s => s.id === updated.id ? updated : s)
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setState(prev => ({
              ...prev,
              stores: prev.stores.filter(s => s.id !== oldId)
            }));
          }
        }
      )
      // 3.1 Branch updates (in case branches is used instead of stores)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'branches',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('[POS] Realtime branch update:', payload.eventType);
          loadData(true);
        }
      )
      // 4. Sales updates (for history)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales',
        },
        (payload) => {
          // If the sale belongs to one of our stores, refresh
          const newSale = payload.new as any;
          setState(prev => {
            const isOurStore = prev.stores.some(s => s.id === newSale.store_id);
            if (isOurStore && !prev.sales.some(s => s.id === newSale.id)) {
              loadData(true);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, company?.id, authStore?.id]);

  // Reload when store changes in auth
  useEffect(() => {
    if (authStore?.id && authStore.id !== state.currentStore.id && dataLoaded.current) {
      dataLoaded.current = false;
    }
  }, [authStore?.id]);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // ============ CART ACTIONS (in-memory only) ============

  const addToCart = useCallback((product: LocalProduct): boolean => {
    if (!product.isActive) {
      toast.error('Produto inativo');
      return false;
    }
    let success = true;
    setState(prev => {
      const existingIndex = prev.cart.findIndex(item => item.product.id === product.id);
      const currentQty = existingIndex >= 0 ? prev.cart[existingIndex].quantity : 0;
      const newQty = currentQty + 1;
      if (newQty > product.stock) {
        success = false;
        return prev;
      }
      if (existingIndex >= 0) {
        const newCart = [...prev.cart];
        const item = { ...newCart[existingIndex] };
        item.quantity = newQty;
        item.total = item.quantity * item.product.salePrice - item.discount;
        newCart[existingIndex] = item;
        return { ...prev, cart: newCart };
      }
      return {
        ...prev,
        cart: [...prev.cart, { product, quantity: 1, discount: 0, total: product.salePrice }],
      };
    });
    if (!success) {
      toast.error(`Estoque insuficiente! Disponível: ${product.stock}`);
    }
    return success;
  }, []);

  const addManualItem = useCallback((name: string, price: number) => {
    const manualProduct: LocalProduct = {
      id: `manual-${generateId()}`,
      name,
      costPrice: 0,
      salePrice: price,
      stock: 999,
      isActive: true,
    };
    setState(prev => ({
      ...prev,
      cart: [...prev.cart, { product: manualProduct, quantity: 1, discount: 0, total: price }],
    }));
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setState(prev => ({ ...prev, cart: prev.cart.filter(item => item.product.id !== productId) }));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setState(prev => {
      const item = prev.cart.find(i => i.product.id === productId);
      if (item && quantity > item.product.stock) {
        toast.error(`Estoque insuficiente! Disponível: ${item.product.stock}`);
        return prev;
      }
      return {
        ...prev,
        cart: prev.cart.map(item =>
          item.product.id === productId
            ? { ...item, quantity, total: quantity * item.product.salePrice - item.discount }
            : item
        ),
      };
    });
  }, [removeFromCart]);

  const applyItemDiscount = useCallback((productId: string, discount: number) => {
    setState(prev => ({
      ...prev,
      cart: prev.cart.map(item =>
        item.product.id === productId
          ? { ...item, discount, total: item.quantity * item.product.salePrice - discount }
          : item
      ),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setState(prev => ({ ...prev, cart: [] }));
  }, []);

  // ============ SALE ACTIONS ============

  const startNewSale = useCallback(() => {
    const newSale: LocalSale = {
      id: generateId(),
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      status: 'open',
      createdAt: new Date(),
      storeId: state.currentStore.id,
    };
    setState(prev => ({ ...prev, currentSale: newSale, cart: [] }));
  }, [state.currentStore.id]);

  const completeSale = useCallback(async (paymentDetails: PaymentDetails): Promise<LocalSale | null> => {
    
    if (state.cart.length === 0) {
      toast.error('Carrinho vazio');
      return null;
    }

    const subtotal = state.cart.reduce((acc, item) => acc + item.quantity * item.product.salePrice, 0);
    const discount = state.cart.reduce((acc, item) => acc + item.discount, 0);
    const total = subtotal - discount;
    const costTotal = state.cart.reduce((acc, item) => acc + item.product.costPrice * item.quantity, 0);
    const saleProfit = total - costTotal;

    const saleId = crypto.randomUUID();
    const storeId = state.currentStore.id;
    
    if (storeId === 'fallback' || !storeId) {
      toast.error('Loja não identificada. Por favor, selecione uma loja.');
      return null;
    }

    const sellerName = state.currentCashRegister?.sellerName || user?.full_name || (user?.email ? user.email.split('@')[0] : 'Vendedor');

    const completedSale: LocalSale = {
      id: saleId,
      items: [...state.cart],
      subtotal,
      discount,
      total,
      costTotal,
      profit: saleProfit,
      status: 'completed',
      paymentMethod: paymentDetails.method,
      paymentDetails,
      amountReceived: paymentDetails.amountReceived,
      changeGiven: paymentDetails.change,
      createdAt: new Date(),
      storeId,
      sellerId: user?.id,
      sellerName,
      isOffline: !navigator.onLine,
      synced: navigator.onLine,
    };

    try {
      // 1. Inserir venda no Supabase
      if (!isValidId(storeId)) {
        toast.error('Erro crítico: Loja inválida para venda. Recarregue o sistema.');
        return null;
      }

      const salePayload = {
        id: saleId,
        store_id: storeId,
        user_id: user?.id,
        cash_register_id: state.currentCashRegister?.id || null,
        subtotal,
        discount_amount: discount,
        total,
        cost_total: costTotal,
        profit: saleProfit,
        payment_method: paymentDetails.method as any,
        status: 'completed' as const,
        seller_name: sellerName,
        customer_name: paymentDetails.voucherDetails?.customerName || null,
        customer_phone: paymentDetails.voucherDetails?.phoneNumber || null,
      };

      const saleItems = state.cart.map(item => {
        const isManual = item.product.id.startsWith('manual-');
        return {
          sale_id: saleId,
          product_id: isManual ? null : item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.salePrice,
          cost_price: item.product.costPrice,
          discount_amount: item.discount,
          total: item.total,
          profit: (item.product.salePrice - item.product.costPrice) * item.quantity - item.discount,
        };
      });

      if (navigator.onLine) {
        const { error: saleError } = await supabase.from('sales').insert(salePayload);
        if (saleError) {
          console.warn('[POS] Online sync failed, queuing for retry:', saleError);
          await syncManager.addTask('SALE', { sale: salePayload, items: saleItems, paymentDetails });
        } else {
          const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
          if (itemsError) console.error('[POS] Items sync error:', itemsError);
          
          if (paymentDetails.method !== 'cash') {
            try {
              await supabase.rpc('credit_wallet_from_sale', {
                p_store_id: storeId,
                p_payment_method: paymentDetails.method,
                p_amount: total,
                p_sale_id: saleId,
              });
            } catch (e) {
              console.error('[POS] Wallet credit error:', e);
            }
          }
        }
      } else {
        console.log('[POS] Offline mode: Queuing sale for sync');
        await syncManager.addTask('SALE', { sale: salePayload, items: saleItems, paymentDetails });
        toast.info('Venda salva localmente (offline). Sincronizará automaticamente quando online.');
      }


      // 5. Atualizar estado local
      setState(prev => {
        // Atualizar stock local
        const updatedProducts = prev.products.map(product => {
          const cartItem = prev.cart.find(item => item.product.id === product.id);
          if (cartItem) {
            return { ...product, stock: Math.max(0, product.stock - cartItem.quantity) };
          }
          return product;
        });

        // Atualizar caixa se aberto
        let updatedCashRegisters = prev.cashRegisters;
        let updatedCurrentCashRegister = prev.currentCashRegister;
        if (prev.currentCashRegister) {
          updatedCurrentCashRegister = {
            ...prev.currentCashRegister,
            salesTotal: prev.currentCashRegister.salesTotal + total,
            salesCount: prev.currentCashRegister.salesCount + 1,
          };
          updatedCashRegisters = prev.cashRegisters.map(cr =>
            cr.id === prev.currentCashRegister!.id ? updatedCurrentCashRegister! : cr
          );
        }

        return {
          ...prev,
          products: updatedProducts,
          sales: [completedSale, ...prev.sales],
          currentSale: null,
          cart: [],
          cashRegisters: updatedCashRegisters,
          currentCashRegister: updatedCurrentCashRegister,
        };
      });

      setLastSale(completedSale);
      
      // Auto-issue fiscal document (não aguardamos aqui para não travar a UI)
      autoIssueFiscalDocument({
        sale: completedSale,
        storeId,
        customerName: paymentDetails.voucherDetails?.customerName || 'Consumidor Final',
        customerPhone: paymentDetails.voucherDetails?.phoneNumber,
        taxRate: 0,
      }).catch(err => console.warn('[Fiscal] Erro auto-emissão:', err));

      return completedSale;
    } catch (error: any) {
      console.error('[POS] Exceção na conclusão da venda:', error);
      toast.error('Falha crítica ao finalizar venda');
      return null;
    }
  }, [user?.id, state.currentStore.id, state.currentCashRegister, state.cart]);

  const cancelSale = useCallback(() => {
    setState(prev => ({ ...prev, currentSale: null, cart: [] }));
  }, []);

  const cancelCompletedSale = useCallback(async (
    saleId: string,
    reason: string,
    cancelledBy: string,
    cancelledByName: string
  ): Promise<boolean> => {
    
    try {
      const sale = state.sales.find(s => s.id === saleId);
      if (!sale) {
        toast.error('Venda não encontrada');
        return false;
      }

      if (sale.status === 'cancelled') {
        toast.error('Venda já foi cancelada');
        return false;
      }

      // 1. Atualizar no Supabase
      const { error } = await supabase.from('sales').update({ 
        status: 'cancelled', 
        notes: reason 
      }).eq('id', saleId);

      if (error) {
        console.error('[POS] Erro ao cancelar venda no Supabase:', error);
        toast.error('Erro ao cancelar venda');
        return false;
      }

      // 2. Restaurar stock ( handled by trigger tr_sale_cancellation_to_inventory_movement in DB )
      // No manual loop needed anymore to prevent race conditions and double deductions

      // 3. Atualizar estado local
      setState(prev => {
        const updatedProducts = prev.products.map(product => {
          const saleItem = sale.items.find(item => item.product.id === product.id);
          if (saleItem) {
            return { ...product, stock: product.stock + saleItem.quantity };
          }
          return product;
        });

        const cancelledSale: LocalSale = {
          ...sale,
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy,
          cancelledByName,
          cancellationReason: reason,
        };

        const cancellation: SaleCancellation = {
          id: crypto.randomUUID(),
          saleId: sale.id,
          saleTotal: sale.total,
          reason,
          cancelledBy,
          cancelledByName,
          cancelledAt: new Date(),
          itemsRestored: sale.items.reduce((acc, item) => acc + item.quantity, 0),
        };

        return {
          ...prev,
          sales: prev.sales.map(s => s.id === saleId ? cancelledSale : s),
          products: updatedProducts,
          cancellations: [...prev.cancellations, cancellation],
        };
      });

      toast.success('Venda cancelada com sucesso!');
      return true;
    } catch (error: any) {
      console.error('[POS] Exceção ao cancelar venda:', error);
      toast.error('Erro ao processar cancelamento');
      return false;
    }
  }, [state.sales]);

  // ============ CASH REGISTER ============

  const openCashRegister = useCallback(async (sellerId: string, sellerName: string, openingAmount: number): Promise<LocalCashRegister> => {
    const storeId = state.currentStore.id;
    if (!isValidId(storeId)) {
      toast.error('Erro: Selecione uma loja válida primeiro');
      throw new Error('Invalid store ID');
    }
    const registerId = crypto.randomUUID();

    const newRegister: LocalCashRegister = {
      id: registerId,
      storeId,
      sellerId,
      sellerName,
      openingAmount,
      status: 'open',
      openedAt: new Date(),
      salesTotal: 0,
      salesCount: 0,
    };

    try {
      const { error } = await supabase.from('cash_registers').insert({
        id: registerId,
        store_id: storeId,
        user_id: user?.id,
        opening_amount: openingAmount,
        status: 'open',
      });

      if (error) {
        console.error('[POS] Erro ao abrir caixa no Supabase:', error);
        toast.error('Erro ao abrir caixa');
        throw error;
      }

      setState(prev => ({
        ...prev,
        cashRegisters: [newRegister, ...prev.cashRegisters],
        currentCashRegister: newRegister,
      }));

      toast.success('Caixa aberto com sucesso!');
      return newRegister;
    } catch (error) {
      throw error;
    }
  }, [state.currentStore.id, user?.id]);

  const closeCashRegister = useCallback(async (closingAmount: number) => {
    if (!state.currentCashRegister) return;

    const expectedAmount = state.currentCashRegister.openingAmount + state.currentCashRegister.salesTotal;
    
    try {
      const { error } = await supabase.from('cash_registers').update({
        closing_amount: closingAmount,
        expected_amount: expectedAmount,
        difference: closingAmount - expectedAmount,
        status: 'closed',
        closed_at: new Date().toISOString(),
      }).eq('id', state.currentCashRegister.id);

      if (error) {
        console.error('[POS] Erro ao fechar caixa no Supabase:', error);
        toast.error('Erro ao fechar caixa');
        return;
      }

      setState(prev => {
        const closedRegister: LocalCashRegister = {
          ...prev.currentCashRegister!,
          closingAmount,
          expectedAmount,
          status: 'closed',
          closedAt: new Date(),
        };

        return {
          ...prev,
          cashRegisters: prev.cashRegisters.map(cr => cr.id === closedRegister.id ? closedRegister : cr),
          currentCashRegister: null,
        };
      });

      toast.success('Caixa fechado com sucesso!');
    } catch (error) {
      console.error('[POS] Exceção ao fechar caixa:', error);
    }
  }, [state.currentCashRegister]);

  const getCashRegisterHistory = useCallback(() => state.cashRegisters, [state.cashRegisters]);

  // ============ STORE ACTIONS ============

  const addStore = useCallback(async (store: Omit<LocalStore, 'id'>) => {
    const targetCompanyId = company?.id;

    if (!isValidId(targetCompanyId)) {
      toast.error('Empresa não identificada ou inválida');
      return;
    }

    try {
      const { data, error } = await supabase.from('stores').insert({
        name: store.name,
        address: store.address || null,
        phone: store.phone || null,
        company_id: targetCompanyId,
        is_active: true, // Force active enterprise-style
      }).select().single();

      if (error) {
        console.error('[POS] Erro ao criar loja:', error);
        toast.error('Erro ao criar loja');
        return;
      }

      toast.success('Loja criada com sucesso');
      
      // Auto-activate the new store immediately
      await supabase.rpc('set_active_store', { p_store_id: data.id });
      
      if (refreshUserData) {
        await refreshUserData();
      }
      
      await loadData(true);
    } catch (error) {
      console.error('[POS] Exceção ao criar loja:', error);
    }
  }, [company?.id, loadData, refreshUserData]);

  const updateStore = useCallback(async (id: string, updates: Partial<LocalStore>) => {
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      const { error } = await supabase.from('stores').update(dbUpdates).eq('id', id);

      if (error) {
        console.error('[POS] Erro ao atualizar loja:', error);
        toast.error('Erro ao atualizar loja');
        return;
      }

      setState(prev => {
        const updatedStores = prev.stores.map(s => s.id === id ? { ...s, ...updates } : s);
        const currentStore = prev.currentStore.id === id ? { ...prev.currentStore, ...updates } : prev.currentStore;
        return { ...prev, stores: updatedStores, currentStore };
      });
      toast.success('Loja atualizada!');
    } catch (error) {
      console.error('[POS] Exceção ao atualizar loja:', error);
    }
  }, []);

  const deleteStore = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('stores').update({ is_active: false }).eq('id', id);
      
      if (error) {
        console.error('[POS] Erro ao desativar loja:', error);
        toast.error('Erro ao desativar loja');
        return;
      }

      setState(prev => ({ ...prev, stores: prev.stores.filter(s => s.id !== id) }));
      toast.success('Loja desativada');
    } catch (error) {
      console.error('[POS] Exceção ao desativar loja:', error);
    }
  }, []);

  const setCurrentStore = useCallback(async (storeId: string) => {
    setState(prev => {
      const store = prev.stores.find(s => s.id === storeId);
      if (!store) return prev;
      return { ...prev, currentStore: store };
    });

    const { error } = await supabase.rpc('set_active_store', { p_store_id: storeId });
    if (!error) {
      dataLoaded.current = false;
      await refreshUserData();
      toast.success('Loja alterada');
    } else {
      console.error('[POS] Erro ao trocar loja:', error);
      toast.error('Erro ao trocar de loja');
    }
  }, [refreshUserData]);

  // ============ SELLER ACTIONS ============
  // Sellers are persisted to Supabase profiles table

  const loadSellers = useCallback(async () => {
    const companyId = company?.id;
    if (!companyId) return;
    
    try {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, store_id, is_active')
        .eq('company_id', companyId);
      
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      const roleMap = new Map<string, string>();
      (rolesData || []).forEach((r: any) => roleMap.set(r.user_id, r.role));
      
      const sellers: LocalSeller[] = (profilesData || [])
        .filter((p: any) => p.id !== user?.id) // exclude current admin user
        .map((p: any) => ({
          id: p.id,
          name: p.full_name || '',
          email: p.email || '',
          role: (roleMap.get(p.id) === 'admin' || roleMap.get(p.id) === 'manager') ? 'admin' as const : 'vendedor' as const,
          storeId: p.store_id || '',
          isActive: p.is_active ?? true,
          password: '', // passwords are managed by auth, not exposed
        }));
      
      setState(prev => ({ ...prev, sellers }));
    } catch (error) {
      console.error('[POS] Load sellers error:', error);
    }
  }, [company?.id, user?.id]);

  // Load sellers on mount
  useEffect(() => {
    if (company?.id && user?.id) {
      loadSellers();
    }
  }, [company?.id, user?.id, loadSellers]);

  const addSeller = useCallback(async (seller: Omit<LocalSeller, 'id'>): Promise<boolean> => {
    try {
      const email = seller.email?.trim().toLowerCase();
      const name = seller.name?.trim();
      const rawPassword = seller.password?.trim();
      const password = rawPassword && rawPassword.length >= 6 ? rawPassword : '123456';
      
      if (!name || !email) {
        toast.error('Nome e Email são obrigatórios');
        return false;
      }

      const { data, error } = await supabase.rpc('create_enterprise_seller', {
        p_email: email,
        p_password: password,
        p_full_name: name,
        p_store_id: seller.storeId,
        p_role: seller.role
      });

      if (error) {
        console.error('[POS] Erro ao criar vendedor via RPC:', error);
        toast.error('Erro ao criar vendedor: ' + error.message);
        return false;
      }

      const result = data as any;
      if (!result?.success) {
        toast.error(result?.message || 'Erro ao criar vendedor');
        return false;
      }

      await loadSellers();
      toast.success('Vendedor criado e ativado automaticamente!');
      return true;
    } catch (error: any) {
      console.error('[POS] addSeller exception:', error);
      toast.error('Falha ao processar criação de vendedor');
      return false;
    }
  }, [authStore?.id, company?.id, loadSellers]);

  const updateSeller = useCallback(async (id: string, updates: Partial<LocalSeller>) => {
    setState(prev => ({
      ...prev,
      sellers: prev.sellers.map(s => s.id === id ? { ...s, ...updates } : s),
    }));

    // Persist to Supabase
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.full_name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.storeId !== undefined) dbUpdates.store_id = updates.storeId;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    if (Object.keys(dbUpdates).length > 0) {
      dbUpdates.updated_at = new Date().toISOString();
      await supabase.from('profiles').update(dbUpdates).eq('id', id);
    }

    if (updates.role !== undefined) {
      const dbRole = updates.role === 'admin' ? 'manager' : 'seller';
      await supabase.from('user_roles')
        .update({ role: dbRole })
        .eq('user_id', id);
    }
  }, []);

  const deleteSeller = useCallback(async (id: string) => {
    // Soft-delete: deactivate instead of removing
    setState(prev => ({
      ...prev,
      sellers: prev.sellers.map(s => s.id === id ? { ...s, isActive: false } : s),
    }));

    await supabase.from('profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    toast.success('Vendedor desativado');
  }, []);

  const getSellersByStore = useCallback((storeId: string) => {
    return state.sellers.filter(s => s.storeId === storeId);
  }, [state.sellers]);

  // ============ PRODUCT ACTIONS ============

  const addProduct = useCallback(async (product: Omit<LocalProduct, 'id'>) => {
    // 1. Validar campos obrigatórios
    if (!product.name.trim()) {
      toast.error('O nome do produto é obrigatório');
      return false;
    }

    const targetCompanyId = company?.id;
    if (!isValidId(targetCompanyId)) {
      const msg = 'Erro de sessão: ID da empresa inválido ou ausente. Faça login novamente.';
      console.error('[POS] ' + msg, { companyId: targetCompanyId });
      toast.error(msg);
      return false;
    }

    try {
      // Determinar loja para stock inicial
      const storeIdToUse = sanitizeId(state.currentStore.id) || sanitizeId(authStore?.id);
      const finalStoreId = isValidId(storeIdToUse) ? storeIdToUse : null;
      
      if (!finalStoreId && Number(product.stock) > 0) {
        console.warn('[POS] Criando produto com stock solicitado mas sem loja válida identificada.', { 
          requestedStock: product.stock, 
          storeId: storeIdToUse 
        });
        toast.warning('Stock inicial ignorado: Nenhuma loja ativa selecionada.');
      }
      
      const rpcPayload = {
        p_name: product.name.trim(),
        p_cost_price: Number(product.costPrice) || 0,
        p_sale_price: Number(product.salePrice) || 0,
        p_initial_stock: Math.floor(Number(product.stock)) || 0,
        p_store_id: finalStoreId,
        p_company_id: targetCompanyId,
        p_is_active: product.isActive !== false,
        p_image_url: product.imageUrl || null,
        p_code: product.code?.trim() || null,
        p_category_id: product.categoryId || null,
        p_description: product.description?.trim() || null
      };

      console.group('[POS] Criação de Produto (Enterprise)');
      console.log('Payload enviado:', rpcPayload);

      // 2. Chamada RPC Atómica
      const { data, error } = await supabase.rpc('create_product_with_stock', rpcPayload);

      if (error) {
        console.error('[POS] Erro Supabase RPC:', error);
        console.groupEnd();
        throw new Error(error.message);
      }

      const result = data as any;
      if (result && result.success === false) {
        console.error('[POS] Erro de negócio SQL:', result.error, result.detail);
        console.groupEnd();
        throw new Error(result.error);
      }

      console.log('[POS] Resposta Sucesso:', result);
      console.groupEnd();
      
      // 3. Sincronizar estado local de forma estável
      await loadData(true);
      toast.success(result.message || 'Produto criado com sucesso!');
      return true;
    } catch (error: any) {
      console.error('[POS] Exceção crítica ao criar produto:', error);
      toast.error(`Falha crítica: ${error.message || 'Erro desconhecido'}`);
      return false;
    }
  }, [state.currentStore.id, authStore?.id, company?.id, loadData]);

  const updateProduct = useCallback(async (id: string, updates: Partial<LocalProduct>) => {
    
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
      if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
      if (updates.salePrice !== undefined) dbUpdates.sale_price = updates.salePrice;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;

      if (Object.keys(dbUpdates).length > 0) {
        const { error: updateError } = await supabase.from('products').update(dbUpdates).eq('id', id);
        
        if (updateError) {
          console.error('[POS] Erro ao atualizar produto no Supabase:', updateError);
          toast.error('Erro ao atualizar produto: ' + updateError.message);
          return;
        }
      }

      const storeIdToUse = sanitizeId(state.currentStore.id) || sanitizeId(authStore?.id);

      if (updates.stock !== undefined && storeIdToUse) {
        // Calculate difference for adjustment
        const currentProduct = state.products.find(p => p.id === id);
        const diff = updates.stock - (currentProduct?.stock || 0);
        
        if (diff !== 0) {
          await supabase.rpc('add_inventory_adjustment', {
            p_product_id: id,
            p_store_id: storeIdToUse,
            p_quantity: diff,
            p_type: 'ADJUSTMENT',
            p_reason: 'Ajuste manual via edição de produto'
          });
        }
      }

      // Atualizar dados do servidor para garantir sincronia total
      await loadData();

    } catch (error: any) {
      console.error('[POS] Exceção ao atualizar produto:', error);
      toast.error('Falha crítica ao atualizar produto');
    }
  }, [state.currentStore.id]);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
      
      if (error) {
        console.error('[POS] Erro ao remover produto no Supabase:', error);
        toast.error('Erro ao remover produto');
        return;
      }

      setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
      toast.success('Produto removido com sucesso');
    } catch (error: any) {
      console.error('[POS] Exceção ao remover produto:', error);
      toast.error('Falha crítica ao remover produto');
    }
  }, []);

  // ============ GETTERS ============

  const getSubtotal = useCallback(() => {
    return state.cart.reduce((acc, item) => acc + item.quantity * item.product.salePrice, 0);
  }, [state.cart]);

  const getTotalDiscount = useCallback(() => {
    return state.cart.reduce((acc, item) => acc + item.discount, 0);
  }, [state.cart]);

  const getTotal = useCallback(() => {
    return getSubtotal() - getTotalDiscount();
  }, [getSubtotal, getTotalDiscount]);

  const getLastSale = useCallback(() => lastSale, [lastSale]);

  const getSalesByStore = useCallback((storeId: string) => {
    return state.sales.filter(s => s.storeId === storeId);
  }, [state.sales]);

  const getSalesBySeller = useCallback((sellerId: string) => {
    return state.sales.filter(s => s.sellerId === sellerId);
  }, [state.sales]);

  const getSalesByPeriod = useCallback((startDate: Date, endDate: Date) => {
    return state.sales.filter(s => {
      const saleDate = new Date(s.createdAt);
      return saleDate >= startDate && saleDate <= endDate;
    });
  }, [state.sales]);

  const getCancelledSales = useCallback(() => {
    return state.sales.filter(s => s.status === 'cancelled');
  }, [state.sales]);

  const getCancellationHistory = useCallback(() => {
    return state.cancellations;
  }, [state.cancellations]);

  const value: LocalPOSContextType = {
    ...state,
    store: state.currentStore,
    cashRegisterOpen: state.currentCashRegister?.status === 'open',
    addToCart,
    addManualItem,
    removeFromCart,
    updateQuantity,
    applyItemDiscount,
    clearCart,
    startNewSale,
    completeSale,
    cancelSale,
    cancelCompletedSale,
    openCashRegister,
    closeCashRegister,
    getCashRegisterHistory,
    addStore,
    updateStore,
    deleteStore,
    setCurrentStore,
    addSeller,
    updateSeller,
    deleteSeller,
    getSellersByStore,
    addProduct,
    updateProduct,
    deleteProduct,
    getSubtotal,
    getTotal,
    getTotalDiscount,
    getLastSale,
    getSalesByStore,
    getSalesBySeller,
    getSalesByPeriod,
    getCancelledSales,
    getCancellationHistory,
    refreshData: loadData,
  };

  return (
    <LocalPOSContext.Provider value={value}>
      {children}
    </LocalPOSContext.Provider>
  );
};
