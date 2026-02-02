import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, Store, Company, AppRole, AuthContextType, OnboardingData } from '@/types/pos';
import { toast } from 'sonner';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const SaaSAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  // IMPORTANT: authLoading must start true and MUST be set false in ALL scenarios.
  const [authLoading, setAuthLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Prevent duplicate bootstrap calls
  const bootstrapRan = useRef(false);

  /**
   * Call the bootstrap function on the server to ensure profile/role exist.
   */
  const callBootstrap = useCallback(async () => {
    if (bootstrapRan.current) return;
    bootstrapRan.current = true;
    try {
      const { error } = await supabase.rpc('bootstrap_current_user');
      if (error) {
        console.error('Bootstrap error:', error);
      }
    } catch (e) {
      console.error('Bootstrap exception:', e);
    }
  }, []);

  const fetchUserData = useCallback(async (userId: string): Promise<boolean> => {
    try {
      // Fetch profile with store and company
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return false;
      }

      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
      }

      // Fetch store if store_id exists
      let storeData: Store | null = null;
      if (profileData?.store_id) {
        const { data: fetchedStore } = await supabase
          .from('stores')
          .select('*')
          .eq('id', profileData.store_id)
          .maybeSingle();
        storeData = fetchedStore as Store | null;
      }

      // Fetch company if company_id exists
      let companyData: Company | null = null;
      if (profileData?.company_id) {
        const { data: fetchedCompany } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profileData.company_id)
          .maybeSingle();
        companyData = fetchedCompany as Company | null;
      }

      if (profileData) {
        setUser(profileData as Profile);
        setRole((roleData?.role as AppRole) || 'seller');
        setStore(storeData);
        setCompany(companyData);
      } else {
        setRole((roleData?.role as AppRole) || 'seller');
      }

      return true;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return false;
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (authUserId) {
      await fetchUserData(authUserId);
    }
  }, [authUserId, fetchUserData]);

  useEffect(() => {
    let isMounted = true;
    let initComplete = false;

    // FAIL-SAFE: Maximum loading time of 5 seconds (reduced from 8)
    const failSafeTimeout = setTimeout(() => {
      if (isMounted && !initComplete) {
        console.warn('[Auth] Fail-safe triggered after 5s - forcing loading to false');
        setAuthLoading(false);
      }
    }, 5000);

    const handleSession = async (session: any, source: string) => {
      if (!isMounted) return;
      
      console.log(`[Auth] ${source}:`, session?.user?.id || 'no user');
      
      if (session?.user) {
        setAuthUserId(session.user.id);
        try {
          await callBootstrap();
          await fetchUserData(session.user.id);
          console.log('[Auth] User data loaded successfully');
        } catch (dataError) {
          console.error(`[Auth] Error loading user data from ${source}:`, dataError);
          // Don't throw - allow app to continue with partial data
        }
      } else {
        // Clear state when no session
        setUser(null);
        setRole(null);
        setStore(null);
        setCompany(null);
        setAuthUserId(null);
        bootstrapRan.current = false;
      }
      
      // ALWAYS set loading to false after handling session
      if (isMounted) {
        initComplete = true;
        setAuthLoading(false);
      }
    };

    // Subscribe to auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Event:', event);
      
      try {
        if (event === 'SIGNED_IN') {
          bootstrapRan.current = false;
          await handleSession(session, 'SIGNED_IN');
        } else if (event === 'SIGNED_OUT') {
          await handleSession(null, 'SIGNED_OUT');
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Just refresh data, don't change loading state if already loaded
          setAuthUserId(session.user.id);
          try {
            await fetchUserData(session.user.id);
          } catch (e) {
            console.error('[Auth] Token refresh data error:', e);
          }
        } else if (event === 'INITIAL_SESSION') {
          // Handle initial session - this covers both logged in and logged out states
          await handleSession(session, 'INITIAL_SESSION');
        }
      } catch (error) {
        console.error('[Auth] State change error:', error);
        if (isMounted) {
          initComplete = true;
          setAuthLoading(false);
        }
      }
    });

    // Also try getSession as backup (handles cases where INITIAL_SESSION doesn't fire)
    const initializeAuth = async () => {
      // Small delay to let INITIAL_SESSION fire first
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (initComplete) {
        console.log('[Auth] Init already complete from subscription');
        return;
      }

      try {
        console.log('[Auth] Fallback: calling getSession');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] getSession error:', error);
          if (isMounted) setAuthLoading(false);
          return;
        }

        // Only handle if subscription didn't already handle it
        if (!initComplete) {
          await handleSession(session, 'getSession-fallback');
        }
      } catch (error) {
        console.error('[Auth] Init error:', error);
        if (isMounted) {
          initComplete = true;
          setAuthLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      clearTimeout(failSafeTimeout);
      subscription.unsubscribe();
    };
  }, [fetchUserData, callBootstrap]);

  const isAuthenticated = authUserId !== null;
  const onboardingCompleted = user?.onboarding_completed === true;

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Erro ao fazer login: ' + error.message);
      throw error;
    }
    toast.success('Login realizado com sucesso!');
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) {
      toast.error('Erro ao criar conta: ' + error.message);
      throw error;
    }
    toast.success('Conta criada! Verifique seu email para confirmar.');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao sair: ' + error.message);
      throw error;
    }
    toast.success('Sessão encerrada');
  };

  const completeOnboarding = async (data: OnboardingData) => {
    try {
      const { data: result, error } = await supabase.rpc('complete_onboarding', {
        p_company_name: data.companyName,
        p_company_nif: data.companyNif || null,
        p_company_phone: data.companyPhone || null,
        p_company_address: data.companyAddress || null,
      });

      if (error) {
        console.error('Onboarding error:', error);
        toast.error('Erro ao criar empresa: ' + error.message);
        throw error;
      }

      // Refresh user data to get updated profile
      if (authUserId) {
        await fetchUserData(authUserId);
      }

      const message = (result as any)?.message || 'Empresa criada com sucesso!';
      toast.success(message);
    } catch (error) {
      console.error('Complete onboarding error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      store,
      company,
      loading: authLoading,
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
