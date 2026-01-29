import React, { createContext, useContext, useState, useCallback } from 'react';

// 100% LOCAL - NO ASYNC, NO BACKEND, NO LOADING

export interface LocalProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface LocalCartItem {
  product: LocalProduct;
  quantity: number;
  discount: number;
  total: number;
}

export interface LocalSale {
  id: string;
  items: LocalCartItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'open' | 'completed' | 'cancelled';
  paymentMethod?: string;
  createdAt: Date;
}

export interface LocalUser {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'seller';
}

export interface LocalStore {
  id: string;
  name: string;
}

interface LocalPOSState {
  user: LocalUser;
  store: LocalStore;
  cashRegisterOpen: boolean;
  currentSale: LocalSale | null;
  cart: LocalCartItem[];
  products: LocalProduct[];
  sales: LocalSale[];
}

interface LocalPOSContextType extends LocalPOSState {
  // Cart actions - ALL SYNCHRONOUS
  addToCart: (product: LocalProduct) => void;
  addManualItem: (name: string, price: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  applyItemDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  
  // Sale actions - ALL SYNCHRONOUS
  startNewSale: () => void;
  completeSale: (paymentMethod: string) => void;
  cancelSale: () => void;
  
  // Cash register - ALL SYNCHRONOUS
  openCashRegister: () => void;
  closeCashRegister: () => void;
  
  // Product management - ALL SYNCHRONOUS
  addProduct: (product: Omit<LocalProduct, 'id'>) => void;
  
  // Getters
  getSubtotal: () => number;
  getTotal: () => number;
  getTotalDiscount: () => number;
}

const LocalPOSContext = createContext<LocalPOSContextType | undefined>(undefined);

// Default products - available immediately
const DEFAULT_PRODUCTS: LocalProduct[] = [
  { id: 'prod-1', name: 'Coca-Cola 350ml', price: 50, stock: 100 },
  { id: 'prod-2', name: 'Pão Francês', price: 15, stock: 200 },
  { id: 'prod-3', name: 'Arroz 1kg', price: 85, stock: 50 },
  { id: 'prod-4', name: 'Feijão 1kg', price: 95, stock: 50 },
  { id: 'prod-5', name: 'Óleo de Cozinha 900ml', price: 120, stock: 30 },
  { id: 'prod-6', name: 'Açúcar 1kg', price: 65, stock: 40 },
  { id: 'prod-7', name: 'Sal 1kg', price: 25, stock: 60 },
  { id: 'prod-8', name: 'Leite 1L', price: 45, stock: 80 },
];

// Initial state - NO LOADING, READY IMMEDIATELY
const initialState: LocalPOSState = {
  user: { id: 'user-1', name: 'Admin', role: 'admin' },
  store: { id: 'store-1', name: 'Loja Principal' },
  cashRegisterOpen: true, // Always open by default
  currentSale: null,
  cart: [],
  products: DEFAULT_PRODUCTS,
  sales: [],
};

export const useLocalPOS = () => {
  const context = useContext(LocalPOSContext);
  if (!context) {
    throw new Error('useLocalPOS must be used within a LocalPOSProvider');
  }
  return context;
};

export const LocalPOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LocalPOSState>(initialState);

  // Generate simple ID - NO ASYNC
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // ADD TO CART - SYNCHRONOUS
  const addToCart = useCallback((product: LocalProduct) => {
    setState(prev => {
      const existingIndex = prev.cart.findIndex(item => item.product.id === product.id);
      
      if (existingIndex >= 0) {
        const newCart = [...prev.cart];
        const item = newCart[existingIndex];
        item.quantity += 1;
        item.total = item.quantity * item.product.price - item.discount;
        return { ...prev, cart: newCart };
      }
      
      return {
        ...prev,
        cart: [...prev.cart, {
          product,
          quantity: 1,
          discount: 0,
          total: product.price,
        }],
      };
    });
  }, []);

  // ADD MANUAL ITEM - SYNCHRONOUS
  const addManualItem = useCallback((name: string, price: number) => {
    const manualProduct: LocalProduct = {
      id: generateId(),
      name,
      price,
      stock: 999,
    };
    addToCart(manualProduct);
  }, [addToCart]);

