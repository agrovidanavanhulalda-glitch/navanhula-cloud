/**
 * Sprint 1.3 · Fase 3 · Integration Test #3
 * Sync Queue — offline enqueue → online replay → pos_complete_sale
 * → idempotency (p_client_sale_id) → queue removal / retry on failure.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpcMock = vi.fn();
const insertMock = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...a: any[]) => rpcMock(...a),
    from: () => ({ insert: insertMock }),
  },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { syncManager } from '@/lib/syncQueue';

beforeEach(() => {
  rpcMock.mockReset();
  localStorage.clear();
  syncManager.clearQueue();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

async function flush() {
  await syncManager.processQueue();
  // allow chained microtasks
  await Promise.resolve();
}

describe('Sync Queue — replay & idempotency', () => {
  it('rejects SALE payload missing p_client_sale_id (schema guard)', async () => {
    rpcMock.mockResolvedValue({ data: { success: true }, error: null });
    await syncManager.addTask('SALE', { rpcPayload: { p_total: 100 } });
    await flush();
    // task must remain in queue (failed, not sent)
    expect(syncManager.getTasksByType('SALE').length).toBe(1);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('replays SALE via pos_complete_sale with idempotency key and removes from queue', async () => {
    rpcMock.mockResolvedValue({ data: { success: true }, error: null });
    await syncManager.addTask('SALE', {
      rpcPayload: { p_client_sale_id: 'idem-1', p_total: 100 },
    });
    await flush();
    expect(rpcMock).toHaveBeenCalledWith('pos_complete_sale', {
      p_client_sale_id: 'idem-1',
      p_total: 100,
    });
    expect(syncManager.getTasksByType('SALE').length).toBe(0);
  });

  it('keeps task and increments retry when RPC returns success=false', async () => {
    rpcMock.mockResolvedValue({ data: { success: false, error: 'BOOM' }, error: null });
    await syncManager.addTask('SALE', {
      rpcPayload: { p_client_sale_id: 'idem-2' },
    });
    await flush();
    const tasks = syncManager.getTasksByType('SALE');
    expect(tasks.length).toBe(1);
    expect(tasks[0].retryCount).toBe(1);
    expect(tasks[0].error).toBe('BOOM');
  });

  it('does not process while offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    rpcMock.mockResolvedValue({ data: { success: true }, error: null });
    await syncManager.addTask('SALE', {
      rpcPayload: { p_client_sale_id: 'idem-3' },
    });
    await flush();
    expect(rpcMock).not.toHaveBeenCalled();
    expect(syncManager.getTasksByType('SALE').length).toBe(1);
  });

  it('is idempotent on double-enqueue when server dedupes by p_client_sale_id', async () => {
    // simulate server returning same result for both attempts
    rpcMock.mockResolvedValue({ data: { success: true }, error: null });
    await syncManager.addTask('SALE', { rpcPayload: { p_client_sale_id: 'idem-4' } });
    await flush();
    await syncManager.addTask('SALE', { rpcPayload: { p_client_sale_id: 'idem-4' } });
    await flush();
    // both drained independently; server-side dedupe is the source of truth
    expect(syncManager.getTasksByType('SALE').length).toBe(0);
    const keys = rpcMock.mock.calls.map(c => c[1].p_client_sale_id);
    expect(keys).toEqual(['idem-4', 'idem-4']);
  });
});
