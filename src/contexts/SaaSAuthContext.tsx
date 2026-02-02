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

    // FAIL-SAFE: Maximum loading time of 8 seconds
    const failSafeTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth loading fail-safe triggered - forcing loading to false');
        setAuthLoading(false);
      }
    }, 8000);

    // IMPORTANT: subscribe FIRST, then fetch session (avoids missing initial events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log('Auth state change:', event, session?.user?.id);

      try {
        if (event === 'SIGNED_IN' && session?.user) {
          bootstrapRan.current = false;
          setAuthUserId(session.user.id);
          try {
            await callBootstrap();
            await fetchUserData(session.user.id);
          } catch (dataError) {
            console.error('Error in SIGNED_IN handler:', dataError);
          }
          setAuthLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setRole(null);
          setStore(null);
          setCompany(null);
          setAuthUserId(null);
          bootstrapRan.current = false;
          setAuthLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setAuthUserId(session.user.id);
          try {
            await fetchUserData(session.user.id);
          } catch (dataError) {
            console.error('Error refreshing user data:', dataError);
          }
          // Don't change loading state on token refresh
        } else if (event === 'INITIAL_SESSION') {
          // If there's no session, resolve authLoading.
          if (!session) {
            setAuthLoading(false);
          }
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        // Fail-safe: never block the app with infinite loading
        setAuthLoading(false);
      }
    });

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          if (isMounted) setAuthLoading(false);
          return;
        }

        if (session?.user) {
          if (isMounted) {
            setAuthUserId(session.user.id);
            try {
              await callBootstrap();
              await fetchUserData(session.user.id);
            } catch (dataError) {
              console.error('Error fetching user data:', dataError);
              // Continue anyway - allow access to onboarding
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        // ALWAYS resolve authLoading (success, error, or no data)
        if (isMounted) setAuthLoading(false);
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
