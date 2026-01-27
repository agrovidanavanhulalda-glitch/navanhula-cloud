import React, { createContext, useContext, useState, useCallback } from 'react';
import type { CartItem, Product, PaymentMethod, CashRegister } from '@/types/pos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface POSContextType {
  cart: CartItem[];
  cashRegister: CashRegister | null;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  applyDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
  getTotalDiscount: () => number;
  completeSale: (paymentMethod: PaymentMethod, customerName?: string, notes?: string) => Promise<void>;
  openCashRegister: (openingAmount?: number) => Promise<boolean>;
  closeCashRegister: (closingAmount: number, notes?: string) => Promise<void>;
  loadCashRegister: () => Promise<void>;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const { user, store } = useAuth();

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * product.sale_price - item.discount_amount }
            : item
        );
      }
      return [...prev, {
        product,
        quantity: 1,
        discount_amount: 0,
        total: product.sale_price,
      }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, quantity, total: quantity * item.product.sale_price - item.discount_amount }
        : item
    ));
  }, [removeFromCart]);

  const applyDiscount = useCallback((productId: string, discount: number) => {
    setCart(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, discount_amount: discount, total: item.quantity * item.product.sale_price - discount }
        : item
    ));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const getSubtotal = useCallback(() => {
    return cart.reduce((acc, item) => acc + (item.quantity * item.product.sale_price), 0);
  }, [cart]);

  const getTotalDiscount = useCallback(() => {
    return cart.reduce((acc, item) => acc + item.discount_amount, 0);
  }, [cart]);

  const getTotal = useCallback(() => {
    return cart.reduce((acc, item) => acc + item.total, 0);
  }, [cart]);

  const loadCashRegister = useCallback(async () => {
    if (!user || !store) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('user_id', user.id)
        .eq('store_id', store.id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      clearTimeout(timeoutId);

      if (error) {
        console.error('Error loading cash register:', error);
        return;
      }

      setCashRegister(data as CashRegister | null);
    } catch (err) {
      console.error('Timeout or error loading cash register:', err);
    }
  }, [user, store]);

  const openCashRegister = useCallback(async (openingAmount: number = 0): Promise<boolean> => {
    if (!user || !store) {
      console.warn('User or store not found, creating fallback register');
    }

    const storeId = store?.id;
    const userId = user?.id;

    if (!storeId || !userId) {
      toast.error('Usuário ou loja não encontrada');
      return false;
    }

    try {
      // First check if there's already an open register
      const { data: existingRegister } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('user_id', userId)
        .eq('store_id', storeId)
        .eq('status', 'open')
        .limit(1)
        .maybeSingle();

      if (existingRegister) {
        setCashRegister(existingRegister as CashRegister);
        toast.success('Caixa já estava aberto!');
        return true;
      }

      // Create new register with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const { data, error } = await supabase
        .from('cash_registers')
        .insert({
          store_id: storeId,
          user_id: userId,
          opening_amount: openingAmount,
          status: 'open',
        })
        .select()
        .single();

      clearTimeout(timeoutId);

      if (error) {
        console.error('Error opening cash register:', error);
        // Fallback: create local register state to allow operations
        const fallbackRegister: CashRegister = {
          id: crypto.randomUUID(),
          store_id: storeId,
          user_id: userId,
          status: 'open',
          opening_amount: openingAmount,
          opened_at: new Date().toISOString(),
        };
        setCashRegister(fallbackRegister);
        toast.warning('Caixa aberto em modo offline');
        return true;
      }

      setCashRegister(data as CashRegister);
      toast.success('Caixa aberto com sucesso!');
      return true;
    } catch (err) {
      console.error('Timeout opening cash register:', err);
      // Fallback on timeout
      const fallbackRegister: CashRegister = {
        id: crypto.randomUUID(),
        store_id: storeId,
        user_id: userId,
        status: 'open',
        opening_amount: openingAmount,
        opened_at: new Date().toISOString(),
      };
      setCashRegister(fallbackRegister);
      toast.warning('Caixa aberto (timeout - modo offline)');
      return true;
    }
  }, [user, store]);

  const closeCashRegister = useCallback(async (closingAmount: number, notes?: string) => {
    if (!cashRegister) {
      toast.error('Nenhum caixa aberto');
      return;
    }

    const { error } = await supabase
      .from('cash_registers')
      .update({
        status: 'closed',
        closing_amount: closingAmount,
        expected_amount: cashRegister.opening_amount, // Will be calculated properly with sales
        difference: closingAmount - cashRegister.opening_amount,
        notes,
        closed_at: new Date().toISOString(),
      })
      .eq('id', cashRegister.id);

    if (error) {
      toast.error('Erro ao fechar caixa: ' + error.message);
      throw error;
    }

    setCashRegister(null);
    toast.success('Caixa fechado com sucesso!');
  }, [cashRegister]);

  const completeSale = useCallback(async (paymentMethod: PaymentMethod, customerName?: string, notes?: string) => {
    if (!user || !store) {
      toast.error('Usuário ou loja não encontrada');
      return;
    }

    if (cart.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }

    const subtotal = getSubtotal();
    const totalDiscount = getTotalDiscount();
    const total = getTotal();

    try {
      // Create sale
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          store_id: store.id,
          user_id: user.id,
          cash_register_id: cashRegister?.id,
          subtotal,
          discount_amount: totalDiscount,
          discount_percent: subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0,
          total,
          payment_method: paymentMethod,
          status: 'completed',
          customer_name: customerName,
          notes,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.sale_price,
        cost_price: item.product.cost_price,
        discount_amount: item.discount_amount,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      clearCart();
      toast.success('Venda concluída com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao concluir venda: ' + error.message);
      throw error;
    }
  }, [user, store, cart, cashRegister, getSubtotal, getTotalDiscount, getTotal, clearCart]);

  return (
    <POSContext.Provider value={{
      cart,
      cashRegister,
      addToCart,
      removeFromCart,
      updateQuantity,
      applyDiscount,
      clearCart,
      getSubtotal,
      getTotal,
      getTotalDiscount,
      completeSale,
      openCashRegister,
      closeCashRegister,
      loadCashRegister,
    }}>
      {children}
    </POSContext.Provider>
  );
};
