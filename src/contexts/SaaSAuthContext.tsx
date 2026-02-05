import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, Store, Company, AppRole, AuthContextType, OnboardingData } from '@/types/pos';
import { toast } from 'sonner';

/**
 * NAVANHULA POS - Bulletproof Auth Context
 * 
 * REGRAS FUNDAMENTAIS:
 * 1. loading SEMPRE fica false após max 3 segundos
 * 2. NUNCA loop infinito
 * 3. Console logs para debug rápido
 * 4. Erro = mostrar mensagem + parar loading
 */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Maximum loading time (3 seconds)
const MAX_LOADING_TIME = 3000;

export const SaaSAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Refs to prevent race conditions
  const bootstrapRan = useRef(false);
  const initComplete = useRef(false);

  // Force loading false
  const forceLoadingComplete = useCallback(() => {
    if (!initComplete.current) {
      console.log('[Auth] ⚠️ Force loading complete');
      initComplete.current = true;
      setLoading(false);
    }
  }, []);

  // Bootstrap user on server (creates profile if missing)
  const callBootstrap = useCallback(async () => {
    if (bootstrapRan.current) return;
    bootstrapRan.current = true;
    
    try {
      console.log('[Auth] 🔧 Running bootstrap...');
      const { error } = await supabase.rpc('bootstrap_current_user');
      if (error) {
        console.error('[Auth] Bootstrap error:', error.message);
      } else {
        console.log('[Auth] ✅ Bootstrap complete');
      }
    } catch (e) {
      console.error('[Auth] Bootstrap exception:', e);
    }
  }, []);

  // Fetch user profile and related data
  const fetchUserData = useCallback(async (userId: string): Promise<boolean> => {
    console.log('[Auth] 📥 Fetching user data for:', userId);
    
    try {
      // Parallel fetch for speed
      const [profileResult, roleResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      ]);

      if (profileResult.error) {
        console.error('[Auth] Profile fetch error:', profileResult.error.message);
        return false;
      }

      const profileData = profileResult.data;
      const userRole = roleResult.data?.role as AppRole || 'seller';

      console.log('[Auth] Profile:', profileData ? 'Found' : 'Not found');
      console.log('[Auth] Role:', userRole);
      console.log('[Auth] Onboarding completed:', profileData?.onboarding_completed);

      // Fetch store and company if IDs exist
      let storeData: Store | null = null;
      let companyData: Company | null = null;

      if (profileData?.store_id) {
        const { data } = await supabase
          .from('stores')
          .select('*')
          .eq('id', profileData.store_id)
          .maybeSingle();
        storeData = data as Store | null;
        console.log('[Auth] Store:', storeData?.name || 'Not found');
      }

      if (profileData?.company_id) {
        const { data } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profileData.company_id)
          .maybeSingle();
        companyData = data as Company | null;
        console.log('[Auth] Company:', companyData?.name || 'Not found');
      }

      // Update state
      if (profileData) {
        setUser(profileData as Profile);
      }
      setRole(userRole);
      setStore(storeData);
      setCompany(companyData);

      return true;
    } catch (error) {
      console.error('[Auth] fetchUserData exception:', error);
      return false;
    }
  }, []);

  // Refresh user data (public method)
  const refreshUserData = useCallback(async () => {
    if (authUserId) {
      console.log('[Auth] 🔄 Refreshing user data...');
      await fetchUserData(authUserId);
    }
  }, [authUserId, fetchUserData]);

  // Handle authenticated session
  const handleAuthenticatedUser = useCallback(async (userId: string) => {
    console.log('[Auth] 🔐 Handling authenticated user:', userId);
    setAuthUserId(userId);
    
    try {
      await callBootstrap();
      await fetchUserData(userId);
    } catch (error) {
      console.error('[Auth] Error handling auth:', error);
    }
    
    // ALWAYS complete loading
    initComplete.current = true;
    setLoading(false);
    console.log('[Auth] ✅ Auth initialization complete');
  }, [callBootstrap, fetchUserData]);

  // Handle no session
  const handleNoSession = useCallback(() => {
    console.log('[Auth] 👤 No session - clearing state');
    setUser(null);
    setRole(null);
    setStore(null);
    setCompany(null);
    setAuthUserId(null);
    bootstrapRan.current = false;
    initComplete.current = true;
    setLoading(false);
  }, []);

  // Initialize auth
  useEffect(() => {
    let mounted = true;

    // FAIL-SAFE: Force loading to false after MAX_LOADING_TIME
    const failSafeTimer = setTimeout(() => {
      if (mounted && !initComplete.current) {
        console.warn(`[Auth] ⚠️ Fail-safe: forcing loading=false after ${MAX_LOADING_TIME}ms`);
        forceLoadingComplete();
      }
    }, MAX_LOADING_TIME);

    console.log('[Auth] 🚀 Initializing auth...');

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('[Auth] 📢 Auth event:', event);

      switch (event) {
        case 'INITIAL_SESSION':
          if (session?.user) {
            await handleAuthenticatedUser(session.user.id);
          } else {
            handleNoSession();
          }
          break;

        case 'SIGNED_IN':
          if (session?.user) {
            bootstrapRan.current = false; // Allow new bootstrap
            await handleAuthenticatedUser(session.user.id);
          }
          break;

        case 'SIGNED_OUT':
          handleNoSession();
          break;

        case 'TOKEN_REFRESHED':
          if (session?.user) {
            setAuthUserId(session.user.id);
            await fetchUserData(session.user.id);
          }
          break;
      }
    });

    // Backup: getSession after a short delay if INITIAL_SESSION didn't fire
    const backupTimer = setTimeout(async () => {
      if (mounted && !initComplete.current) {
        console.log('[Auth] 🔄 Backup: calling getSession...');
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!initComplete.current) {
            if (session?.user) {
              await handleAuthenticatedUser(session.user.id);
            } else {
              handleNoSession();
            }
          }
        } catch (error) {
          console.error('[Auth] getSession error:', error);
          forceLoadingComplete();
        }
      }
    }, 200);

    return () => {
      mounted = false;
      clearTimeout(failSafeTimer);
      clearTimeout(backupTimer);
      subscription.unsubscribe();
    };
  }, [handleAuthenticatedUser, handleNoSession, fetchUserData, forceLoadingComplete]);

  // Computed values
  const isAuthenticated = authUserId !== null;
  const onboardingCompleted = user?.onboarding_completed === true;

  // Auth methods
  const signIn = async (email: string, password: string) => {
    console.log('[Auth] 🔑 Signing in:', email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[Auth] Sign in error:', error.message);
      toast.error('Erro ao fazer login: ' + error.message);
      throw error;
    }
    toast.success('Login realizado com sucesso!');
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    console.log('[Auth] 📝 Signing up:', email);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    if (error) {
      console.error('[Auth] Sign up error:', error.message);
      toast.error('Erro ao criar conta: ' + error.message);
      throw error;
    }
    toast.success('Conta criada! Verifique seu email para confirmar.');
  };

  const signOut = async () => {
    console.log('[Auth] 🚪 Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[Auth] Sign out error:', error.message);
      toast.error('Erro ao sair: ' + error.message);
      throw error;
    }
    toast.success('Sessão encerrada');
  };

  const completeOnboarding = async (data: OnboardingData) => {
    console.log('[Auth] 🏢 Completing onboarding:', data.companyName);
    
    try {
      const { data: result, error } = await supabase.rpc('complete_onboarding', {
        p_company_name: data.companyName,
        p_company_nif: data.companyNif || null,
        p_company_phone: data.companyPhone || null,
        p_company_address: data.companyAddress || null,
      });

      if (error) {
        console.error('[Auth] Onboarding error:', error.message);
        toast.error('Erro ao criar empresa: ' + error.message);
        throw error;
      }

      console.log('[Auth] ✅ Onboarding complete:', result);

      // Refresh user data to get updated profile with company/store
      if (authUserId) {
        await fetchUserData(authUserId);
      }

      const message = (result as any)?.message || 'Empresa criada com sucesso!';
      toast.success(message);
    } catch (error) {
      console.error('[Auth] completeOnboarding exception:', error);
      throw error;
    }
  };

  // Debug log current state
  useEffect(() => {
    console.log('[Auth] 📊 State:', {
      loading,
      isAuthenticated,
      onboardingCompleted,
      userId: authUserId,
      company: company?.name || null,
      store: store?.name || null,
    });
  }, [loading, isAuthenticated, onboardingCompleted, authUserId, company, store]);

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
