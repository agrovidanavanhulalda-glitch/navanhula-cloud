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
  const isInitializing = useRef(false);

  // Force loading complete
  const forceComplete = useCallback(() => {
    if (!initComplete.current) {
      initComplete.current = true;
      setLoading(false);
    }
  }, []);

  // Fetch user profile and related data
  const fetchUserData = useCallback(async (userId: string): Promise<void> => {
    if (!isValidId(userId)) {
      console.warn('[Auth] Invalid userId for fetchUserData:', userId);
      return;
    }
    
    try {
      const [profileResult, userRolesResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      ]);

      if (profileResult.error) throw profileResult.error;

      const profileData = profileResult.data;
      const userRole = (userRolesResult.data?.role?.toLowerCase() || 'admin') as AppRole;

      if (profileData) {
        setUser(profileData as Profile);
        setRole(userRole);

        // Batch fetching store and company
        const fetches = [];
        if (isValidId(profileData.store_id)) {
          fetches.push(supabase.from('stores').select('*').eq('id', profileData.store_id).maybeSingle());
        }
        if (isValidId(profileData.company_id)) {
          fetches.push(supabase.from('companies').select('*').eq('id', profileData.company_id).maybeSingle());
        }

        const results = await Promise.all(fetches);
        
        let storeIdx = 0;
        if (isValidId(profileData.store_id)) {
          setStore(results[storeIdx]?.data as Store || null);
          storeIdx++;
        } else {
          setStore(null);
        }

        if (isValidId(profileData.company_id)) {
          setCompany(results[storeIdx]?.data as Company || null);
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
      // Don't wipe everything on transient error, but ensure we don't hang
    }
  }, []);

  // Auto-setup user with company
  const autoSetupUser = useCallback(async (userId: string) => {
    if (setupRan.current || isInitializing.current) return;
    isInitializing.current = true;
    
    try {
      const { error: bootstrapError } = await supabase.rpc('bootstrap_current_user');
      if (bootstrapError) {
        console.error('[Auth] Bootstrap error:', bootstrapError);
      }

      await fetchUserData(userId);
      setupRan.current = true;
    } catch (error) {
      console.error('[Auth] Critical setup error:', error);
    } finally {
      isInitializing.current = false;
      forceComplete();
    }
  }, [fetchUserData, forceComplete]);

  // Refresh user data (public method)
  const refreshUserData = useCallback(async () => {
    if (authUserId) {
      await fetchUserData(authUserId);
    }
  }, [authUserId, fetchUserData]);

  // Initialize auth
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (mounted) {
          if (session?.user) {
            setAuthUserId(session.user.id);
            await autoSetupUser(session.user.id);
          } else {
            setUser(null);
            setRole(null);
            setStore(null);
            setCompany(null);
            setAuthUserId(null);
            setLoading(false);
            initComplete.current = true;
          }
        }
      } catch (err) {
        console.error('[Auth] Init error:', err);
        if (mounted) {
          setLoading(false);
          initComplete.current = true;
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log(`[Auth] Event: ${event}`);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
        setStore(null);
        setCompany(null);
        setAuthUserId(null);
        setupRan.current = false;
        setLoading(false);
        return;
      }

      if (session?.user && authUserId !== session.user.id) {
        setAuthUserId(session.user.id);
        setupRan.current = false;
        await autoSetupUser(session.user.id);
      }
    });

    const failSafe = setTimeout(() => {
      if (mounted && !initComplete.current) {
        console.warn('[Auth] Fail-safe forced completion');
        forceComplete();
      }
    }, MAX_LOADING_TIME);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(failSafe);
    };
  }, [autoSetupUser, forceComplete, authUserId]);


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
