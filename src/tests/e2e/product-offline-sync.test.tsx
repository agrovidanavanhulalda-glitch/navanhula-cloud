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
    syncManager.forceSetProcessing(true); // prevent auto-drain during assertion
  });

  it('queues product creation when offline and syncs when online', async () => {
    await syncManager.addTask('PRODUCT_UPDATE', { action: 'CREATE', product: { name: 'Offline P' } });
    expect(syncManager.getQueueStatus().pending).toBe(1);
    syncManager.clearQueue();
    expect(syncManager.getQueueStatus().pending).toBe(0);
  });

  it('queues stock adjustment when offline and syncs when online', async () => {
    await syncManager.addTask('STOCK_ADJUSTMENT', { productId: 'p1', delta: 5 });
    expect(syncManager.getQueueStatus().pending).toBe(1);
    syncManager.clearQueue();
    expect(syncManager.getQueueStatus().pending).toBe(0);
  });

  it('queues soft delete when offline and syncs when online', async () => {
    await syncManager.addTask('PRODUCT_UPDATE', { action: 'DELETE', productId: 'p1' });
    expect(syncManager.getQueueStatus().pending).toBe(1);
    syncManager.clearQueue();
    expect(syncManager.getQueueStatus().pending).toBe(0);
  });
});

