import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

  const fetchUserData = useCallback(async (userId: string): Promise<boolean> => {
    try {
      // Fetch profile - use maybeSingle to handle missing profiles gracefully
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, store:stores(*)')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // Don't logout - just log the error, keep the auth session
        return false;
      }

      // Fetch role - use maybeSingle to handle missing roles gracefully
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
        // Don't logout - continue with default role
      }

      // Only update state if we have profile data
      if (profileData) {
        setUser(profileData as Profile);
        setRole((roleData?.role as AppRole) || 'seller');
        setStore(profileData?.store as Store || null);
      }
      
      return true;
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Never logout due to fetch errors - maintain session
      return false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Check for existing session FIRST
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

    // Set up auth state listener AFTER initial check
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log('Auth state change:', event, session?.user?.id);

      if (event === 'SIGNED_IN' && session?.user) {
        setAuthUserId(session.user.id);
        // Wait for profile data before completing
        await fetchUserData(session.user.id);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
        setStore(null);
        setAuthUserId(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed - session still valid, refresh user data
        setAuthUserId(session.user.id);
        await fetchUserData(session.user.id);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  // Determine if user is authenticated based on authUserId (from Supabase Auth)
  // This ensures we don't redirect to login just because profile fetch failed
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
