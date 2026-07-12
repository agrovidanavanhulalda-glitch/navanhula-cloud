import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SyncTask {
  id: string;
  type: 'SALE' | 'STOCK_ADJUSTMENT' | 'STORE_UPDATE' | 'PRODUCT_UPDATE' | 'ONBOARDING' | 'EXPORT_HISTORY';
  payload: any;
  retryCount: number;
  lastAttempt?: number;
  error?: string;
  createdAt: number;
}

const STORAGE_KEY = 'navanhula_sync_queue';
const QUEUE_SCHEMA_VERSION_KEY = 'navanhula_sync_queue_version';
// Bump whenever the canonical payload shape changes. Pre-fiscal Quality Gate
// (Sprint 0.2 / Etapa 3): SALE tasks MUST carry rpcPayload.p_client_sale_id.
const QUEUE_SCHEMA_VERSION = 2;
const MAX_RETRIES = 5;
const BACKOFF_FACTOR = 2000; // 2s base

type SyncListener = (event: 'added' | 'started' | 'completed' | 'failed', task: SyncTask) => void;

class SyncManager {
  private queue: SyncTask[] = [];
  private isProcessing = false;
  private listeners: Set<SyncListener> = new Set();

  constructor() {
    this.loadQueue();
    // Start processing loop if online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.processQueue());
      // Initial process
      setTimeout(() => this.processQueue(), 5000);
    }
  }

  subscribe(listener: SyncListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: 'added' | 'started' | 'completed' | 'failed', task: SyncTask) {
    this.listeners.forEach(l => l(event, task));
  }

  private loadQueue() {
    const savedVersion = Number(localStorage.getItem(QUEUE_SCHEMA_VERSION_KEY) ?? '0');
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: SyncTask[] = JSON.parse(saved);
        if (savedVersion < QUEUE_SCHEMA_VERSION) {
          // Official strategy: INVALIDATE any legacy tasks. Pre-Etapa-5 SALE payloads
          // bypassed pos_complete_sale and would break idempotency / double-post
          // financial rows. Never let old formats coexist.
          const dropped = parsed.filter(t =>
            t.type === 'SALE' && !t?.payload?.rpcPayload?.p_client_sale_id
          );
          if (dropped.length > 0) {
            console.warn(`[Sync] Invalidating ${dropped.length} legacy SALE task(s) (schema < v${QUEUE_SCHEMA_VERSION}).`);
          }
          this.queue = parsed.filter(t =>
            !(t.type === 'SALE' && !t?.payload?.rpcPayload?.p_client_sale_id)
          );
          localStorage.setItem(QUEUE_SCHEMA_VERSION_KEY, String(QUEUE_SCHEMA_VERSION));
          this.saveQueue();
        } else {
          this.queue = parsed;
        }
      } catch (e) {
        console.error('[Sync] Error parsing queue', e);
        this.queue = [];
        localStorage.setItem(QUEUE_SCHEMA_VERSION_KEY, String(QUEUE_SCHEMA_VERSION));
      }
    } else {
      localStorage.setItem(QUEUE_SCHEMA_VERSION_KEY, String(QUEUE_SCHEMA_VERSION));
    }
  }

  private saveQueue() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
  }

  async addTask(type: SyncTask['type'], payload: any) {
    const task: SyncTask = {
      id: crypto.randomUUID(),
      type,
      payload,
      retryCount: 0,
      createdAt: Date.now(),
    };
    this.queue.push(task);
    this.saveQueue();
    this.notify('added', task);
    this.processQueue();
  }

  getTasksByType(type: SyncTask['type']) {
    return this.queue.filter(t => t.type === type);
  }

  async processQueue() {
    if (this.isProcessing || !navigator.onLine || this.queue.length === 0) return;

    this.isProcessing = true;
    console.log(`[Sync] Processing queue (${this.queue.length} tasks)`);

    const tasksToProcess = [...this.queue];
    
    for (const task of tasksToProcess) {
      // Check backoff
      if (task.lastAttempt) {
        const waitTime = Math.pow(2, task.retryCount) * BACKOFF_FACTOR;
        if (Date.now() - task.lastAttempt < waitTime) continue;
      }

      try {
        this.notify('started', task);
        await this.executeTask(task);
        // Success: remove from queue
        this.queue = this.queue.filter(t => t.id !== task.id);
        this.saveQueue();
        this.notify('completed', task);
        console.log(`[Sync] Task ${task.type} (${task.id}) synced successfully`);
      } catch (error: any) {
        console.error(`[Sync] Task ${task.type} failed:`, error);
        
        task.retryCount++;
        task.lastAttempt = Date.now();
        task.error = error.message || 'Unknown error';

        if (task.retryCount >= MAX_RETRIES) {
          console.error(`[Sync] Task ${task.id} reached max retries. Moving to graveyard or alerting user.`);
          toast.error(`Falha persistente ao sincronizar ${task.type}. Verifique sua conexão.`);
          // We keep it in queue for manual retry or UI intervention
        }
        this.saveQueue();
        this.notify('failed', task);
      }
    }

    this.isProcessing = false;
    
    // If there are still items, schedule next run
    if (this.queue.length > 0) {
      const hasRetryable = this.queue.some(t => t.retryCount < MAX_RETRIES);
      if (hasRetryable) {
        setTimeout(() => this.processQueue(), 10000);
      }
    }
  }

  async retryTask(taskId: string) {
    const task = this.queue.find(t => t.id === taskId || (t.payload && t.payload.id === taskId));
    if (task) {
      task.retryCount = 0;
      task.lastAttempt = undefined;
      task.error = undefined;
      this.saveQueue();
      this.processQueue();
    }
  }

  async retryAllFailed() {
    let changed = false;
    this.queue.forEach(task => {
      if (task.retryCount >= MAX_RETRIES) {
        task.retryCount = 0;
        task.lastAttempt = undefined;
        task.error = undefined;
        changed = true;
      }
    });
    if (changed) {
      this.saveQueue();
      this.processQueue();
    }
  }

  private async executeTask(task: SyncTask) {
    try {
      switch (task.type) {
        case 'SALE':
          await this.syncSale(task.payload);
          break;
        case 'STOCK_ADJUSTMENT':
          await this.syncStockAdjustment(task.payload);
          break;
        case 'PRODUCT_UPDATE':
          await this.syncProductUpdate(task.payload);
          break;
        case 'STORE_UPDATE':
          await this.syncStoreUpdate(task.payload);
          break;
        case 'ONBOARDING':
          await this.syncOnboarding(task.payload);
          break;
        case 'EXPORT_HISTORY':
          await this.syncExportHistory(task.payload);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
      
      // Log successful attempt for export history
      if (task.type === 'EXPORT_HISTORY' && task.payload?.id) {
        await this.logExportAttempt(task.payload.id, 'success', undefined, task.retryCount);
      }
    } catch (error: any) {
      if (task.type === 'EXPORT_HISTORY' && task.payload?.id) {
        await this.logExportAttempt(task.payload.id, 'error', error.message, task.retryCount);
      }
      throw error;
    }
  }

  private async logExportAttempt(historyId: string, status: string, error?: string, retryCount: number = 0) {
    try {
      await supabase.from('export_attempts_logs').insert({
        export_history_id: historyId,
        status,
        error_message: error,
        retry_count: retryCount
      });
    } catch (e) {
      console.error('[Sync] Failed to log export attempt', e);
    }
  }

  private async syncSale(payload: any) {
    // ⚠️ Sync Engine Unification (Sprint 0.2 / Etapa 5):
    // The syncManager is a dumb pipe — it only replays the canonical RPC payload
    // captured at offline time. All business logic (sale + items + stock + finance +
    // cash movement + audit + voucher + wallet credit) lives inside pos_complete_sale.
    // Idempotency is guaranteed server-side via p_client_sale_id.
    const rpcPayload = payload?.rpcPayload ?? payload;
    if (!rpcPayload || !rpcPayload.p_client_sale_id) {
      throw new Error('SYNC_PAYLOAD_INVALID: missing p_client_sale_id (idempotency key)');
    }
    const { data, error } = await supabase.rpc('pos_complete_sale', rpcPayload);
    if (error) throw error;
    const result = data as any;
    if (!result?.success) {
      throw new Error(result?.error || 'pos_complete_sale returned success=false');
    }
  }

  private async syncStockAdjustment(payload: any) {
    const { data, error } = await supabase.rpc('add_inventory_adjustment', payload);
    if (error) {
      if (error.message?.includes('Insufficient') || error.message?.includes('Estoque insuficiente')) {
        console.warn('[Sync] Business logic error, task marked as failed', error.message);
      }
      throw error;
    }
    
    const result = data as any;
    if (result && result.success === false) {
      throw new Error(result.error || 'Erro no ajuste de estoque');
    }
    
    console.log('[Sync] Stock adjustment result:', result);
  }

  private async syncOnboarding(payload: any) {
    const { step, value, userId } = payload;
    const { error } = await supabase
      .from('onboarding_progress')
      .update({ [step]: value })
      .eq('user_id', userId);
    if (error) throw error;
  }

  private async syncExportHistory(payload: any) {
    const { error } = await supabase
      .from('export_history')
      .insert(payload);
    if (error) throw error;
  }

  private async syncProductUpdate(payload: any) {
    const { id, product, action } = payload;
    if (action === 'CREATE') {
      const result = await supabase.from('products').insert(product);
      if (result && (result as any).error) throw (result as any).error;
    } else if (action === 'UPDATE') {
      const result = await supabase.from('products').update(product).eq('id', id);
      if (result && (result as any).error) throw (result as any).error;
    } else if (action === 'DELETE') {
      const result = await supabase
        .from('products')
        .update({ status: 'deleted', deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (result && (result as any).error) throw (result as any).error;
    }
  }

  private async syncStoreUpdate(payload: any) {
    const { id, store, action } = payload;
    if (action === 'CREATE') {
      const { error } = await supabase.from('stores').insert(store);
      if (error) throw error;
    } else if (action === 'UPDATE') {
      const { error } = await supabase.from('stores').update(store).eq('id', id);
      if (error) throw error;
    } else if (action === 'DELETE') {
      const { error } = await supabase.from('stores').delete().eq('id', id);
      if (error) throw error;
    }
  }

  getQueueStatus() {

    return {
      pending: this.queue.length,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      lastProcessed: Date.now(),
      isProcessing: this.isProcessing
    };
  }

  // Used for testing
  forceSetProcessing(val: boolean) {
    this.isProcessing = val;
  }

  // Used for testing
  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }
}

export const syncManager = new SyncManager();
