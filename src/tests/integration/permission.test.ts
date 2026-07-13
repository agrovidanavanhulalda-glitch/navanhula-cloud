/**
 * Sprint 1.3 · Fase 3 · Integration Test #1
 * Permission / RBAC — user_has_permission + cache + invalidation.
 * Mocks: supabase.auth.getUser + supabase.rpc('user_has_permission').
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const getUserMock = vi.fn();
const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: (...a: any[]) => getUserMock(...a) },
    rpc: (...a: any[]) => rpcMock(...a),
  },
}));

import { usePermission, clearPermissionCache } from '@/hooks/usePermission';

beforeEach(() => {
  clearPermissionCache();
  getUserMock.mockReset();
  rpcMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
});

describe('Permission / RBAC', () => {
  it('denies when unauthenticated', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    const { result } = renderHook(() => usePermission('pos.sell'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allowed).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('grants when RPC returns true and caches subsequent calls', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    const { result, rerender } = renderHook(
      ({ k }) => usePermission(k, { company_id: 'c1' }),
      { initialProps: { k: 'pos.sell' } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allowed).toBe(true);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    // Same scope+key → cache hit (no additional RPC)
    rerender({ k: 'pos.sell' });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it('cache is scoped by userId|key|scope — different scope re-queries', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    const { rerender } = renderHook(
      ({ scope }) => usePermission('pos.sell', scope),
      { initialProps: { scope: { company_id: 'c1' } as any } }
    );
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));
    rerender({ scope: { company_id: 'c2' } as any });
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(2));
  });

  it('denies on RPC error (never throws)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'RLS block' } });
    const { result } = renderHook(() => usePermission('admin.only'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allowed).toBe(false);
  });

  it('clearPermissionCache forces re-query', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    const { result, rerender } = renderHook(() => usePermission('pos.sell'));
    await waitFor(() => expect(result.current.allowed).toBe(true));
    expect(rpcMock).toHaveBeenCalledTimes(1);
    clearPermissionCache();
    rerender();
    // Trigger a fresh mount to bypass memoized effect
    const { result: r2 } = renderHook(() => usePermission('pos.sell'));
    await waitFor(() => expect(r2.current.loading).toBe(false));
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });

  it('multi-tenant isolation: different userId → separate cache slot', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    const { result: r1 } = renderHook(() => usePermission('pos.sell', { company_id: 'c1' }));
    await waitFor(() => expect(r1.current.allowed).toBe(true));
    // switch user
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-2' } } });
    const { result: r2 } = renderHook(() => usePermission('pos.sell', { company_id: 'c1' }));
    await waitFor(() => expect(r2.current.loading).toBe(false));
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });
});
