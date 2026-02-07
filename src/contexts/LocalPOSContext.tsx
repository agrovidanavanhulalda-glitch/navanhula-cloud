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
  storeId: string;
  sellerId?: string;
  sellerName?: string;
  // Cancellation tracking
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
  cancelCompletedSale: (saleId: string, reason: string, cancelledBy: string, cancelledByName: string) => boolean;
  
  // Cash register - ALL SYNCHRONOUS
  openCashRegister: (sellerId: string, sellerName: string, openingAmount: number) => LocalCashRegister;
  closeCashRegister: (closingAmount: number, notes?: string) => void;
  getCashRegisterHistory: () => LocalCashRegister[];
  
  // Store management - ALL SYNCHRONOUS
  addStore: (store: Omit<LocalStore, 'id'>) => void;
  updateStore: (id: string, store: Partial<LocalStore>) => void;
  deleteStore: (id: string) => void;
  setCurrentStore: (storeId: string) => void;
  
  // Seller management - ALL SYNCHRONOUS
  addSeller: (seller: Omit<LocalSeller, 'id'>) => void;
  updateSeller: (id: string, seller: Partial<LocalSeller>) => void;
  deleteSeller: (id: string) => void;
  getSellersByStore: (storeId: string) => LocalSeller[];
  
  // Product management - ALL SYNCHRONOUS
  addProduct: (product: Omit<LocalProduct, 'id'>) => void;
  updateProduct: (id: string, product: Partial<LocalProduct>) => void;
  deleteProduct: (id: string) => void;
  
  // Getters
  getSubtotal: () => number;
  getTotal: () => number;
  getTotalDiscount: () => number;
  getLastSale: () => LocalSale | null;
  getSalesByStore: (storeId: string) => LocalSale[];
  getSalesBySeller: (sellerId: string) => LocalSale[];
  getSalesByPeriod: (startDate: Date, endDate: Date) => LocalSale[];
  getCancelledSales: () => LocalSale[];
  getCancellationHistory: () => SaleCancellation[];
  
  // Legacy compatibility
  store: LocalStore;
  cashRegisterOpen: boolean;
}

const LocalPOSContext = createContext<LocalPOSContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  products: 'navanhula_products',
  sales: 'navanhula_sales',
  stores: 'navanhula_stores',
  currentStoreId: 'navanhula_current_store',
  sellers: 'navanhula_sellers',
  cashRegisters: 'navanhula_cash_registers',
  cancellations: 'navanhula_cancellations',
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
  isActive: true,
};

