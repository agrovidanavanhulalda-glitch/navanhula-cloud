import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { LocalSeller, useLocalPOS } from './LocalPOSContext';

/**
 * Local Seller Auth Context
 * Controls which local seller is logged in (separate from SaaS auth)
 * Used for RBAC within the POS system
 */

interface LocalSellerAuthContextType {
  currentSeller: LocalSeller | null;
  isAdmin: boolean;
  loginSeller: (sellerId: string, password: string) => boolean;
  logoutSeller: () => void;
  canAccess: (feature: POSFeature) => boolean;
}

export type POSFeature = 
  | 'pdv'
  | 'caixa'
  | 'produtos'
  | 'estoque'
  | 'vendedores'
  | 'lojas'
  | 'relatorios'
  | 'configuracoes'
  | 'cancelar_venda'
  | 'ver_margem'
  | 'ajustar_estoque';

const LocalSellerAuthContext = createContext<LocalSellerAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'navanhula_current_seller';

export const useLocalSellerAuth = () => {
  const context = useContext(LocalSellerAuthContext);
  if (!context) {
    throw new Error('useLocalSellerAuth must be used within LocalSellerAuthProvider');
  }
  return context;
};

export const LocalSellerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sellers } = useLocalPOS();
  const [currentSeller, setCurrentSeller] = useState<LocalSeller | null>(null);

  // Load saved seller on mount
  useEffect(() => {
    try {
      const savedSellerId = localStorage.getItem(STORAGE_KEY);
      if (savedSellerId) {
        const seller = sellers.find(s => s.id === savedSellerId && s.isActive);
        if (seller) {
          setCurrentSeller(seller);
        }
      }
    } catch {
      // Ignore errors
    }
  }, [sellers]);

  const loginSeller = useCallback((sellerId: string, password: string): boolean => {
    const seller = sellers.find(s => s.id === sellerId && s.isActive);
    
    if (!seller) {
      return false;
    }

    if (seller.password !== password) {
      return false;
    }

    setCurrentSeller(seller);
    localStorage.setItem(STORAGE_KEY, seller.id);
    return true;
  }, [sellers]);

  const logoutSeller = useCallback(() => {
    setCurrentSeller(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const isAdmin = currentSeller?.role === 'admin';

  // Feature access control
  const canAccess = useCallback((feature: POSFeature): boolean => {
    if (!currentSeller) {
      return false;
    }

    // Admin has full access
    if (currentSeller.role === 'admin') {
      return true;
    }

    // Vendedor has limited access
    const vendedorFeatures: POSFeature[] = ['pdv', 'caixa'];
    return vendedorFeatures.includes(feature);
  }, [currentSeller]);

  return (
    <LocalSellerAuthContext.Provider value={{
      currentSeller,
      isAdmin,
      loginSeller,
      logoutSeller,
      canAccess,
    }}>
      {children}
    </LocalSellerAuthContext.Provider>
  );
};
