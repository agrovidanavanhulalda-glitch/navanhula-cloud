import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';

/**
 * NAVANHULA POS Context - SUPABASE BACKED
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
  completeSale: (paymentDetails: PaymentDetails) => LocalSale | null;
  cancelSale: () => void;
  cancelCompletedSale: (saleId: string, reason: string, cancelledBy: string, cancelledByName: string) => boolean;
  openCashRegister: (sellerId: string, sellerName: string, openingAmount: number) => LocalCashRegister;
  closeCashRegister: (closingAmount: number, notes?: string) => void;
  getCashRegisterHistory: () => LocalCashRegister[];
  addStore: (store: Omit<LocalStore, 'id'>) => void;
  updateStore: (id: string, store: Partial<LocalStore>) => void;
  deleteStore: (id: string) => void;
  setCurrentStore: (storeId: string) => void;
  addSeller: (seller: Omit<LocalSeller, 'id'>) => void;
  updateSeller: (id: string, seller: Partial<LocalSeller>) => void;
  deleteSeller: (id: string) => void;
  getSellersByStore: (storeId: string) => LocalSeller[];
  addProduct: (product: Omit<LocalProduct, 'id'>) => void;
  updateProduct: (id: string, product: Partial<LocalProduct>) => void;
  deleteProduct: (id: string) => void;
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
}

const LocalPOSContext = createContext<LocalPOSContextType | undefined>(undefined);

const FALLBACK_STORE: LocalStore = {
  id: 'fallback',
  name: 'NAVANHULA – Loja Principal',
  address: 'Maputo, Moçambique',
  phone: '+258 84 000 0000',
  isActive: true,
};

export const useLocalPOS = () => {
  const context = useContext(LocalPOSContext);
  if (!context) {
    throw new Error('useLocalPOS must be used within a LocalPOSProvider');
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

const mapDbSaleToLocal = (s: any, items: any[]): LocalSale => ({
  id: s.id,
  items: items.map(si => ({
    product: {
      id: si.product_id,
      name: si.product_name,
      costPrice: si.cost_price || 0,
      salePrice: si.unit_price,
      stock: 0,
      isActive: true,
    },
    quantity: si.quantity,
    discount: si.discount_amount || 0,
    total: si.total,
  })),
  subtotal: s.subtotal || 0,
  discount: s.discount_amount || 0,
  total: s.total || 0,
  status: s.status === 'cancelled' ? 'cancelled' : 'completed',
  paymentMethod: s.payment_method,
  createdAt: new Date(s.created_at),
  storeId: s.store_id,
  sellerId: s.user_id,
});

// ============ PROVIDER ============

export const LocalPOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, store: authStore, company } = useAuth();

  const [state, setState] = useState<LocalPOSState>({
    stores: [],
    currentStore: FALLBACK_STORE,
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

  // ============ LOAD DATA FROM SUPABASE ============
  useEffect(() => {
    if (!user?.id || dataLoaded.current) return;

    const loadData = async () => {
      try {
        const storeId = authStore?.id || user.store_id;
        if (!storeId) {
          setState(prev => ({ ...prev, loading: false }));
          return;
        }

        // Fetch all data in parallel
        const [
          productsRes,
          stockRes,
          storesRes,
          cashRegistersRes,
          salesRes,
        ] = await Promise.all([
          supabase.from('products').select('*').eq('is_active', true),
          supabase.from('product_stock').select('*').eq('store_id', storeId),
          supabase.from('stores').select('*'),
          supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }).limit(50),
          supabase.from('sales').select('*, sale_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }).limit(200),
        ]);

        // Map products with stock
        const stockMap = new Map<string, number>();
        (stockRes.data || []).forEach((s: any) => {
          stockMap.set(s.product_id, s.quantity || 0);
        });

        const products: LocalProduct[] = (productsRes.data || []).map((p: any) =>
          mapDbProductToLocal(p, stockMap.get(p.id) || 0)
        );

        // Map stores
        const stores: LocalStore[] = (storesRes.data || []).map(mapDbStoreToLocal);
        const currentStore = stores.find(s => s.id === storeId) || (stores.length > 0 ? stores[0] : FALLBACK_STORE);

        // Map cash registers - fetch profile names for seller display
        const crUserIds = [...new Set((cashRegistersRes.data || []).map((cr: any) => cr.user_id))];
        let profileMap = new Map<string, string>();
        if (crUserIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', crUserIds);
          (profilesData || []).forEach((p: any) => profileMap.set(p.id, p.full_name));
        }
        const cashRegisters = (cashRegistersRes.data || []).map((cr: any) =>
          mapDbCashRegisterToLocal(cr, profileMap.get(cr.user_id))
        );
        const openRegister = cashRegisters.find(cr => cr.status === 'open') || null;

        // Map sales
        const sales: LocalSale[] = (salesRes.data || []).map((s: any) =>
          mapDbSaleToLocal(s, s.sale_items || [])
        );

        dataLoaded.current = true;

        setState(prev => ({
          ...prev,
          products,
          stores,
          currentStore,
          cashRegisters,
          currentCashRegister: openRegister,
          sales,
          loading: false,
        }));
      } catch (error) {
        console.error('[POS] Load error:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    loadData();
  }, [user?.id, authStore?.id]);

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

  const completeSale = useCallback((paymentDetails: PaymentDetails): LocalSale | null => {
    let completedSale: LocalSale | null = null;

    setState(prev => {
      if (prev.cart.length === 0) return prev;

      const subtotal = prev.cart.reduce((acc, item) => acc + item.quantity * item.product.salePrice, 0);
      const discount = prev.cart.reduce((acc, item) => acc + item.discount, 0);
      const total = subtotal - discount;

      let paymentMethodLabel = paymentDetails.method;
      if (paymentDetails.method === 'split' && paymentDetails.splitDetails) {
        paymentMethodLabel = `split:cash+${paymentDetails.splitDetails.electronicMethod}` as any;
      }

      const saleId = crypto.randomUUID();

      completedSale = {
        id: saleId,
        items: [...prev.cart],
        subtotal,
        discount,
        total,
        status: 'completed',
        paymentMethod: paymentMethodLabel,
        paymentDetails,
        amountReceived: paymentDetails.amountReceived,
        changeGiven: paymentDetails.change,
        createdAt: new Date(),
        storeId: prev.currentStore.id,
        sellerId: prev.currentCashRegister?.sellerId,
        sellerName: prev.currentCashRegister?.sellerName,
      };

      // Update local stock optimistically
      const updatedProducts = prev.products.map(product => {
        const cartItem = prev.cart.find(item => item.product.id === product.id);
        if (cartItem) {
          return { ...product, stock: Math.max(0, product.stock - cartItem.quantity) };
        }
        return product;
      });

      // Update cash register
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
        sales: [completedSale!, ...prev.sales],
        currentSale: null,
        cart: [],
        cashRegisters: updatedCashRegisters,
        currentCashRegister: updatedCurrentCashRegister,
      };
    });

    // Write to Supabase in background
    if (completedSale && user?.id) {
      const sale = completedSale;
      const storeId = state.currentStore.id;

      // Determine valid payment method for DB enum
      const validMethods = ['cash', 'mpesa', 'emola', 'card', 'voucher'];
      let dbPaymentMethod = sale.paymentMethod || 'cash';
      if (!validMethods.includes(dbPaymentMethod)) {
        dbPaymentMethod = 'cash';
      }

      (async () => {
        try {
          // Calculate cost_total and profit
          const costTotal = sale.items.reduce((acc, item) => acc + item.product.costPrice * item.quantity, 0);
          const saleProfit = sale.total - costTotal;

          // Insert sale
          const { error: saleError } = await supabase.from('sales').insert({
            id: sale.id,
            store_id: storeId,
            user_id: user.id,
            cash_register_id: state.currentCashRegister?.id || null,
            subtotal: sale.subtotal,
            discount_amount: sale.discount,
            total: sale.total,
            cost_total: costTotal,
            profit: saleProfit,
            payment_method: dbPaymentMethod as any,
            status: 'completed',
            customer_name: sale.paymentDetails?.voucherDetails?.customerName || null,
            customer_phone: sale.paymentDetails?.voucherDetails?.phoneNumber || null,
          });

          if (saleError) {
            console.error('[POS] Sale insert error:', saleError);
            return;
          }

          // Insert sale items
          const saleItems = sale.items
            .filter(item => !item.product.id.startsWith('manual-'))
            .map(item => ({
              sale_id: sale.id,
              product_id: item.product.id,
              product_name: item.product.name,
              quantity: item.quantity,
              unit_price: item.product.salePrice,
              cost_price: item.product.costPrice,
              discount_amount: item.discount,
              total: item.total,
              profit: (item.product.salePrice - item.product.costPrice) * item.quantity - item.discount,
            }));

          // Also include manual items with a generated product reference
          const manualItems = sale.items
            .filter(item => item.product.id.startsWith('manual-'))
            .map(item => ({
              sale_id: sale.id,
              product_id: item.product.id,
              product_name: item.product.name,
              quantity: item.quantity,
              unit_price: item.product.salePrice,
              cost_price: 0,
              discount_amount: item.discount,
              total: item.total,
              profit: item.total,
            }));

          const allItems = [...saleItems, ...manualItems];
          // Only insert items that have valid product_id (non-manual ones need to exist in products table)
          // For manual items, we skip sale_items insert since product_id FK would fail
          if (saleItems.length > 0) {
            const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
            if (itemsError) {
              console.error('[POS] Sale items insert error:', itemsError);
            }
          }

          // Update stock in Supabase for non-manual items
          for (const item of sale.items.filter(i => !i.product.id.startsWith('manual-'))) {
            await supabase
              .from('product_stock')
              .update({ quantity: item.product.stock - item.quantity, updated_at: new Date().toISOString() })
              .eq('product_id', item.product.id)
              .eq('store_id', storeId);
          }

          // Credit wallet
          if (dbPaymentMethod !== 'cash') {
            await supabase.rpc('credit_wallet_from_sale', {
              p_store_id: storeId,
              p_payment_method: dbPaymentMethod,
              p_amount: sale.total,
              p_sale_id: sale.id,
            });
          }

          console.log('[POS] ✅ Sale synced to backend:', sale.id);
        } catch (error) {
          console.error('[POS] Sync error:', error);
        }
      })();
    }

    if (completedSale) {
      setLastSale(completedSale);
    }

    return completedSale;
  }, [user?.id, state.currentStore.id, state.currentCashRegister?.id]);

  const cancelSale = useCallback(() => {
    setState(prev => ({ ...prev, currentSale: null, cart: [] }));
  }, []);

  const cancelCompletedSale = useCallback((
    saleId: string,
    reason: string,
    cancelledBy: string,
    cancelledByName: string
  ): boolean => {
    let success = false;

    setState(prev => {
      const saleIndex = prev.sales.findIndex(s => s.id === saleId);
      if (saleIndex === -1) {
        toast.error('Venda não encontrada');
        return prev;
      }

      const sale = prev.sales[saleIndex];
      if (sale.status === 'cancelled') {
        toast.error('Venda já foi cancelada');
        return prev;
      }

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
        id: generateId(),
        saleId: sale.id,
        saleTotal: sale.total,
        reason,
        cancelledBy,
        cancelledByName,
        cancelledAt: new Date(),
        itemsRestored: sale.items.reduce((acc, item) => acc + item.quantity, 0),
      };

      success = true;

      return {
        ...prev,
        sales: prev.sales.map(s => s.id === saleId ? cancelledSale : s),
        products: updatedProducts,
        cancellations: [...prev.cancellations, cancellation],
      };
    });

    // Sync cancellation to Supabase
    if (success) {
      (async () => {
        await supabase.from('sales').update({ status: 'cancelled', notes: reason }).eq('id', saleId);
      })();
      toast.success('Venda cancelada com sucesso! Estoque restaurado.');
    }

    return success;
  }, []);

  // ============ CASH REGISTER ============

  const openCashRegister = useCallback((sellerId: string, sellerName: string, openingAmount: number): LocalCashRegister => {
    const registerId = crypto.randomUUID();
    const newRegister: LocalCashRegister = {
      id: registerId,
      storeId: state.currentStore.id,
      sellerId,
      sellerName,
      openingAmount,
      status: 'open',
      openedAt: new Date(),
      salesTotal: 0,
      salesCount: 0,
    };

    setState(prev => ({
      ...prev,
      cashRegisters: [newRegister, ...prev.cashRegisters],
      currentCashRegister: newRegister,
    }));

    // Sync to Supabase
    if (user?.id) {
      (async () => {
        await supabase.from('cash_registers').insert({
          id: registerId,
          store_id: state.currentStore.id,
          user_id: user.id,
          opening_amount: openingAmount,
          status: 'open',
        });
      })();
    }

    return newRegister;
  }, [state.currentStore.id, user?.id]);

  const closeCashRegister = useCallback((closingAmount: number) => {
    setState(prev => {
      if (!prev.currentCashRegister) return prev;
      const expectedAmount = prev.currentCashRegister.openingAmount + prev.currentCashRegister.salesTotal;
      const closedRegister: LocalCashRegister = {
        ...prev.currentCashRegister,
        closingAmount,
        expectedAmount,
        status: 'closed',
        closedAt: new Date(),
      };

      // Sync to Supabase
      (async () => {
        await supabase.from('cash_registers').update({
          closing_amount: closingAmount,
          expected_amount: expectedAmount,
          difference: closingAmount - expectedAmount,
          status: 'closed',
          closed_at: new Date().toISOString(),
        }).eq('id', closedRegister.id);
      })();

      return {
        ...prev,
        cashRegisters: prev.cashRegisters.map(cr => cr.id === closedRegister.id ? closedRegister : cr),
        currentCashRegister: null,
      };
    });
  }, []);

  const getCashRegisterHistory = useCallback(() => state.cashRegisters, [state.cashRegisters]);

  // ============ STORE ACTIONS ============

  const addStore = useCallback((store: Omit<LocalStore, 'id'>) => {
    const storeId = crypto.randomUUID();
    setState(prev => ({
      ...prev,
      stores: [...prev.stores, { ...store, id: storeId }],
    }));

    if (company?.id) {
      (async () => {
        await supabase.from('stores').insert({
          id: storeId,
          name: store.name,
          address: store.address || null,
          phone: store.phone || null,
          company_id: company.id,
          is_active: store.isActive,
        });
      })();
    }
  }, [company?.id]);

  const updateStore = useCallback((id: string, updates: Partial<LocalStore>) => {
    setState(prev => {
      const updatedStores = prev.stores.map(s => s.id === id ? { ...s, ...updates } : s);
      const currentStore = prev.currentStore.id === id ? { ...prev.currentStore, ...updates } : prev.currentStore;
      return { ...prev, stores: updatedStores, currentStore };
    });

    (async () => {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      await supabase.from('stores').update(dbUpdates).eq('id', id);
    })();
  }, []);

  const deleteStore = useCallback((id: string) => {
    setState(prev => ({ ...prev, stores: prev.stores.filter(s => s.id !== id) }));
    (async () => {
      await supabase.from('stores').update({ is_active: false }).eq('id', id);
    })();
  }, []);

  const setCurrentStore = useCallback((storeId: string) => {
    setState(prev => {
      const store = prev.stores.find(s => s.id === storeId);
      if (!store) return prev;
      return { ...prev, currentStore: store };
    });

    // Persist active store in Supabase
    (async () => {
      await supabase.rpc('set_active_store', { p_store_id: storeId });
    })();

    // Reload data for new store
    dataLoaded.current = false;
  }, []);

  // ============ SELLER ACTIONS ============
  // Sellers now map to profiles in Supabase but we keep local interface

  const addSeller = useCallback((seller: Omit<LocalSeller, 'id'>) => {
    const sellerId = generateId();
    setState(prev => ({
      ...prev,
      sellers: [...prev.sellers, { ...seller, id: sellerId }],
    }));
  }, []);

  const updateSeller = useCallback((id: string, updates: Partial<LocalSeller>) => {
    setState(prev => ({
      ...prev,
      sellers: prev.sellers.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  }, []);

  const deleteSeller = useCallback((id: string) => {
    setState(prev => ({ ...prev, sellers: prev.sellers.filter(s => s.id !== id) }));
  }, []);

  const getSellersByStore = useCallback((storeId: string) => {
    return state.sellers.filter(s => s.storeId === storeId);
  }, [state.sellers]);

  // ============ PRODUCT ACTIONS ============

  const addProduct = useCallback((product: Omit<LocalProduct, 'id'>) => {
    const productId = crypto.randomUUID();
    setState(prev => ({
      ...prev,
      products: [...prev.products, { ...product, id: productId }],
    }));

    (async () => {
      const code = `P-${Date.now().toString(36).toUpperCase()}`;
      await supabase.from('products').insert({
        id: productId,
        code,
        name: product.name,
        cost_price: product.costPrice,
        sale_price: product.salePrice,
        is_active: product.isActive,
      });
      // Create stock entry
      if (state.currentStore.id) {
        await supabase.from('product_stock').insert({
          product_id: productId,
          store_id: state.currentStore.id,
          quantity: product.stock,
        });
      }
    })();
  }, [state.currentStore.id]);

  const updateProduct = useCallback((id: string, updates: Partial<LocalProduct>) => {
    setState(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === id ? { ...p, ...updates } : p),
    }));

    (async () => {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
      if (updates.salePrice !== undefined) dbUpdates.sale_price = updates.salePrice;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('products').update(dbUpdates).eq('id', id);
      }
      if (updates.stock !== undefined && state.currentStore.id) {
        await supabase.from('product_stock').upsert({
          product_id: id,
          store_id: state.currentStore.id,
          quantity: updates.stock,
        }, { onConflict: 'product_id,store_id' });
      }
    })();
  }, [state.currentStore.id]);

  const deleteProduct = useCallback((id: string) => {
    setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
    (async () => {
      await supabase.from('products').update({ is_active: false }).eq('id', id);
    })();
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
  };

  return (
    <LocalPOSContext.Provider value={value}>
      {children}
    </LocalPOSContext.Provider>
  );
};
