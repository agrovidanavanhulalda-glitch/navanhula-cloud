import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, Store, AppRole, AuthContextType } from '@/types/pos';
import { toast } from 'sonner';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Prevent duplicate bootstrap calls
  const bootstrapRan = useRef(false);

  /**
   * Call the bootstrap function on the server to ensure profile/role/store exist.
   * SECURITY DEFINER function so it can INSERT where RLS would block.
   */
  const callBootstrap = useCallback(async () => {
    if (bootstrapRan.current) return;
    bootstrapRan.current = true;
    try {
      const { error } = await supabase.rpc('bootstrap_current_user');
      if (error) {
        console.error('Bootstrap error:', error);
        // Non-fatal – we'll continue and just fetch whatever data exists
      }
    } catch (e) {
      console.error('Bootstrap exception:', e);
    }
  }, []);

  const fetchUserData = useCallback(async (userId: string): Promise<boolean> => {
    try {
      // Fetch profile with store
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, store:stores(*)')
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

      if (profileData) {
        setUser(profileData as Profile);
        setRole((roleData?.role as AppRole) || 'seller');
        setStore((profileData as any)?.store as Store || null);
      } else {
        // Profile still missing after bootstrap – set minimal fallback
        setRole((roleData?.role as AppRole) || 'seller');
      }

      return true;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          if (isMounted) setLoading(false);
          return;
        }

        if (session?.user) {
          if (isMounted) {
            setAuthUserId(session.user.id);
            // Ensure profile/role exist
            await callBootstrap();
            await fetchUserData(session.user.id);
          }
        }

        if (isMounted) setLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log('Auth state change:', event, session?.user?.id);

      if (event === 'SIGNED_IN' && session?.user) {
        bootstrapRan.current = false; // allow bootstrap for new sign-in
        setAuthUserId(session.user.id);
        await callBootstrap();
        await fetchUserData(session.user.id);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
        setStore(null);
        setAuthUserId(null);
        bootstrapRan.current = false;
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setAuthUserId(session.user.id);
        await fetchUserData(session.user.id);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData, callBootstrap]);

  const isAuthenticated = authUserId !== null;

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Erro ao fazer login: ' + error.message);
      throw error;
    }
    toast.success('Login realizado com sucesso!');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao sair: ' + error.message);
      throw error;
    }
    toast.success('Sessão encerrada');
  };

  return (
    <AuthContext.Provider value={{ user, role, store, loading, isAuthenticated, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
