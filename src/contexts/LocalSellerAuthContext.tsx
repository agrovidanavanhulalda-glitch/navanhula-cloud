import React, { createContext, useContext, useState, useCallback } from 'react';
import { LocalSeller, useLocalPOS } from './LocalPOSContext';

/**
 * Local Seller Auth Context
 * Controls which local seller is logged in (separate from Sistema auth)
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
  // DEPRECATED: local sellers were removed. Auth flows through Supabase Auth + useAuth.
  const sellers: LocalSeller[] = [];
  const [currentSeller, setCurrentSeller] = useState<LocalSeller | null>(null);

  const loginSeller = useCallback((_sellerId: string, _password: string): boolean => {
    console.warn('[LocalSellerAuth] deprecated — use Supabase Auth via useAuth()');
    return false;
  }, []);

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

    // Seller has limited access
    const sellerFeatures: POSFeature[] = ['pdv', 'caixa'];
    return sellerFeatures.includes(feature);
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
