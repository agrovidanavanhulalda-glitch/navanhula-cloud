import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, Store, Company, AppRole, AuthContextType } from '@/types/pos';
import { toast } from 'sonner';
import { setFormatterCountry } from '@/lib/formatters';
import { isValidId } from '@/lib/uuid';
import { clearPermissionCache } from '@/hooks/usePermission';

/**
 * NAVANHULA CLOUD - Auth Context (RBAC Phase 2)
 *
 * Carrega o app_context unificado num único round-trip:
 *   auth -> user -> company -> roles -> permissions -> branch -> session_ready
 * Proíbe estados parciais: appReady só é true depois de tudo carregado.
 */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fallbackAuth: AuthContextType = {
  user: null,
  role: null,
  store: null,
  company: null,
  loading: true,
  isAuthenticated: false,
  onboardingCompleted: false,
  permissions: [],
  roles: [],
  branch: null,
  tenant: null,
  isMaster: false,
  isFounder: false,
  appReady: false,
  hasPerm: () => false,
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

const MAX_LOADING_TIME = 5000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // RBAC Phase 2 unified context
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [branch, setBranch] = useState<AuthContextType['branch']>(null);
  const [tenant, setTenant] = useState<AuthContextType['tenant']>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // Sync currency formatter with company country
  useEffect(() => {
    const country = (company as any)?.country || 'MZ';
    setFormatterCountry(country);
  }, [company]);

  const initComplete = useRef(false);
  const setupRan = useRef(false);
  const isInitializing = useRef(false);

  const forceComplete = useCallback(() => {
    if (!initComplete.current) {
      initComplete.current = true;
      setLoading(false);
    }
  }, []);

  /**
   * Single-shot loader for the unified app_context.
   * Never sets partial state — only flips `appReady` once everything is resolved.
   */
  const loadAppContext = useCallback(async (userId: string): Promise<void> => {
    if (!isValidId(userId)) return;
    try {
      const { data, error } = await supabase.rpc('get_user_app_context', { _user_id: userId });
      if (error || !data) {
        console.warn('[Auth] get_user_app_context failed, fallback to legacy fetch', error);
        await legacyFetchUserData(userId);
        return;
      }
      const ctx: any = data;

      const profile = ctx.profile as Profile | null;
      const companyRow = ctx.company as Company | null;
      const branchRow = ctx.branch as any;
      const tenantRow = ctx.tenant as any;
      const perms: string[] = Array.isArray(ctx.permissions) ? ctx.permissions : [];
      const rolesArr: string[] = Array.isArray(ctx.roles) ? ctx.roles : [];

      setUser(profile);
      setCompany(companyRow);
      setBranch(branchRow ? { id: branchRow.id, name: branchRow.name, company_id: branchRow.company_id } : null);
      setTenant(tenantRow ? { id: tenantRow.id, name: tenantRow.name, slug: tenantRow.slug } : null);
      setPermissions(perms);
      setRoles(rolesArr);
      setIsMaster(!!ctx.is_master);

      // Pick primary role (highest precedence)
      const ROLE_PRIORITY = ['owner','admin','ceo','director','manager','hr','cashier','seller','reseller','viewer'];
      const primary = ROLE_PRIORITY.find(r => rolesArr.includes(r)) || rolesArr[0] || 'viewer';
      setRole(primary as AppRole);

      // Store fetch (only if profile has a valid store_id)
      const storeId = (profile as any)?.store_id;
      if (isValidId(storeId)) {
        const { data: storeData } = await supabase.from('stores').select('*').eq('id', storeId).maybeSingle();
        setStore(storeData as Store | null);
      } else {
        setStore(null);
      }

      clearPermissionCache();
      setAppReady(true);
    } catch (e) {
      console.error('[Auth] loadAppContext crashed', e);
      setAppReady(false);
    }
  }, []);

  // Legacy fallback (kept for resilience if the RPC isn't available)
  const legacyFetchUserData = useCallback(async (userId: string) => {
    const [profileResult, userRolesResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);
    const profileData = profileResult.data as Profile | null;
    const rolesArr = (userRolesResult.data || []).map((r: any) => String(r.role).toLowerCase());
    const primary = (rolesArr[0] || 'viewer') as AppRole;
    setUser(profileData);
    setRoles(rolesArr);
    setRole(primary);
    setPermissions([]);
    setBranch(null);
    setTenant(null);
    if (profileData?.company_id && isValidId(profileData.company_id)) {
      const { data: c } = await supabase.from('companies').select('*').eq('id', profileData.company_id).maybeSingle();
      setCompany(c as Company | null);
    } else {
      setCompany(null);
    }
    setAppReady(true);
  }, []);

  const autoSetupUser = useCallback(async (userId: string) => {
    if (setupRan.current || isInitializing.current) return;
    isInitializing.current = true;
    try {
      // 1. Sync profile (so user_roles/profile rows exist)
      const { error: syncError } = await supabase.rpc('sync_user_profile', { target_user_id: userId });
      if (syncError) console.warn('[Auth] sync_user_profile error:', syncError);

      // 2. Bootstrap legacy structures (best-effort)
      try { await supabase.rpc('bootstrap_current_user'); } catch {}

      // 3. Atomic context load
      await loadAppContext(userId);
      setupRan.current = true;
    } catch (error) {
      console.error('[Auth] Critical setup error:', error);
      toast.error('Erro crítico na inicialização do sistema.');
    } finally {
      isInitializing.current = false;
      forceComplete();
    }
  }, [loadAppContext, forceComplete]);

  const refreshUserData = useCallback(async () => {
    if (authUserId) {
      setAppReady(false);
      await loadAppContext(authUserId);
    }
  }, [authUserId, loadAppContext]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        if (session?.user) {
          setAuthUserId(session.user.id);
          await autoSetupUser(session.user.id);
        } else {
          setUser(null); setRole(null); setStore(null); setCompany(null);
          setAuthUserId(null); setPermissions([]); setRoles([]); setBranch(null); setTenant(null);
          setIsMaster(false); setAppReady(false);
          setLoading(false); initComplete.current = true;
        }
      } catch (err) {
        console.error('[Auth] Init error:', err);
        if (mounted) { setLoading(false); initComplete.current = true; }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log(`[Auth] Event: ${event}`);
      if (event === 'SIGNED_OUT') {
        setUser(null); setRole(null); setStore(null); setCompany(null);
        setAuthUserId(null); setPermissions([]); setRoles([]); setBranch(null); setTenant(null);
        setIsMaster(false); setAppReady(false);
        setupRan.current = false;
        clearPermissionCache();
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

  const isAuthenticated = authUserId !== null;
  const onboardingCompleted = isAuthenticated;

  const permSet = useMemo(() => new Set(permissions), [permissions]);
  const hasPerm = useCallback(
    (key: string): boolean => isMaster || roles.includes('owner') || roles.includes('admin') || permSet.has(key),
    [isMaster, roles, permSet],
  );

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error('Erro ao fazer login: ' + error.message); throw error; }
    toast.success('Login realizado!');
  };

  const signUp = async (email: string, password: string, fullName: string, referralCode?: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, referral_code: referralCode ?? null },
      },
    });
    if (error) { toast.error('Erro ao criar conta: ' + error.message); throw error; }
    toast.success('Conta criada! Verifique seu email.');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error('Erro ao sair: ' + error.message); throw error; }
    toast.success('Sessão encerrada');
  };

  const completeOnboarding = async () => Promise.resolve();

  return (
    <AuthContext.Provider value={{
      user, role, store, company, loading,
      isAuthenticated, onboardingCompleted,
      permissions, roles, branch, tenant, isMaster,
      isFounder: !!(user as any)?.is_founder || (user as any)?.account_type === 'FOUNDER',
      appReady, hasPerm,
      signIn, signUp, signOut, completeOnboarding, refreshUserData,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
