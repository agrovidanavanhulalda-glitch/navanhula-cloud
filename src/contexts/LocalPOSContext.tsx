import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

// 100% LOCAL - NO ASYNC, NO BACKEND, NO LOADING

export interface LocalProduct {
  id: string;
  name: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  isActive: boolean;
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

export interface LocalStore {
  id: string;
  name: string;
  address: string;
  phone: string;
}

interface LocalPOSState {
  store: LocalStore;
  cashRegisterOpen: boolean;
  currentSale: LocalSale | null;
  cart: LocalCartItem[];
  products: LocalProduct[];
  sales: LocalSale[];
}

interface LocalPOSContextType extends LocalPOSState {
  // Cart actions - ALL SYNCHRONOUS
  addToCart: (product: LocalProduct) => boolean;
  addManualItem: (name: string, price: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  applyItemDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  
  // Sale actions - ALL SYNCHRONOUS
  startNewSale: () => void;
  completeSale: (paymentMethod: string) => LocalSale | null;
  cancelSale: () => void;
  
  // Cash register - ALL SYNCHRONOUS
  openCashRegister: () => void;
  closeCashRegister: () => void;
  
  // Product management - ALL SYNCHRONOUS
  addProduct: (product: Omit<LocalProduct, 'id'>) => void;
  updateProduct: (id: string, product: Partial<LocalProduct>) => void;
  deleteProduct: (id: string) => void;
  
  // Store management
  updateStore: (store: Partial<LocalStore>) => void;
  
  // Getters
  getSubtotal: () => number;
  getTotal: () => number;
  getTotalDiscount: () => number;
  getLastSale: () => LocalSale | null;
}

const LocalPOSContext = createContext<LocalPOSContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  products: 'navanhula_products',
  sales: 'navanhula_sales',
  store: 'navanhula_store',
};

// Default products with cost and sale price
const DEFAULT_PRODUCTS: LocalProduct[] = [
  { id: 'prod-1', name: 'Coca-Cola 350ml', costPrice: 30, salePrice: 50, stock: 100, isActive: true },
  { id: 'prod-2', name: 'Pão Francês', costPrice: 8, salePrice: 15, stock: 200, isActive: true },
  { id: 'prod-3', name: 'Arroz 1kg', costPrice: 55, salePrice: 85, stock: 50, isActive: true },
  { id: 'prod-4', name: 'Feijão 1kg', costPrice: 60, salePrice: 95, stock: 50, isActive: true },
  { id: 'prod-5', name: 'Óleo de Cozinha 900ml', costPrice: 80, salePrice: 120, stock: 30, isActive: true },
  { id: 'prod-6', name: 'Açúcar 1kg', costPrice: 40, salePrice: 65, stock: 40, isActive: true },
  { id: 'prod-7', name: 'Sal 1kg', costPrice: 15, salePrice: 25, stock: 60, isActive: true },
  { id: 'prod-8', name: 'Leite 1L', costPrice: 30, salePrice: 45, stock: 80, isActive: true },
];

const DEFAULT_STORE: LocalStore = {
  id: 'store-1',
  name: 'NAVANHULA – Loja Principal',
  address: 'Maputo, Moçambique',
  phone: '+258 84 000 0000',
};

// Load from localStorage
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return defaultValue;
};

// Save to localStorage
const saveToStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore errors
  }
};

// Initial state - loaded from localStorage or defaults
const getInitialState = (): LocalPOSState => ({
  store: loadFromStorage(STORAGE_KEYS.store, DEFAULT_STORE),
  cashRegisterOpen: true,
  currentSale: null,
  cart: [],
  products: loadFromStorage(STORAGE_KEYS.products, DEFAULT_PRODUCTS),
  sales: loadFromStorage(STORAGE_KEYS.sales, []),
});

export const useLocalPOS = () => {
  const context = useContext(LocalPOSContext);
  if (!context) {
    throw new Error('useLocalPOS must be used within a LocalPOSProvider');
  }
  return context;
};

