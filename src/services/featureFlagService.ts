import { supabase } from '@/integrations/supabase/client';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string | null;
  description: string | null;
  category: string;
  environment: string;
  enabled: boolean;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface FeatureFlagOverride {
  id: string;
  feature_flag_id: string;
  target_type: 'company' | 'tenant' | 'store' | 'plan' | 'user';
  target_id: string;
  enabled: boolean;
  reason: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

const cache = new Map<string, { value: boolean; at: number }>();
const TTL = 60_000;

export const FeatureFlagService = {
  async list(): Promise<FeatureFlag[]> {
    const { data, error } = await (supabase as any)
      .from('feature_flags')
      .select('*')
      .order('category')
      .order('key');
    if (error) throw error;
    return (data ?? []) as FeatureFlag[];
  },

  async listOverrides(flagId?: string): Promise<FeatureFlagOverride[]> {
    let q = (supabase as any).from('feature_flag_overrides').select('*').order('created_at', { ascending: false });
    if (flagId) q = q.eq('feature_flag_id', flagId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as FeatureFlagOverride[];
  },

  async upsertFlag(input: Partial<FeatureFlag> & { key: string }): Promise<string> {
    const { data, error } = await (supabase as any).rpc('founder_feature_flag_upsert', {
      p_id: input.id ?? null,
      p_key: input.key,
      p_name: input.name ?? null,
      p_description: input.description ?? null,
      p_category: input.category ?? 'Experimental',
      p_environment: input.environment ?? 'production',
      p_enabled: input.enabled ?? false,
    });
    if (error) throw error;
    cache.clear();
    return data as string;
  },

  async deleteFlag(id: string) {
    const { error } = await (supabase as any).rpc('founder_feature_flag_delete', { p_id: id });
    if (error) throw error;
    cache.clear();
  },

  async upsertOverride(input: {
    feature_flag_id: string;
    target_type: FeatureFlagOverride['target_type'];
    target_id: string;
    enabled: boolean;
    reason?: string | null;
    expires_at?: string | null;
  }) {
    const { error } = await (supabase as any).rpc('founder_feature_flag_override_upsert', {
      p_flag_id: input.feature_flag_id,
      p_target_type: input.target_type,
      p_target_id: input.target_id,
      p_enabled: input.enabled,
      p_reason: input.reason ?? null,
      p_expires_at: input.expires_at ?? null,
    });
    if (error) throw error;
    cache.clear();
  },

  async deleteOverride(id: string) {
    const { error } = await (supabase as any).rpc('founder_feature_flag_override_delete', { p_id: id });
    if (error) throw error;
    cache.clear();
  },

  async isEnabled(key: string, companyId?: string | null, storeId?: string | null): Promise<boolean> {
    const ck = `${key}|${companyId ?? ''}|${storeId ?? ''}`;
    const hit = cache.get(ck);
    if (hit && Date.now() - hit.at < TTL) return hit.value;
    const { data, error } = await (supabase as any).rpc('feature_flag_is_enabled', {
      p_key: key,
      p_company_id: companyId ?? null,
      p_store_id: storeId ?? null,
    });
    if (error) return false;
    const v = !!data;
    cache.set(ck, { value: v, at: Date.now() });
    return v;
  },

  invalidateCache() {
    cache.clear();
  },
};

export const FEATURE_FLAG_CATEGORIES = [
  'ERP','POS','CRM','Financeiro','Fiscal','RH','Compras','Vendas','Estoque',
  'Marketplace','Loja Online','API','Integrações','IA','ChatBot','Dashboard',
  'Relatórios','Notificações','Pagamentos','Importação','Exportação','Mobile',
  'Developer','Experimental',
] as const;

export const FEATURE_FLAG_ENVIRONMENTS = ['development','testing','staging','production','all'] as const;
