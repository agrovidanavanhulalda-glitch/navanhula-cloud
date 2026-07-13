/**
 * Sprint 1.3 — Regression guard for SyncQueue schema versioning.
 * Legacy SALE tasks (missing p_client_sale_id) must be evicted on load
 * so idempotency via pos_complete_sale is preserved.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const STORAGE_KEY = 'navanhula_sync_queue';
const VERSION_KEY = 'navanhula_sync_queue_version';

function makeStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
    _dump: () => ({ ...store }),
  };
}

describe('syncQueue schema migration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('drops legacy SALE tasks without p_client_sale_id when schema version < 2', async () => {
    const storage = makeStorage();
    storage.setItem(VERSION_KEY, '1');
    storage.setItem(STORAGE_KEY, JSON.stringify([
      { id: '1', type: 'SALE', payload: { total: 10 }, retryCount: 0, createdAt: 1 },
      { id: '2', type: 'SALE', payload: { rpcPayload: { p_client_sale_id: 'abc' } }, retryCount: 0, createdAt: 2 },
      { id: '3', type: 'STOCK_ADJUSTMENT', payload: {}, retryCount: 0, createdAt: 3 },
    ]));
    Object.defineProperty(window, 'localStorage', { value: storage, writable: true, configurable: true });

    await import('./syncQueue');

    const remaining = JSON.parse(storage.getItem(STORAGE_KEY)!);
    const ids = remaining.map((t: any) => t.id).sort();
    expect(ids).toEqual(['2', '3']);
    expect(storage.getItem(VERSION_KEY)).toBe('2');
  });

  it('preserves queue when version already current', async () => {
    const storage = makeStorage();
    storage.setItem(VERSION_KEY, '2');
    const tasks = [
      { id: 'a', type: 'SALE', payload: { rpcPayload: { p_client_sale_id: 'x' } }, retryCount: 0, createdAt: 1 },
    ];
    storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    Object.defineProperty(window, 'localStorage', { value: storage, writable: true, configurable: true });

    await import('./syncQueue');

    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(tasks);
  });
});
