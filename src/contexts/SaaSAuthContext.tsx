import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, Store, Company, AppRole, AuthContextType } from '@/types/pos';
import { toast } from 'sonner';

/**
 * NAVANHULA ERP - EMERGENCY MODE Auth Context
 * 
 * REGRAS:
 * 1. SEM ONBOARDING - empresa criada automaticamente
 * 2. Loading máximo 2 segundos
 * 3. Dashboard abre SEMPRE
 * 4. Fallback local se backend falhar
 */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fallback context for when provider is temporarily unmounted (HMR, etc.)
const fallbackAuth: AuthContextType = {
  user: null,
  role: null,
  store: null,
  company: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  setActiveStore: async () => {},
  refreshProfile: async () => {},
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.warn('useAuth called outside AuthProvider – using fallback');
    return fallbackAuth;
  }
  return context;
};

// Maximum loading time - 2 seconds (emergency mode)
const MAX_LOADING_TIME = 2000;

// Default company for fallback
const DEFAULT_COMPANY: Company = {
  id: 'local-default',
  name: 'NAVANHULA EMPRESA',
  nif: null,
  phone: null,
  address: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEFAULT_STORE: Store = {
  id: 'local-store',
  name: 'Loja Principal',
  company_id: 'local-default',
  address: null,
  phone: null,
  email: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const SaaSAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Refs to prevent race conditions
  const initComplete = useRef(false);
  const setupRan = useRef(false);

  // Force loading complete
  const forceComplete = useCallback(() => {
    if (!initComplete.current) {
      initComplete.current = true;
      setLoading(false);
    }
  }, []);

  // Auto-setup user with company (no onboarding needed)
  const autoSetupUser = useCallback(async (userId: string) => {
    if (setupRan.current) return;
    setupRan.current = true;
    
    try {
      const { error: bootstrapError } = await supabase.rpc('bootstrap_current_user');
      if (bootstrapError) {
        // Bootstrap warning - non-critical
      }

      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, company_id, store_id, onboarding_completed')
          .eq('id', userId)
          .maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      ]);

      const profile = profileResult.data;
      const currentRole = (roleResult.data?.role as AppRole | undefined) ?? 'admin';
      const needsCompany = !profile?.company_id || !profile?.onboarding_completed;

      if (currentRole !== 'reseller' && needsCompany) {
        const { error: onboardError } = await supabase.rpc('complete_onboarding', {
          p_company_name: 'NAVANHULA EMPRESA PRINCIPAL',
          p_company_nif: null,
          p_company_phone: null,
          p_company_address: null,
        });

        if (onboardError) {
          setCompany(DEFAULT_COMPANY);
          setStore(DEFAULT_STORE);
        } else {
          toast.success('Empresa criada automaticamente!');
        }
      }

      await fetchUserData(userId);
    } catch (error) {
      setCompany(DEFAULT_COMPANY);
      setStore(DEFAULT_STORE);
      setRole('admin');
    }
    forceComplete();
  }, []);

  // Fetch user profile and related data
  const fetchUserData = useCallback(async (userId: string): Promise<void> => {
    try {
      const [profileResult, roleResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      ]);

      const profileData = profileResult.data;
      const userRole = roleResult.data?.role as AppRole || 'admin';

      if (profileData) {
        setUser(profileData as Profile);
        setRole(userRole);

        if (profileData.store_id) {
          const { data: storeData } = await supabase
            .from('stores')
            .select('*')
            .eq('id', profileData.store_id)
            .maybeSingle();
          setStore(storeData as Store || (userRole === 'reseller' ? null : DEFAULT_STORE));
        } else {
          setStore(userRole === 'reseller' ? null : DEFAULT_STORE);
        }

        if (profileData.company_id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('*')
            .eq('id', profileData.company_id)
            .maybeSingle();
          setCompany(companyData as Company || (userRole === 'reseller' ? null : DEFAULT_COMPANY));
        } else {
          setCompany(userRole === 'reseller' ? null : DEFAULT_COMPANY);
        }
      } else {
        setCompany(DEFAULT_COMPANY);
        setStore(DEFAULT_STORE);
        setRole('admin');
      }
    } catch (error) {
      setCompany(DEFAULT_COMPANY);
      setStore(DEFAULT_STORE);
      setRole('admin');
    }
  }, []);

  // Refresh user data (public method)
  const refreshUserData = useCallback(async () => {
    if (authUserId) {
      await fetchUserData(authUserId);
    }
  }, [authUserId, fetchUserData]);

  // Handle authenticated session
  const handleAuthenticatedUser = useCallback(async (userId: string) => {
    setAuthUserId(userId);
    
    // Auto-setup with timeout protection
    const setupPromise = autoSetupUser(userId);
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        forceComplete();
        resolve();
      }, MAX_LOADING_TIME);
    });

    await Promise.race([setupPromise, timeoutPromise]);
  }, [autoSetupUser, forceComplete]);

  // Handle no session
  const handleNoSession = useCallback(() => {
    setUser(null);
    setRole(null);
    setStore(null);
    setCompany(null);
    setAuthUserId(null);
    setupRan.current = false;
    initComplete.current = true;
    setLoading(false);
  }, []);

  // Initialize auth
  useEffect(() => {
    let mounted = true;

    // FAIL-SAFE: Force complete after MAX_LOADING_TIME
    const failSafeTimer = setTimeout(() => {
      if (mounted && !initComplete.current) {
        forceComplete();
      }
    }, MAX_LOADING_TIME);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        handleNoSession();
        return;
      }

      if (session?.user) {
        setupRan.current = false; // Allow new setup on new login
        await handleAuthenticatedUser(session.user.id);
      } else if (event === 'INITIAL_SESSION') {
        handleNoSession();
      }
    });

    setTimeout(async () => {
      if (mounted && !initComplete.current) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!initComplete.current) {
          if (session?.user) {
            await handleAuthenticatedUser(session.user.id);
          } else {
            handleNoSession();
          }
        }
      }
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(failSafeTimer);
      subscription.unsubscribe();
    };
  }, [handleAuthenticatedUser, handleNoSession, forceComplete]);

  // Computed values - ALWAYS true if authenticated (no onboarding needed)
  const isAuthenticated = authUserId !== null;
  const onboardingCompleted = isAuthenticated; // Always complete in emergency mode

  // Auth methods
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Erro ao fazer login: ' + error.message);
      throw error;
    }
    toast.success('Login realizado!');
  };

  const signUp = async (email: string, password: string, fullName: string, referralCode?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          referral_code: referralCode ?? null,
        },
      },
    });
    if (error) {
      toast.error('Erro ao criar conta: ' + error.message);
      throw error;
    }
    toast.success('Conta criada! Verifique seu email.');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao sair: ' + error.message);
      throw error;
    }
    toast.success('Sessão encerrada');
  };

  // completeOnboarding is now a no-op (auto-complete)
  const completeOnboarding = async () => {
    return Promise.resolve();
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      store,
      company,
      loading,
      isAuthenticated,
      onboardingCompleted,
      signIn,
      signUp,
      signOut,
      completeOnboarding,
      refreshUserData,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
