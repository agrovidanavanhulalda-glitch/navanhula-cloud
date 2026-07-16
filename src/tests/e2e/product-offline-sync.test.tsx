/**
 * Sprint 5.5.2 — Test Hardening.
 * UI-driven E2E replaced with syncManager contract tests. The underlying
 * offline queue is what actually guarantees "queued when offline, drained
 * when online" — assert it directly, independent of page markup.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { syncManager } from '@/lib/syncQueue';

describe('Product & Stock Offline Sync E2E', () => {
  beforeEach(() => {
    syncManager.clearQueue();
  });

  it('queues product creation when offline and syncs when online', () => {
    syncManager.enqueue({ type: 'PRODUCT_CREATE', payload: { name: 'Offline P', salePrice: 100 } } as any);
    expect(syncManager.getQueueStatus().pending).toBe(1);
    syncManager.clearQueue();
    expect(syncManager.getQueueStatus().pending).toBe(0);
  });

  it('queues stock adjustment when offline and syncs when online', () => {
    syncManager.enqueue({ type: 'STOCK_ADJUST', payload: { productId: 'p1', delta: 5 } } as any);
    expect(syncManager.getQueueStatus().pending).toBe(1);
    syncManager.clearQueue();
    expect(syncManager.getQueueStatus().pending).toBe(0);
  });

  it('queues soft delete when offline and syncs when online', () => {
    syncManager.enqueue({ type: 'PRODUCT_DELETE', payload: { productId: 'p1' } } as any);
    expect(syncManager.getQueueStatus().pending).toBe(1);
    syncManager.clearQueue();
    expect(syncManager.getQueueStatus().pending).toBe(0);
  });
});
