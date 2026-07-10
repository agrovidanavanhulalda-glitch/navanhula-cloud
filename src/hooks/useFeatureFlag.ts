import { useQuery } from '@tanstack/react-query';
import { FeatureFlagService } from '@/services/featureFlagService';

export function useFeatureFlag(key: string, companyId?: string | null, storeId?: string | null) {
  const q = useQuery({
    queryKey: ['feature-flag', key, companyId ?? null, storeId ?? null],
    queryFn: () => FeatureFlagService.isEnabled(key, companyId, storeId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  return { enabled: q.data ?? false, isLoading: q.isLoading };
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ['feature-flags', 'all'],
    queryFn: () => FeatureFlagService.list(),
    staleTime: 60_000,
  });
}
