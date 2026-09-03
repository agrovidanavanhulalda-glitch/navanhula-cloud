/**
 * Sprint 11.4 · Fase 3 — SyncManager: CASH_REGISTER_OPEN / CASH_REGISTER_CLOSE
 * Deterministic replay tests. No real RPC / network.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

type Call = { table: string; op: 'insert' | 'update'; payload: any; eqArgs?: [string, any] };
const calls: Call[] = [];
let failNext: { table: string; op: 'insert' | 'update'; times: number } | null = null;

const shouldFail = (table: string, op: 'insert' | 'update') => {
  if (failNext && failNext.table === table && failNext.op === op && failNext.times > 0) {
    failNext.times -= 1;
    return true;
  }
  return false;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: (table: string) => ({
      insert: (payload: any) => {
        const c: Call = { table, op: 'insert', payload };
        calls.push(c);
        return Promise.resolve(shouldFail(table, 'insert') ? { error: { message: 'NET_DOWN' } } : { error: null });
      },
      update: (payload: any) => ({
        eq: (col: string, val: any) => {
          const c: Call = { table, op: 'update', payload, eqArgs: [col, val] };
          calls.push(c);
          return Promise.resolve(shouldFail(table, 'update') ? { error: { message: 'NET_DOWN' } } : { error: null });
        },
      }),
    }),
  },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

import { syncManager } from '@/lib/syncQueue';

const setOnline = (v: boolean) =>
  Object.defineProperty(navigator, 'onLine', { value: v, configurable: true, writable: true });

const OPEN_PAYLOAD = {
  id: '11111111-1111-4111-8111-111111111111',
  store_id: 'store-A',
  user_id: 'user-op',
  opening_amount: 1000,
  status: 'open' as const,
  company_id: 'co-1',
  opened_at: '2026-09-03T10:00:00.000Z',
};
const CLOSE_PAYLOAD = {
  id: OPEN_PAYLOAD.id,
  closing_amount: 1250,
  closed_at: '2026-09-03T18:00:00.000Z',
};

/** addTask fires processQueue without awaiting it; settle until the loop is idle. */
const settle = async () => {
  for (let i = 0; i < 50 && syncManager.getQueueStatus().isProcessing; i++) {
    await new Promise(r => setTimeout(r, 0));
  }
  await new Promise(r => setTimeout(r, 0));
};
const enqueue = async (type: any, payload: any) => { await syncManager.addTask(type, payload); await settle(); };
const retry = async (id: string) => { await syncManager.retryTask(id); await settle(); };

const pendingCash = () => [
  ...syncManager.getTasksByType('CASH_REGISTER_OPEN'),
  ...syncManager.getTasksByType('CASH_REGISTER_CLOSE'),
];

beforeEach(() => {
  calls.length = 0;
  failNext = null;
  localStorage.clear();
  syncManager.clearQueue();
  syncManager.forceSetProcessing(false);
  setOnline(true);
});

describe('SyncManager — CASH_REGISTER_OPEN', () => {
  it('creates the task with the exact payload while offline (no network call)', async () => {
    setOnline(false);
    await enqueue('CASH_REGISTER_OPEN', OPEN_PAYLOAD);
    const tasks = syncManager.getTasksByType('CASH_REGISTER_OPEN');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].payload).toEqual(OPEN_PAYLOAD);
    expect(tasks[0].retryCount).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('persists the task to localStorage (survives reload)', async () => {
    setOnline(false);
    await enqueue('CASH_REGISTER_OPEN', OPEN_PAYLOAD);
    const raw = JSON.parse(localStorage.getItem('navanhula_sync_queue') || '[]');
    expect(raw).toHaveLength(1);
    expect(raw[0].type).toBe('CASH_REGISTER_OPEN');
    expect(raw[0].payload.id).toBe(OPEN_PAYLOAD.id);
  });

  it('replays as INSERT into cash_registers on reconnection and completes the task', async () => {
    setOnline(false);
    await enqueue('CASH_REGISTER_OPEN', OPEN_PAYLOAD);
    expect(calls).toHaveLength(0);
    setOnline(true);
    await syncManager.processQueue();
    expect(calls).toEqual([{ table: 'cash_registers', op: 'insert', payload: OPEN_PAYLOAD }]);
    expect(pendingCash()).toHaveLength(0);
  });

  it('keeps the task pending with retryCount+1 and error when the insert fails', async () => {
    failNext = { table: 'cash_registers', op: 'insert', times: 1 };
    await enqueue('CASH_REGISTER_OPEN', OPEN_PAYLOAD);
    const [t] = syncManager.getTasksByType('CASH_REGISTER_OPEN');
    expect(t).toBeDefined();
    expect(t.retryCount).toBe(1);
    expect(t.error).toBe('NET_DOWN');
    expect(t.payload).toEqual(OPEN_PAYLOAD); // payload preserved across failure
  });

  it('does not re-send during backoff window (no duplicate operation)', async () => {
    failNext = { table: 'cash_registers', op: 'insert', times: 1 };
    await enqueue('CASH_REGISTER_OPEN', OPEN_PAYLOAD);
    expect(calls).toHaveLength(1);
    await syncManager.processQueue(); // inside backoff → skipped
    expect(calls).toHaveLength(1);
    expect(syncManager.getTasksByType('CASH_REGISTER_OPEN')).toHaveLength(1);
  });

  it('retryTask resets backoff and replays exactly once more (same register id)', async () => {
    failNext = { table: 'cash_registers', op: 'insert', times: 1 };
    await enqueue('CASH_REGISTER_OPEN', OPEN_PAYLOAD);
    const [t] = syncManager.getTasksByType('CASH_REGISTER_OPEN');
    await retry(t.id);
    expect(calls).toHaveLength(2);
    expect(calls.every(c => c.payload.id === OPEN_PAYLOAD.id)).toBe(true);
    expect(pendingCash()).toHaveLength(0);
  });
});

