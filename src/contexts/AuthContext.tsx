import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, Store, Company, AppRole, AuthContextType } from '@/types/pos';
import { toast } from 'sonner';
import { setFormatterCountry } from '@/lib/formatters';
import { isValidId } from '@/lib/uuid';

/**
 * NAVANHULA CLOUD - Auth Context
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
  onboardingCompleted: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  completeOnboarding: async () => {},
  refreshUserData: async () => {},
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.warn('useAuth called outside AuthProvider – using fallback');
    return fallbackAuth;
  }
  return context;
};

// Maximum loading time - 5 seconds (emergency mode)
const MAX_LOADING_TIME = 5000;

// Deprecated fallback constants (to be removed after full UUID migration)
const DEFAULT_COMPANY = null;
const DEFAULT_STORE = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Sync currency formatter with company country
  useEffect(() => {
    const country = (company as any)?.country || 'MZ';
    setFormatterCountry(country);
  }, [company]);


  const initComplete = useRef(false);
  const setupRan = useRef(false);

  // Force loading complete
  const forceComplete = useCallback(() => {
    if (!initComplete.current) {
      initComplete.current = true;
      setLoading(false);
    }
  }, []);

  // Fetch user profile and related data
  const fetchUserData = useCallback(async (userId: string): Promise<void> => {
    try {
      const [profileResult, userRolesResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      ]);

      const profileData = profileResult.data;
      const userRole = (userRolesResult.data?.role?.toLowerCase() || 'admin') as AppRole;

      if (profileData) {
        setUser(profileData as Profile);
        setRole(userRole);

        if (isValidId(profileData.store_id)) {
          const { data: storeData } = await supabase
            .from('stores')
            .select('*')
            .eq('id', profileData.store_id)
            .maybeSingle();
          setStore(storeData as Store || null);
        } else {
          setStore(null);
        }

        if (isValidId(profileData.company_id)) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('*')
            .eq('id', profileData.company_id)
            .maybeSingle();
          setCompany(companyData as Company || null);
        } else {
          setCompany(null);
        }
      } else {
        setCompany(null);
        setStore(null);
        setRole('viewer');
      }
    } catch (error) {
      console.error("[Auth] Error fetching user data:", error);
      setCompany(null);
      setStore(null);
      setRole('viewer');
    }
  }, []);

  // Auto-setup user with company (no onboarding needed)
  const autoSetupUser = useCallback(async (userId: string) => {
    if (setupRan.current) return;
    setupRan.current = true;
    
    try {
      // 1. Garante que o perfil existe e está vinculado a uma empresa
      const { error: bootstrapError } = await supabase.rpc('bootstrap_current_user');
      if (bootstrapError) {
        console.error('[Auth] Erro no bootstrap:', bootstrapError);
      }

      // 2. Busca dados consolidados
      await fetchUserData(userId);
    } catch (error) {
      console.error('[Auth] Erro crítico no setup:', error);
      setCompany(null);
      setStore(null);
      setRole('viewer');
    }
    forceComplete();
  }, [fetchUserData, forceComplete]);

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
