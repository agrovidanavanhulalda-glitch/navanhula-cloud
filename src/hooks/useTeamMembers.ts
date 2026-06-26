import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { onTeamEvent } from '@/lib/teamEvents';

export interface TeamMember {
  id: string;
  name: string;
  email: string | null;
  role: string;
  branchId: string | null;
  branchName: string | null;
  isActive: boolean;
  hasPermission: boolean;
}

interface UseTeamMembersOptions {
  permission?: string;
  branchId?: string | null;
  enabled?: boolean;
}

/**
 * Single source of truth for "who are the operators of this company".
 * Replaces LocalSellers / mockUsers in POS, Cash Register, Team, etc.
 */
export function useTeamMembers(opts: UseTeamMembersOptions = {}) {
  const { permission, branchId = null, enabled = true } = opts;
  const { company, appReady } = useAuth();
  const qc = useQueryClient();
  const companyId = (company as any)?.id ?? null;

  const queryKey = ['team-members', companyId, branchId, permission ?? null] as const;

  const query = useQuery({
    queryKey,
    enabled: enabled && appReady && !!companyId,
    staleTime: 60_000,
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await (supabase as any).rpc('view_team_members', {
        p_company_id: companyId,
        p_branch_id: branchId,
        p_permission: permission ?? null,
      });
      if (error) throw error;
      return ((data as any[]) || []).map((r) => ({
        id: r.user_id,
        name: r.full_name || r.email || 'Operador',
        email: r.email,
        role: r.role_label || 'viewer',
        branchId: r.branch_id,
        branchName: r.branch_name,
        isActive: !!r.is_active,
        hasPermission: !!r.has_permission,
      }));
    },
  });

  // Invalidate on any team mutation
  useEffect(() => {
    const off = onTeamEvent('ANY', () => {
      qc.invalidateQueries({ queryKey: ['team-members'] });
    });
    return off;
  }, [qc]);

  return {
    members: query.data ?? [],
    activeMembers: (query.data ?? []).filter((m) => m.isActive),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
