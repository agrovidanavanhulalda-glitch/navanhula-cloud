import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// 100% LOCAL AUTH - NO BACKEND

export type LocalRole = 'admin' | 'vendedor' | 'caixa';

export interface LocalAuthUser {
  id: string;
  email: string;
  name: string;
  role: LocalRole;
  storeId?: string;
}

interface LocalAuthContextType {
  user: LocalAuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  hasAccess: (requiredRoles: LocalRole[]) => boolean;
  getAllUsers: () => Array<LocalAuthUser & { password: string }>;
  addUser: (user: Omit<LocalAuthUser & { password: string }, 'id'>) => void;
  updateUser: (id: string, updates: Partial<LocalAuthUser & { password: string }>) => void;
  deleteUser: (id: string) => void;
}

const LocalAuthContext = createContext<LocalAuthContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEY = 'navanhula_auth_user';
const USERS_STORAGE_KEY = 'navanhula_users';

// Default users - stored locally
const DEFAULT_USERS: Array<LocalAuthUser & { password: string }> = [
  {
    id: 'admin-1',
    email: 'admin@navanhula.local',
    name: 'Administrador',
    role: 'admin',
    storeId: 'store-1',
    password: '1234',
  },
  {
    id: 'caixa-1',
    email: 'caixa@navanhula.local',
    name: 'Operador de Caixa',
    role: 'caixa',
    storeId: 'store-1',
    password: '1234',
  },
];

const loadUsers = (): Array<LocalAuthUser & { password: string }> => {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore
  }
  return DEFAULT_USERS;
};

const saveUsers = (users: Array<LocalAuthUser & { password: string }>) => {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // Ignore
  }
};

export const useLocalAuth = () => {
  const context = useContext(LocalAuthContext);
  if (!context) {
    throw new Error('useLocalAuth must be used within a LocalAuthProvider');
  }
  return context;
};

export const LocalAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LocalAuthUser | null>(() => {
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

  const [users, setUsers] = useState<Array<LocalAuthUser & { password: string }>>(loadUsers);

  // Persist user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  // Persist users list to localStorage
  useEffect(() => {
    saveUsers(users);
  }, [users]);

  const login = useCallback((email: string, password: string): boolean => {
    const normalizedEmail = email.toLowerCase().trim();
    
    const foundUser = users.find(
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
  }, [users]);

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

  const getAllUsers = useCallback(() => users, [users]);

  const addUser = useCallback((newUser: Omit<LocalAuthUser & { password: string }, 'id'>) => {
    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setUsers(prev => [...prev, { ...newUser, id }]);
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<LocalAuthUser & { password: string }>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  const value: LocalAuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    hasAccess,
    getAllUsers,
    addUser,
    updateUser,
    deleteUser,
  };

  return (
    <LocalAuthContext.Provider value={value}>
      {children}
    </LocalAuthContext.Provider>
  );
};