  // REMOVE FROM CART - SYNCHRONOUS
  const removeFromCart = useCallback((productId: string) => {
    setState(prev => ({
      ...prev,
      cart: prev.cart.filter(item => item.product.id !== productId),
    }));
  }, []);

  // UPDATE QUANTITY - SYNCHRONOUS
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setState(prev => ({
      ...prev,
      cart: prev.cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity, total: quantity * item.product.price - item.discount }
          : item
      ),
    }));
  }, [removeFromCart]);

  // APPLY ITEM DISCOUNT - SYNCHRONOUS
  const applyItemDiscount = useCallback((productId: string, discount: number) => {
    setState(prev => ({
      ...prev,
      cart: prev.cart.map(item =>
        item.product.id === productId
          ? { ...item, discount, total: item.quantity * item.product.price - discount }
          : item
      ),
    }));
  }, []);

  // CLEAR CART - SYNCHRONOUS
  const clearCart = useCallback(() => {
    setState(prev => ({ ...prev, cart: [] }));
  }, []);

  // START NEW SALE - SYNCHRONOUS
  const startNewSale = useCallback(() => {
    const newSale: LocalSale = {
      id: generateId(),
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      status: 'open',
      createdAt: new Date(),
    };
    
    setState(prev => ({
      ...prev,
      currentSale: newSale,
      cart: [],
    }));
  }, []);

  // COMPLETE SALE - SYNCHRONOUS
  const completeSale = useCallback((paymentMethod: string) => {
    setState(prev => {
      const subtotal = prev.cart.reduce((acc, item) => acc + item.quantity * item.product.price, 0);
      const discount = prev.cart.reduce((acc, item) => acc + item.discount, 0);
      const total = subtotal - discount;
      
      const completedSale: LocalSale = {
        id: prev.currentSale?.id || generateId(),
        items: [...prev.cart],
        subtotal,
        discount,
        total,
        status: 'completed',
        paymentMethod,
        createdAt: new Date(),
      };
      
      return {
        ...prev,
        sales: [...prev.sales, completedSale],
        currentSale: null,
        cart: [],
      };
    });
  }, []);

  // CANCEL SALE - SYNCHRONOUS
  const cancelSale = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentSale: null,
      cart: [],
    }));
  }, []);

  // OPEN CASH REGISTER - SYNCHRONOUS
  const openCashRegister = useCallback(() => {
    setState(prev => ({ ...prev, cashRegisterOpen: true }));
  }, []);

  // CLOSE CASH REGISTER - SYNCHRONOUS
  const closeCashRegister = useCallback(() => {
    setState(prev => ({ ...prev, cashRegisterOpen: false }));
  }, []);

  // ADD PRODUCT - SYNCHRONOUS
  const addProduct = useCallback((product: Omit<LocalProduct, 'id'>) => {
    setState(prev => ({
      ...prev,
      products: [...prev.products, { ...product, id: generateId() }],
    }));
  }, []);

  // GETTERS - SYNCHRONOUS
  const getSubtotal = useCallback(() => {
    return state.cart.reduce((acc, item) => acc + item.quantity * item.product.price, 0);
  }, [state.cart]);

  const getTotalDiscount = useCallback(() => {
    return state.cart.reduce((acc, item) => acc + item.discount, 0);
  }, [state.cart]);

  const getTotal = useCallback(() => {
    return getSubtotal() - getTotalDiscount();
  }, [getSubtotal, getTotalDiscount]);

  const value: LocalPOSContextType = {
    ...state,
    addToCart,
    addManualItem,
    removeFromCart,
    updateQuantity,
    applyItemDiscount,
    clearCart,
    startNewSale,
    completeSale,
    cancelSale,
    openCashRegister,
    closeCashRegister,
    addProduct,
    getSubtotal,
    getTotal,
    getTotalDiscount,
  };

  return (
    <LocalPOSContext.Provider value={value}>
      {children}
    </LocalPOSContext.Provider>
  );
};