export const LocalPOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LocalPOSState>(getInitialState);
  const [lastSale, setLastSale] = useState<LocalSale | null>(null);

  // Persist products to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.products, state.products);
  }, [state.products]);

  // Persist sales to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.sales, state.sales);
  }, [state.sales]);

  // Persist store to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.store, state.store);
  }, [state.store]);

  // Generate simple ID - NO ASYNC
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // ADD TO CART - SYNCHRONOUS with stock check
  const addToCart = useCallback((product: LocalProduct): boolean => {
    // Check if product is active
    if (!product.isActive) {
      toast.error('Produto inativo');
      return false;
    }

    let success = true;

    setState(prev => {
      const existingIndex = prev.cart.findIndex(item => item.product.id === product.id);
      const currentQty = existingIndex >= 0 ? prev.cart[existingIndex].quantity : 0;
      const newQty = currentQty + 1;

      // Check stock
      if (newQty > product.stock) {
        success = false;
        return prev;
      }
      
      if (existingIndex >= 0) {
        const newCart = [...prev.cart];
        const item = newCart[existingIndex];
        item.quantity = newQty;
        item.total = item.quantity * item.product.salePrice - item.discount;
        return { ...prev, cart: newCart };
      }
      
      return {
        ...prev,
        cart: [...prev.cart, {
          product,
          quantity: 1,
          discount: 0,
          total: product.salePrice,
        }],
      };
    });

    if (!success) {
      toast.error(`Estoque insuficiente! Disponível: ${product.stock}`);
    }

    return success;
  }, []);

  // ADD MANUAL ITEM - SYNCHRONOUS
  const addManualItem = useCallback((name: string, price: number) => {
    const manualProduct: LocalProduct = {
      id: generateId(),
      name,
      costPrice: 0,
      salePrice: price,
      stock: 999,
      isActive: true,
    };
    
    setState(prev => ({
      ...prev,
      cart: [...prev.cart, {
        product: manualProduct,
        quantity: 1,
        discount: 0,
        total: price,
      }],
    }));
  }, []);

  // REMOVE FROM CART - SYNCHRONOUS
  const removeFromCart = useCallback((productId: string) => {
    setState(prev => ({
      ...prev,
      cart: prev.cart.filter(item => item.product.id !== productId),
    }));
  }, []);

  // UPDATE QUANTITY - SYNCHRONOUS with stock check
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

  // APPLY ITEM DISCOUNT - SYNCHRONOUS
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

  // COMPLETE SALE - SYNCHRONOUS with stock deduction
  const completeSale = useCallback((paymentMethod: string): LocalSale | null => {
    let completedSale: LocalSale | null = null;

    setState(prev => {
      if (prev.cart.length === 0) {
        return prev;
      }

      const subtotal = prev.cart.reduce((acc, item) => acc + item.quantity * item.product.salePrice, 0);
      const discount = prev.cart.reduce((acc, item) => acc + item.discount, 0);
      const total = subtotal - discount;

      completedSale = {
        id: prev.currentSale?.id || generateId(),
        items: [...prev.cart],
        subtotal,
        discount,
        total,
        status: 'completed',
        paymentMethod,
        createdAt: new Date(),
      };

      // Deduct stock from products
      const updatedProducts = prev.products.map(product => {
        const cartItem = prev.cart.find(item => item.product.id === product.id);
        if (cartItem) {
          return {
            ...product,
            stock: Math.max(0, product.stock - cartItem.quantity),
          };
        }
        return product;
      });
      
      return {
        ...prev,
        products: updatedProducts,
        sales: [...prev.sales, completedSale!],
        currentSale: null,
        cart: [],
      };
    });

    if (completedSale) {
      setLastSale(completedSale);
    }

    return completedSale;
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

  // UPDATE PRODUCT - SYNCHRONOUS
  const updateProduct = useCallback((id: string, updates: Partial<LocalProduct>) => {
    setState(prev => ({
      ...prev,
      products: prev.products.map(p =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  }, []);

  // DELETE PRODUCT - SYNCHRONOUS
  const deleteProduct = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== id),
    }));
  }, []);

  // UPDATE STORE - SYNCHRONOUS
  const updateStore = useCallback((updates: Partial<LocalStore>) => {
    setState(prev => ({
      ...prev,
      store: { ...prev.store, ...updates },
    }));
  }, []);

  // GETTERS - SYNCHRONOUS
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
    updateProduct,
    deleteProduct,
    updateStore,
    getSubtotal,
    getTotal,
    getTotalDiscount,
    getLastSale,
  };

  return (
    <LocalPOSContext.Provider value={value}>
      {children}
    </LocalPOSContext.Provider>
  );
};
