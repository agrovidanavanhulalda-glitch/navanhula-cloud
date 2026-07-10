import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SimulationSession {
  session_id: string;
  target_id: string;
  target_name: string | null;
  target_email: string | null;
  company_id: string | null;
  company_name: string | null;
  store_id: string | null;
  role: string | null;
  started_at: string;
  expires_at: string | null;
  reason: string | null;
}

interface SimulationContextValue {
  session: SimulationSession | null;
  loading: boolean;
  isActive: boolean;
  startSimulation: (params: {
    target_user_id: string;
    company_id?: string | null;
    store_id?: string | null;
    role?: string | null;
    reason?: string | null;
    expires_minutes?: number;
  }) => Promise<void>;
  endSimulation: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SimulationContext = createContext<SimulationContextValue | undefined>(undefined);

const STORAGE_KEY = 'nav.simulation.session';

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isFounder, isAuthenticated } = useAuth();
  const [session, setSession] = useState<SimulationSession | null>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SimulationSession) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const persist = useCallback((s: SimulationSession | null) => {
    setSession(s);
    try {
      if (s) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !isFounder) {
      persist(null);
      return;
    }
    const { data, error } = await supabase.rpc('founder_impersonate_current' as any);
    if (error) {
      console.warn('[Simulation] current failed', error);
      return;
    }
    persist((data as SimulationSession | null) ?? null);
  }, [isAuthenticated, isFounder, persist]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-expire check
  useEffect(() => {
    if (!session?.expires_at) return;
    const ms = new Date(session.expires_at).getTime() - Date.now();
    if (ms <= 0) {
      endSimulation();
      return;
    }
    const t = setTimeout(() => endSimulation(), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.expires_at]);

  const startSimulation: SimulationContextValue['startSimulation'] = useCallback(async (params) => {
    if (!isFounder) {
      toast.error('Acesso negado');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('founder_impersonate_start' as any, {
        p_target_user_id: params.target_user_id,
        p_company_id: params.company_id ?? null,
        p_store_id: params.store_id ?? null,
        p_role: params.role ?? null,
        p_reason: params.reason ?? null,
        p_expires_minutes: params.expires_minutes ?? 60,
        p_ip: null,
        p_user_agent: navigator.userAgent,
      });
      if (error) throw error;
      await refresh();
      toast.success('Simulação iniciada');
    } catch (e: any) {
      toast.error(e.message || 'Falha ao iniciar simulação');
    } finally {
      setLoading(false);
    }
  }, [isFounder, refresh]);

  const endSimulation = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.rpc('founder_impersonate_end' as any);
      persist(null);
      toast.success('Simulação encerrada');
    } catch (e: any) {
      toast.error(e.message || 'Falha ao encerrar');
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const value = useMemo<SimulationContextValue>(() => ({
    session,
    loading,
    isActive: !!session,
    startSimulation,
    endSimulation,
    refresh,
  }), [session, loading, startSimulation, endSimulation, refresh]);

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};

export const useSimulation = (): SimulationContextValue => {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    return {
      session: null,
      loading: false,
      isActive: false,
      startSimulation: async () => {},
      endSimulation: async () => {},
      refresh: async () => {},
    };
  }
  return ctx;
};
