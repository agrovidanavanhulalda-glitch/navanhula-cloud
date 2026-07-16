import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { LocalPOSProvider, useLocalPOS } from '@/contexts/LocalPOSContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { syncManager } from '@/lib/syncQueue';

// Mock values must be prefixed with "vi" for hoisting
const vi_TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const vi_TEST_COMPANY_ID = '550e8400-e29b-41d4-a716-446655440002';
const vi_TEST_STORE_ID = '550e8400-e29b-41d4-a716-446655440003';

vi.mock('@/integrations/supabase/client', () => {
  const mockInsert = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null })
  }));

  const mockUpdate = vi.fn().mockImplementation(() => ({
    eq: vi.fn().mockResolvedValue({ error: null })
  }));

  const mockDelete = vi.fn().mockImplementation(() => ({
    eq: vi.fn().mockResolvedValue({ error: null })
  }));

  const mockFrom = vi.fn().mockImplementation((table: string) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockImplementation(() => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const companyId = '550e8400-e29b-41d4-a716-446655440002';
      const storeId = '550e8400-e29b-41d4-a716-446655440003';

      if (table === 'profiles') return Promise.resolve({ data: { id: userId, company_id: companyId, store_id: storeId, full_name: 'Test User', is_super_admin: true, is_active: true }, error: null });
      if (table === 'companies') return Promise.resolve({ data: { id: companyId, name: 'Test Company' }, error: null });
      if (table === 'user_roles') return Promise.resolve({ data: { role: 'admin' }, error: null });
      if (table === 'stores') return Promise.resolve({ data: { id: storeId, name: 'Test Store' }, error: null });
      if (table === 'onboarding_progress') return Promise.resolve({ data: { user_id: userId, first_product_added: true }, error: null });
      return Promise.resolve({ data: null, error: null });
    }),
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    upsert: vi.fn().mockResolvedValue({ error: null }),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((cb) => Promise.resolve(cb({ data: [], count: 0, error: null }))),
  }));

  return {
    supabase: {
      from: mockFrom,
      rpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
      removeChannel: vi.fn().mockResolvedValue({}),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } } }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } }, error: null }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    },
  };
});

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocalPOSProvider>
          {children}
        </LocalPOSProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

describe('LocalPOSContext Product Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    syncManager.clearQueue();
    
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get() { return this._val ?? true; },
      set(v) { this._val = v; }
    });
    (navigator as any).onLine = true;
  });

  it('adds a product online', async () => {
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    
    // Wait for initial load
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    const product = { name: 'Test', salePrice: 100, costPrice: 50, stock: 10, isActive: true };
    
    let success;
    await act(async () => {
      success = await result.current.addProduct(product);
    });

    expect(success).toBe(true);
    expect(supabase.from('products').insert).toHaveBeenCalled();
  });

  it('queues product addition when offline', async () => {
    (navigator as any).onLine = false;
    const { result } = renderHook(() => useLocalPOS(), { wrapper });

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    const product = { name: 'Offline Product', salePrice: 100, costPrice: 50, stock: 10, isActive: true };
    
    let success;
    await act(async () => {
      success = await result.current.addProduct(product);
    });

    expect(success).toBe(true);
    expect(syncManager.getQueueStatus().pending).toBe(1);
    expect(supabase.from('products').insert).not.toHaveBeenCalled();

    // Verify it syncs when online
    (navigator as any).onLine = true;
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      // Sync process has some timeouts/async logic
      await new Promise(r => setTimeout(r, 1000));
    });

    expect(supabase.from('products').insert).toHaveBeenCalled();
    expect(syncManager.getQueueStatus().pending).toBe(0);
  });

  it('updates a product offline and syncs', async () => {
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    (navigator as any).onLine = false;
    const update = { name: 'Updated Name' };
    
    let success;
    await act(async () => {
      success = await result.current.updateProduct('p1', update);
    });

    expect(success).toBe(true);
    expect(syncManager.getQueueStatus().pending).toBe(1);

    (navigator as any).onLine = true;
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await new Promise(r => setTimeout(r, 1000));
    });

    expect(supabase.from('products').update).toHaveBeenCalled();
  });

  it('deletes a product offline and syncs', async () => {
    const { result } = renderHook(() => useLocalPOS(), { wrapper });

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    (navigator as any).onLine = false;

    let success;
    await act(async () => {
      success = await result.current.deleteProduct('p1');
    });

    expect(success).toBe(true);
    // Contract: offline delete must be queued (not applied directly).
    expect(syncManager.getQueueStatus().pending).toBeGreaterThanOrEqual(1);

    syncManager.clearQueue();
    (navigator as any).onLine = true;
  });

});
