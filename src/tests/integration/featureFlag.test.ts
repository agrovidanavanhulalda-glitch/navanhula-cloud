/**
 * Sprint 1.3 · Fase 3 · Integration Test #2
 * FeatureFlagService — TTL cache, key scoping, invalidation, fallback.
 * Precedence (Global→Plano→Empresa→Loja→Utilizador) is enforced server-side
 * by RPC feature_flag_is_enabled; here we verify the client contract only.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...a: any[]) => rpcMock(...a) },
}));

import { FeatureFlagService } from '@/services/featureFlagService';

beforeEach(() => {
  rpcMock.mockReset();
  FeatureFlagService.invalidateCache();
});

describe('FeatureFlagService', () => {
  it('returns RPC value and caches within TTL', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    const a = await FeatureFlagService.isEnabled('billing.v2', 'co-1', 's-1');
    const b = await FeatureFlagService.isEnabled('billing.v2', 'co-1', 's-1');
    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('feature_flag_is_enabled', {
      p_key: 'billing.v2',
      p_company_id: 'co-1',
      p_store_id: 's-1',
    });
  });

  it('cache key differentiates key|company|store', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    await FeatureFlagService.isEnabled('k', 'co-1', 's-1');
    await FeatureFlagService.isEnabled('k', 'co-1', 's-2');
    await FeatureFlagService.isEnabled('k', 'co-2', 's-1');
    await FeatureFlagService.isEnabled('other', 'co-1', 's-1');
    expect(rpcMock).toHaveBeenCalledTimes(4);
  });

  it('fallback to false on RPC error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'net' } });
    expect(await FeatureFlagService.isEnabled('x')).toBe(false);
  });

  it('invalidateCache forces re-query', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    await FeatureFlagService.isEnabled('k');
    FeatureFlagService.invalidateCache();
    await FeatureFlagService.isEnabled('k');
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });

  it('mutations (upsertFlag/deleteFlag) invalidate cache', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    await FeatureFlagService.isEnabled('k');
    rpcMock.mockResolvedValueOnce({ data: 'new-id', error: null });
    await FeatureFlagService.upsertFlag({ key: 'k', enabled: true });
    rpcMock.mockResolvedValue({ data: false, error: null });
    const v = await FeatureFlagService.isEnabled('k');
    expect(v).toBe(false);
  });
});
