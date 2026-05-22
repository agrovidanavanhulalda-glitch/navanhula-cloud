import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LocalPOSPage from '@/pages/LocalPOSPage';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocalPOSProvider } from '@/contexts/LocalPOSContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { syncManager } from '@/lib/syncQueue';

// Test IDs
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_COMPANY_ID = '550e8400-e29b-41d4-a716-446655440002';
const TEST_STORE_ID = '550e8400-e29b-41d4-a716-446655440003';
const TEST_PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440004';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    removeChannel: vi.fn().mockResolvedValue({}),
    auth: {
      getSession: vi.fn().mockResolvedValue({ 
        data: { session: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } } }, 
        error: null 
      }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn().mockResolvedValue({ 
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } }, 
        error: null 
      }),
      signUp: vi.fn().mockResolvedValue({ 
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } }, 
        error: null 
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { 
      retry: false,
      gcTime: 0
    } 
  },
});

const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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

describe('POS Offline & Sync E2E', () => {
  const insertMock = vi.fn().mockImplementation(() => {
    const builder: any = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: (cb: any) => Promise.resolve(cb({ data: [], error: null }))
    };
    return builder;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    syncManager.clearQueue();
    syncManager.forceSetProcessing(false);
    
    // Default online
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get() { return this._val ?? true; },
      set(v) { this._val = v; }
    });
    (navigator as any).onLine = true;

    (supabase.from as any).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        if (table === 'profiles') return Promise.resolve({ data: { id: TEST_USER_ID, company_id: TEST_COMPANY_ID, store_id: TEST_STORE_ID, full_name: 'Test User' }, error: null });
        if (table === 'companies') return Promise.resolve({ data: { id: TEST_COMPANY_ID, name: 'Test Company', country: 'MZ', nif: '123456789' }, error: null });
        if (table === 'user_roles') return Promise.resolve({ data: { role: 'admin' }, error: null });
        if (table === 'stores') return Promise.resolve({ data: { id: TEST_STORE_ID, name: 'Test Store' }, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
      single: vi.fn().mockReturnValue(Promise.resolve({ data: { id: 'new-id' }, error: null })),
      insert: vi.fn().mockImplementation((payload) => {
        return insertMock(payload);
      }),
      update: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => {
        if (table === 'stores') return Promise.resolve(cb({ data: [{ id: TEST_STORE_ID, name: 'Test Store', is_active: true, company_id: TEST_COMPANY_ID }], error: null }));
        if (table === 'products') return Promise.resolve(cb({ data: [{ id: TEST_PRODUCT_ID, name: 'Arroz', sale_price: 100, cost_price: 80, is_active: true, company_id: TEST_COMPANY_ID }], error: null }));
        if (table === 'cash_registers') return Promise.resolve(cb({ data: [{ id: 'cr-1', status: 'open', user_id: TEST_USER_ID, store_id: TEST_STORE_ID, opening_amount: 1000, opened_at: new Date().toISOString() }], error: null }));
        if (table === 'profiles') return Promise.resolve(cb({ data: [{ id: TEST_USER_ID, full_name: 'Test User', store_id: TEST_STORE_ID, company_id: TEST_COMPANY_ID }], error: null }));
        if (table === 'companies') return Promise.resolve(cb({ data: [{ id: TEST_COMPANY_ID, name: 'Test Company', country: 'MZ', nif: '123456789' }], error: null }));
        if (table === 'user_roles') return Promise.resolve(cb({ data: [{ user_id: TEST_USER_ID, role: 'admin' }], error: null }));
        if (table === 'product_stock') return Promise.resolve(cb({ data: [{ product_id: TEST_PRODUCT_ID, store_id: TEST_STORE_ID, quantity: 100 }], error: null }));
        return Promise.resolve(cb({ data: [], error: null }));
      }),
    }));

    (supabase.rpc as any).mockResolvedValue({ data: { success: true }, error: null });
  });

  const selectProduct = async () => {
    // Find item in grid (H3) specifically to avoid cart (H4)
    const items = await screen.findAllByText(/Arroz/i);
    const gridItem = items.find(el => el.tagName === 'H3');
    if (!gridItem) throw new Error('Grid product not found');
    fireEvent.click(gridItem);
  };

  it('queues a sale when offline and syncs when online', { timeout: 40000 }, async () => {
    (navigator as any).onLine = false;
    render(<AllProviders><LocalPOSPage /></AllProviders>);

    await selectProduct();

    const finalizeBtn = screen.getByText(/RECEBER PAGAMENTO/i);
    fireEvent.click(finalizeBtn);

    const cashBtn = await screen.findByText(/Dinheiro/i, {}, { timeout: 10000 });
    fireEvent.click(cashBtn);

    const confirmPaymentBtn = screen.getByText(/Confirmar Pagamento/i);
    fireEvent.click(confirmPaymentBtn);

    // Give it a bit of time to settle
    await new Promise(r => setTimeout(r, 1000));

    await waitFor(() => {
      const status = syncManager.getQueueStatus();
      expect(status.pending).toBe(1);
    }, { timeout: 20000 });

    (navigator as any).onLine = true;
    fireEvent(window, new Event('online'));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
      expect(syncManager.getQueueStatus().pending).toBe(0);
    }, { timeout: 25000 });
  });

  it('keeps sale in queue if sync fails when returning online', { timeout: 45000 }, async () => {
    const networkError = new Error('Database connection failed');
    insertMock.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: (cb: any) => Promise.resolve(cb({ data: null, error: networkError }))
    }));

    (navigator as any).onLine = false;
    render(<AllProviders><LocalPOSPage /></AllProviders>);

    await selectProduct();

    fireEvent.click(screen.getByText(/RECEBER PAGAMENTO/i));
    fireEvent.click(await screen.findByText(/Dinheiro/i));
    fireEvent.click(screen.getByText(/Confirmar Pagamento/i));

    await waitFor(() => expect(syncManager.getQueueStatus().pending).toBe(1), { timeout: 20000 });

    (navigator as any).onLine = true;
    fireEvent(window, new Event('online'));

    // Should stay in queue due to failure
    await new Promise(r => setTimeout(r, 2000));
    expect(syncManager.getQueueStatus().pending).toBe(1);

    // Make successful
    insertMock.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: (cb: any) => Promise.resolve(cb({ data: [], error: null }))
    }));

    await syncManager.processQueue();

    await waitFor(() => {
      expect(syncManager.getQueueStatus().pending).toBe(0);
      expect(insertMock).toHaveBeenCalled();
    }, { timeout: 20000 });
  });

  it('persists cart when going offline in the middle of a sale', { timeout: 45000 }, async () => {
    // 1. Start ONLINE
    (navigator as any).onLine = true;
    render(<AllProviders><LocalPOSPage /></AllProviders>);

    // 2. Select a product online
    await selectProduct();
    
    // Verify it is in cart (H4)
    await screen.findByRole('heading', { name: /Arroz/i, level: 4 });

    // 3. GO OFFLINE in the middle
    (navigator as any).onLine = false;
    fireEvent(window, new Event('offline'));

    // 4. Verify cart still has the item
    await screen.findByRole('heading', { name: /Arroz/i, level: 4 });

    // 5. Finalize while OFFLINE
    fireEvent.click(screen.getByText(/RECEBER PAGAMENTO/i));
    fireEvent.click(await screen.findByText(/Dinheiro/i));
    fireEvent.click(screen.getByText(/Confirmar Pagamento/i));

    // 6. Verify it was added to sync queue
    await waitFor(() => {
      expect(syncManager.getQueueStatus().pending).toBe(1);
    }, { timeout: 20000 });

    // 7. BACK ONLINE
    (navigator as any).onLine = true;
    fireEvent(window, new Event('online'));

    // 8. Verify it eventually syncs
    await waitFor(() => {
      expect(syncManager.getQueueStatus().pending).toBe(0);
      expect(insertMock).toHaveBeenCalled();
    }, { timeout: 25000 });
  });
});
