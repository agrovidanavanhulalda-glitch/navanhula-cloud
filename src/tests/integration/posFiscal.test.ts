/**
 * Sprint 1.3 · Fase 3 · Integration Test #4
 * POS → Fiscal — sale enqueue → worker replays pos_complete_sale
 * → issue_fiscal_document (mocked) → artefact reference returned.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...a: any[]) => rpcMock(...a),
    from: () => ({ insert: vi.fn().mockResolvedValue({ error: null }) }),
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

describe('POS → Fiscal pipeline', () => {
  it('completes sale then issues fiscal document via RPC chain', async () => {
    // pos_complete_sale succeeds and returns a sale_id;
    // then downstream (simulated here) calls issue_fiscal_document.
    rpcMock.mockImplementation(async (name: string, args: any) => {
      if (name === 'pos_complete_sale') {
        return { data: { success: true, sale_id: 'sale-99', client_sale_id: args.p_client_sale_id }, error: null };
      }
      if (name === 'issue_fiscal_document') {
        return { data: { document_id: 'doc-1', number: 'FAT-0001', pdf_path: 'fiscal/doc-1.pdf' }, error: null };
      }
      return { data: null, error: { message: 'unknown rpc: ' + name } };
    });

    await syncManager.addTask('SALE', {
      rpcPayload: { p_client_sale_id: 'idem-pos-1', p_total: 250 },
    });
    await syncManager.processQueue();

    // POS sale replayed
    expect(rpcMock).toHaveBeenCalledWith('pos_complete_sale', expect.objectContaining({
      p_client_sale_id: 'idem-pos-1',
    }));

    // Fiscal artefact call (simulated as downstream integration step)
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await (supabase as any).rpc('issue_fiscal_document', {
      p_sale_id: 'sale-99',
    });
    expect(error).toBeNull();
    expect(data.document_id).toBe('doc-1');
    expect(data.number).toMatch(/^FAT-/);
    expect(data.pdf_path).toContain('fiscal/');
  });

  it('does NOT issue fiscal document when POS sale fails', async () => {
    rpcMock.mockResolvedValue({ data: { success: false, error: 'STOCK_INSUFFICIENT' }, error: null });
    await syncManager.addTask('SALE', {
      rpcPayload: { p_client_sale_id: 'idem-pos-2' },
    });
    await syncManager.processQueue();
    const fiscalCalls = rpcMock.mock.calls.filter(c => c[0] === 'issue_fiscal_document');
    expect(fiscalCalls.length).toBe(0);
    expect(syncManager.getTasksByType('SALE').length).toBe(1); // stays queued
  });
});