const DEFAULT_SELLERS: LocalSeller[] = [
  {
    id: 'seller-admin',
    name: 'Administrador',
    email: 'admin@navanhula.local',
    role: 'admin',
    storeId: 'store-1',
    isActive: true,
    password: '1234',
  },
  {
    id: 'seller-caixa',
    name: 'Operador de Caixa',
    email: 'caixa@navanhula.local',
    role: 'vendedor',
    storeId: 'store-1',
    isActive: true,
    password: '1234',
  },
];

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
const getInitialState = (): LocalPOSState => {
  const stores = loadFromStorage<LocalStore[]>(STORAGE_KEYS.stores, [DEFAULT_STORE]);
  const currentStoreId = loadFromStorage<string>(STORAGE_KEYS.currentStoreId, 'store-1');
  const currentStore = stores.find(s => s.id === currentStoreId) || stores[0] || DEFAULT_STORE;
  
  return {
    stores,
    currentStore,
    sellers: loadFromStorage(STORAGE_KEYS.sellers, DEFAULT_SELLERS),
    cashRegisters: loadFromStorage(STORAGE_KEYS.cashRegisters, []),
    currentCashRegister: null,
    currentSale: null,
    cart: [],
    products: loadFromStorage(STORAGE_KEYS.products, DEFAULT_PRODUCTS),
    sales: loadFromStorage(STORAGE_KEYS.sales, []),
    cancellations: loadFromStorage(STORAGE_KEYS.cancellations, []),
  };
};

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

  // Persist to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.products, state.products);
  }, [state.products]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.sales, state.sales);
  }, [state.sales]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.stores, state.stores);
  }, [state.stores]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.currentStoreId, state.currentStore.id);
  }, [state.currentStore]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.sellers, state.sellers);
  }, [state.sellers]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.cashRegisters, state.cashRegisters);
  }, [state.cashRegisters]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.cancellations, state.cancellations);
  }, [state.cancellations]);

  // Generate simple ID - NO ASYNC
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // ============ CART ACTIONS ============

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

  const removeFromCart = useCallback((productId: string) => {
    setState(prev => ({
      ...prev,
      cart: prev.cart.filter(item => item.product.id !== productId),
    }));
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
    
    setState(prev => ({
      ...prev,
      currentSale: newSale,
      cart: [],
    }));
  }, [state.currentStore.id]);

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
        storeId: prev.currentStore.id,
        sellerId: prev.currentCashRegister?.sellerId,
        sellerName: prev.currentCashRegister?.sellerName,
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

      // Update cash register if open
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
        sales: [...prev.sales, completedSale!],
        currentSale: null,
        cart: [],
        cashRegisters: updatedCashRegisters,
        currentCashRegister: updatedCurrentCashRegister,
      };
    });

    if (completedSale) {
      setLastSale(completedSale);
    }

    return completedSale;
  }, []);

  const cancelSale = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentSale: null,
      cart: [],
    }));
  }, []);

  // ============ CANCEL COMPLETED SALE (ADMIN ONLY) ============
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

      // Restore stock for all items
      const updatedProducts = prev.products.map(product => {
        const saleItem = sale.items.find(item => item.product.id === product.id);
        if (saleItem) {
          return {
            ...product,
            stock: product.stock + saleItem.quantity,
          };
        }
        return product;
      });

      // Update sale status
      const cancelledSale: LocalSale = {
        ...sale,
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy,
        cancelledByName,
        cancellationReason: reason,
      };

      // Create cancellation record
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

    if (success) {
      toast.success('Venda cancelada com sucesso! Estoque restaurado.');
    }

    return success;
  }, []);

  // ============ CASH REGISTER ACTIONS ============

  const openCashRegister = useCallback((sellerId: string, sellerName: string, openingAmount: number): LocalCashRegister => {
    const newRegister: LocalCashRegister = {
      id: generateId(),
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
      cashRegisters: [...prev.cashRegisters, newRegister],
      currentCashRegister: newRegister,
    }));

    return newRegister;
  }, [state.currentStore.id]);

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

      return {
        ...prev,
        cashRegisters: prev.cashRegisters.map(cr =>
          cr.id === closedRegister.id ? closedRegister : cr
        ),
        currentCashRegister: null,
      };
    });
  }, []);

  const getCashRegisterHistory = useCallback(() => {
    return state.cashRegisters;
  }, [state.cashRegisters]);

  // ============ STORE ACTIONS ============

  const addStore = useCallback((store: Omit<LocalStore, 'id'>) => {
    setState(prev => ({
      ...prev,
      stores: [...prev.stores, { ...store, id: generateId() }],
    }));
  }, []);

  const updateStore = useCallback((id: string, updates: Partial<LocalStore>) => {
    setState(prev => {
      const updatedStores = prev.stores.map(s =>
        s.id === id ? { ...s, ...updates } : s
      );
      const currentStore = prev.currentStore.id === id 
        ? { ...prev.currentStore, ...updates }
        : prev.currentStore;
      return {
        ...prev,
        stores: updatedStores,
        currentStore,
      };
    });
  }, []);

  const deleteStore = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      stores: prev.stores.filter(s => s.id !== id),
    }));
  }, []);

  const setCurrentStore = useCallback((storeId: string) => {
    setState(prev => {
      const store = prev.stores.find(s => s.id === storeId);
      if (!store) return prev;
      return { ...prev, currentStore: store };
    });
  }, []);

  // ============ SELLER ACTIONS ============

  const addSeller = useCallback((seller: Omit<LocalSeller, 'id'>) => {
    setState(prev => ({
      ...prev,
      sellers: [...prev.sellers, { ...seller, id: generateId() }],
    }));
  }, []);

  const updateSeller = useCallback((id: string, updates: Partial<LocalSeller>) => {
    setState(prev => ({
      ...prev,
      sellers: prev.sellers.map(s =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  }, []);

  const deleteSeller = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      sellers: prev.sellers.filter(s => s.id !== id),
    }));
  }, []);

  const getSellersByStore = useCallback((storeId: string) => {
    return state.sellers.filter(s => s.storeId === storeId);
  }, [state.sellers]);

  // ============ PRODUCT ACTIONS ============

  const addProduct = useCallback((product: Omit<LocalProduct, 'id'>) => {
    setState(prev => ({
      ...prev,
      products: [...prev.products, { ...product, id: generateId() }],
    }));
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<LocalProduct>) => {
    setState(prev => ({
      ...prev,
      products: prev.products.map(p =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== id),
    }));
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
    // Legacy compatibility
    store: state.currentStore,
    cashRegisterOpen: state.currentCashRegister?.status === 'open',
    // Cart
    addToCart,
    addManualItem,
    removeFromCart,
    updateQuantity,
    applyItemDiscount,
    clearCart,
    // Sales
    startNewSale,
    completeSale,
    cancelSale,
    cancelCompletedSale,
    // Cash Register
    openCashRegister,
    closeCashRegister,
    getCashRegisterHistory,
    // Stores
    addStore,
    updateStore,
    deleteStore,
    setCurrentStore,
    // Sellers
    addSeller,
    updateSeller,
    deleteSeller,
    getSellersByStore,
    // Products
    addProduct,
    updateProduct,
    deleteProduct,
    // Getters
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