describe('SyncManager — CASH_REGISTER_CLOSE', () => {
  it('creates the task with the exact payload while offline', async () => {
    setOnline(false);
    await enqueue('CASH_REGISTER_CLOSE', CLOSE_PAYLOAD);
    const tasks = syncManager.getTasksByType('CASH_REGISTER_CLOSE');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].payload).toEqual(CLOSE_PAYLOAD);
    expect(calls).toHaveLength(0);
  });

  it('replays as UPDATE ... eq(id) with id stripped from the update body', async () => {
    await enqueue('CASH_REGISTER_CLOSE', CLOSE_PAYLOAD);
    expect(calls).toHaveLength(1);
    const c = calls[0];
    expect(c.table).toBe('cash_registers');
    expect(c.op).toBe('update');
    expect(c.eqArgs).toEqual(['id', CLOSE_PAYLOAD.id]);
    expect(c.payload).toEqual({ closing_amount: 1250, closed_at: CLOSE_PAYLOAD.closed_at });
    expect(c.payload).not.toHaveProperty('id');
    expect(pendingCash()).toHaveLength(0);
  });

  it('failure keeps task pending; reconnection + retry replays once and drains', async () => {
    setOnline(false);
    await enqueue('CASH_REGISTER_CLOSE', CLOSE_PAYLOAD);
    failNext = { table: 'cash_registers', op: 'update', times: 1 };
    setOnline(true);
    await syncManager.processQueue();
    expect(syncManager.getTasksByType('CASH_REGISTER_CLOSE')[0].retryCount).toBe(1);
    await syncManager.retryAllFailed(); // only max-retried tasks → no-op
    expect(calls).toHaveLength(1);
    await retry(syncManager.getTasksByType('CASH_REGISTER_CLOSE')[0].id);
    expect(calls).toHaveLength(2);
    expect(pendingCash()).toHaveLength(0);
  });

  it('a close replayed twice is idempotent (same id, same values)', async () => {
    await enqueue('CASH_REGISTER_CLOSE', CLOSE_PAYLOAD);
    await enqueue('CASH_REGISTER_CLOSE', CLOSE_PAYLOAD);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual(calls[1]);
    expect(pendingCash()).toHaveLength(0);
  });
});

describe('SyncManager — queue ordering OPEN → SALE → CLOSE', () => {
  it('preserves FIFO order on replay', async () => {
    setOnline(false);
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.rpc as any).mockResolvedValue({ data: { success: true }, error: null });

    await enqueue('CASH_REGISTER_OPEN', OPEN_PAYLOAD);
    await enqueue('SALE', { rpcPayload: { p_client_sale_id: 'sale-1', p_cash_register_id: OPEN_PAYLOAD.id } });
    await enqueue('CASH_REGISTER_CLOSE', CLOSE_PAYLOAD);

    const order: string[] = [];
    const unsub = syncManager.subscribe((ev, task) => { if (ev === 'started') order.push(task.type); });
    setOnline(true);
    await syncManager.processQueue();
    unsub();

    expect(order).toEqual(['CASH_REGISTER_OPEN', 'SALE', 'CASH_REGISTER_CLOSE']);
    expect(calls.map(c => c.op)).toEqual(['insert', 'update']);
    expect(supabase.rpc).toHaveBeenCalledWith('pos_complete_sale', expect.objectContaining({ p_client_sale_id: 'sale-1' }));
    expect(pendingCash()).toHaveLength(0);
    expect(syncManager.getTasksByType('SALE')).toHaveLength(0);
  });

  it('a failed OPEN does not block the following CLOSE from being attempted, and OPEN stays pending', async () => {
    setOnline(false);
    await enqueue('CASH_REGISTER_OPEN', OPEN_PAYLOAD);
    await enqueue('CASH_REGISTER_CLOSE', CLOSE_PAYLOAD);
    failNext = { table: 'cash_registers', op: 'insert', times: 1 };
    setOnline(true);
    await syncManager.processQueue();
    expect(syncManager.getTasksByType('CASH_REGISTER_OPEN')).toHaveLength(1);
    expect(syncManager.getTasksByType('CASH_REGISTER_CLOSE')).toHaveLength(0);
  });

  it('while offline nothing is replayed regardless of queue depth', async () => {
    setOnline(false);
    await enqueue('CASH_REGISTER_OPEN', OPEN_PAYLOAD);
    await enqueue('CASH_REGISTER_CLOSE', CLOSE_PAYLOAD);
    await syncManager.processQueue();
    expect(calls).toHaveLength(0);
    expect(pendingCash()).toHaveLength(2);
  });
});
