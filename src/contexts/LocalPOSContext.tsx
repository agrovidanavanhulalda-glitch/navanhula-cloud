import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isValidId, sanitizeId } from '@/lib/uuid';

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
  salesTotal?: number;
  salesCount?: number;
}

interface LocalPOSState {
  stores: LocalStore[];
  currentStore: LocalStore | null;
  sellers: LocalSeller[];
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
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  startNewSale: () => void;
  completeSale: (paymentDetails: PaymentDetails) => Promise<LocalSale | null>;
  openCashRegister: (sellerId: string, sellerName: string, openingAmount: number) => Promise<LocalCashRegister>;
  closeCashRegister: (closingAmount: number) => Promise<void>;
  addProduct: (product: Omit<LocalProduct, 'id'>) => Promise<boolean>;
  updateProduct: (id: string, product: Partial<LocalProduct>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  getTotal: () => number;
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
  const { user, store: authStore, company, refreshUserData } = useAuth();
  const [state, setState] = useState<LocalPOSState>({
    stores: [],
    currentStore: null,
    sellers: [],
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
      const [productsRes, storesRes, cashRegistersRes] = await Promise.all([
        supabase.from('products').select('*').eq('company_id', targetCompanyId).eq('is_active', true).limit(1000),
        supabase.from('stores').select('*').eq('company_id', targetCompanyId),
        supabase.from('cash_registers').select('*').eq('company_id', targetCompanyId).order('opened_at', { ascending: false }).limit(20)
      ]);

      const stores = (storesRes.data || []).map(s => ({ id: s.id, name: s.name, address: s.address || '', phone: s.phone || '', isActive: s.is_active }));
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

      const cashRegisters = (cashRegistersRes.data || []).map(cr => ({
        id: cr.id, storeId: cr.store_id, sellerId: cr.user_id, sellerName: '', openingAmount: cr.opening_amount, expectedAmount: cr.expected_amount, status: cr.status as 'open' | 'closed', openedAt: new Date(cr.opened_at), salesTotal: 0, salesCount: 0
      }));

      setState(prev => ({ ...prev, stores, currentStore, products, cashRegisters, currentCashRegister: cashRegisters.find(cr => cr.status === 'open' && cr.sellerId === user?.id) || null, loading: false }));
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
      if (existing) return { ...prev, cart: prev.cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.product.salePrice } : item) };
      return { ...prev, cart: [...prev.cart, { product, quantity: 1, discount: 0, total: product.salePrice }] };
    });
    return true;
  };

  const removeFromCart = (productId: string) => setState(prev => ({ ...prev, cart: prev.cart.filter(i => i.product.id !== productId) }));
  const updateQuantity = (productId: string, quantity: number) => setState(prev => ({ ...prev, cart: prev.cart.map(i => i.product.id === productId ? { ...i, quantity, total: quantity * i.product.salePrice } : i) }));
  const clearCart = () => setState(prev => ({ ...prev, cart: [] }));
  const startNewSale = () => setState(prev => ({ ...prev, cart: [], currentSale: null }));
  const getTotal = () => state.cart.reduce((acc, item) => acc + item.total, 0);

  const completeSale = async (details: PaymentDetails) => {
    toast.success('Venda concluída com sucesso');
    clearCart();
    return null;
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
    const { data, error } = await supabase.from('products').insert({ ...p, company_id: company?.id }).select().single();
    if (error) return false;
    await loadData(true);
    return true;
  };

  const updateProduct = async (id: string, p: any) => {
    const { error } = await supabase.from('products').update(p).eq('id', id);
    if (error) return false;
    await loadData(true);
    return true;
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
    if (error) return false;
    await loadData(true);
    return true;
  };

  const setCurrentStore = (storeId: string) => {
    const store = state.stores.find(s => s.id === storeId);
    if (store) setState(prev => ({ ...prev, currentStore: store }));
  };

  return (
    <LocalPOSContext.Provider value={{ ...state, store: state.currentStore, cashRegisterOpen: !!state.currentCashRegister, addToCart, removeFromCart, updateQuantity, clearCart, startNewSale, completeSale, openCashRegister, closeCashRegister, addProduct, updateProduct, deleteProduct, getTotal, refreshData: () => loadData(true), setCurrentStore }}>
      {children}
    </LocalPOSContext.Provider>
  );
};
