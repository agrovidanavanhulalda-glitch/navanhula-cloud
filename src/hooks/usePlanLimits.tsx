import { useSubscription } from '@/hooks/useSubscription';
import type { PlanTier } from '@/lib/plans';
import { getPlanByTier } from '@/lib/plans';

export interface PlanLimits {
  tier: PlanTier;
  maxProducts: number;
  maxSellers: number;
  maxStores: number;
  canAccessModule: (module: string) => boolean;
  isAtLimit: (resource: 'products' | 'sellers' | 'stores', current: number) => boolean;
  loading: boolean;
}

const MODULE_ACCESS: Record<string, PlanTier[]> = {
  pos: ['starter', 'pro', 'enterprise'],
  inventory: ['starter', 'pro', 'enterprise'],
  reports_basic: ['starter', 'pro', 'enterprise'],
  reports_advanced: ['pro', 'enterprise'],
  crm: ['pro', 'enterprise'],
  fiscal: ['pro', 'enterprise'],
  hr: ['pro', 'enterprise'],
  commissions: ['pro', 'enterprise'],
  ai: ['enterprise'],
  ceo_dashboard: ['enterprise'],
  compliance: ['enterprise'],
  api: ['enterprise'],
  multi_store: ['pro', 'enterprise'],
};

export function usePlanLimits(): PlanLimits {
  const { subscription, loading } = useSubscription();

  const tier: PlanTier = (subscription as any)?.plan_tier || 'pro';
  const plan = getPlanByTier(tier);

  const maxProducts = plan.maxProducts;
  const maxSellers = plan.maxSellers;
  const maxStores = plan.maxStores;

  const canAccessModule = (module: string): boolean => {
    const allowed = MODULE_ACCESS[module];
    if (!allowed) return true; // unknown module = allow
    return allowed.includes(tier);
  };

  const isAtLimit = (resource: 'products' | 'sellers' | 'stores', current: number): boolean => {
    const limit = resource === 'products' ? maxProducts : resource === 'sellers' ? maxSellers : maxStores;
    if (limit === -1) return false; // unlimited
    return current >= limit;
  };

  return { tier, maxProducts, maxSellers, maxStores, canAccessModule, isAtLimit, loading };
}
