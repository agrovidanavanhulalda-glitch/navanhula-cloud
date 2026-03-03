import React, { createContext, useContext, useState, useCallback } from 'react';
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

  const loginSeller = useCallback((sellerId: string, password: string): boolean => {
    const seller = sellers.find(s => s.id === sellerId && s.isActive);
    
    if (!seller) {
      return false;
    }

    if (seller.password !== password) {
      return false;
    }

    setCurrentSeller(seller);
    return true;
  }, [sellers]);

  const logoutSeller = useCallback(() => {
    setCurrentSeller(null);
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
