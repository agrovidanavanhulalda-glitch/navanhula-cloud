import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// 100% LOCAL AUTH - NO BACKEND

export type LocalRole = 'admin' | 'caixa';

export interface LocalAuthUser {
  id: string;
  email: string;
  name: string;
  role: LocalRole;
}

interface LocalAuthContextType {
  user: LocalAuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  hasAccess: (requiredRoles: LocalRole[]) => boolean;
}

const LocalAuthContext = createContext<LocalAuthContextType | undefined>(undefined);

// Default users - stored locally
const DEFAULT_USERS: Array<LocalAuthUser & { password: string }> = [
  {
    id: 'admin-1',
    email: 'admin@navanhula.local',
    name: 'Administrador',
    role: 'admin',
    password: '1234',
  },
  {
    id: 'caixa-1',
    email: 'caixa@navanhula.local',
    name: 'Operador de Caixa',
    role: 'caixa',
    password: '1234',
  },
];

const STORAGE_KEY = 'navanhula_auth_user';

export const useLocalAuth = () => {
  const context = useContext(LocalAuthContext);
  if (!context) {
    throw new Error('useLocalAuth must be used within a LocalAuthProvider');
  }
  return context;
};

export const LocalAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LocalAuthUser | null>(() => {
    // Try to restore from localStorage on init
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore errors
    }
    return null;
  });

  // Persist user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = useCallback((email: string, password: string): boolean => {
    const normalizedEmail = email.toLowerCase().trim();
    
    const foundUser = DEFAULT_USERS.find(
      u => u.email.toLowerCase() === normalizedEmail && u.password === password
    );

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      toast.success(`Bem-vindo, ${foundUser.name}!`);
      return true;
    }

    toast.error('Email ou senha incorretos');
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    toast.success('Sessão encerrada');
  }, []);

  const hasAccess = useCallback((requiredRoles: LocalRole[]): boolean => {
    if (!user) return false;
    // Admin has access to everything
    if (user.role === 'admin') return true;
    return requiredRoles.includes(user.role);
  }, [user]);

  const value: LocalAuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    hasAccess,
  };

  return (
    <LocalAuthContext.Provider value={value}>
      {children}
    </LocalAuthContext.Provider>
  );
};
