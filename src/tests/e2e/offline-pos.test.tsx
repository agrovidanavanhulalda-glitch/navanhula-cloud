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
    
    // Use dynamic navigator.onLine mock
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

  it('completes an online sale successfully', { timeout: 25000 }, async () => {
    render(<AllProviders><LocalPOSPage /></AllProviders>);

    // Wait for data load and Arroz to appear
    const productItem = await screen.findByText(/Arroz/i, {}, { timeout: 15000 });
    fireEvent.click(productItem);

    // Verify item added to cart (check for name instead of MT symbol to be safer)
    await screen.findByText(/Arroz/i);

    // Finalize
    const finalizeBtn = screen.getByText(/RECEBER PAGAMENTO/i);
    fireEvent.click(finalizeBtn);

    const cashBtn = await screen.findByText(/Dinheiro/i, {}, { timeout: 10000 });
    fireEvent.click(cashBtn);

    const confirmPaymentBtn = screen.getByText(/Confirmar Pagamento/i);
    fireEvent.click(confirmPaymentBtn);

    // Verify Supabase was called
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
    }, { timeout: 15000 });
  });

  it('queues a sale when offline and syncs when online', { timeout: 40000 }, async () => {
    // 1. CLEAR QUEUE and RESET
    syncManager.clearQueue();
    syncManager.forceSetProcessing(false);
    insertMock.mockClear();

    // 2. Start OFFLINE
    (navigator as any).onLine = false;
    
    render(<AllProviders><LocalPOSPage /></AllProviders>);

    // Wait for Arroz
    const productItem = await screen.findByText(/Arroz/i, {}, { timeout: 15000 });
    fireEvent.click(productItem);

    // Finalize
    const finalizeBtn = screen.getByText(/RECEBER PAGAMENTO/i);
    fireEvent.click(finalizeBtn);

    const cashBtn = await screen.findByText(/Dinheiro/i, {}, { timeout: 10000 });
    fireEvent.click(cashBtn);

    const confirmPaymentBtn = screen.getByText(/Confirmar Pagamento/i);
    fireEvent.click(confirmPaymentBtn);

    // 3. Verify it was added to queue
    await waitFor(() => {
      const status = syncManager.getQueueStatus();
      expect(status.pending).toBe(1);
    }, { timeout: 15000 });

    expect(insertMock).not.toHaveBeenCalled();

    // 4. GO ONLINE
    (navigator as any).onLine = true;
    fireEvent(window, new Event('online'));

    // 5. Verify Supabase was eventually called
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
    }, { timeout: 20000 }); 

    // 6. Verify queue is eventually empty
    await waitFor(() => {
      expect(syncManager.getQueueStatus().pending).toBe(0);
    }, { timeout: 15000 });
  });

  it('keeps sale in queue if sync fails when returning online', { timeout: 40000 }, async () => {
    // 1. RESET
    syncManager.clearQueue();
    syncManager.forceSetProcessing(false);
    insertMock.mockClear();

    // 2. Mock Supabase to FAIL once
    const networkError = new Error('Database connection failed');
    insertMock.mockImplementationOnce(() => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: (cb: any) => Promise.resolve(cb({ data: null, error: networkError }))
      };
      return builder;
    });

    // 3. Start OFFLINE
    (navigator as any).onLine = false;
    
    render(<AllProviders><LocalPOSPage /></AllProviders>);

    // Add item and finalize
    const productItem = await screen.findByText(/Arroz/i, {}, { timeout: 15000 });
    fireEvent.click(productItem);

    const finalizeBtn = screen.getByText(/RECEBER PAGAMENTO/i);
    fireEvent.click(finalizeBtn);

    const cashBtn = await screen.findByText(/Dinheiro/i, {}, { timeout: 10000 });
    fireEvent.click(cashBtn);

    const confirmPaymentBtn = screen.getByText(/Confirmar Pagamento/i);
    fireEvent.click(confirmPaymentBtn);

    // 4. Verify in queue
    await waitFor(() => {
      expect(syncManager.getQueueStatus().pending).toBe(1);
    }, { timeout: 15000 });

    // 5. GO ONLINE (but sync will fail once)
    (navigator as any).onLine = true;
    fireEvent(window, new Event('online'));

    // 6. Verify it remains in queue after failure (sync manager handles the error and keeps item)
    await waitFor(() => {
      expect(syncManager.getQueueStatus().pending).toBe(1);
    }, { timeout: 15000 });

    // 7. Now make it SUCCESSFUL
    insertMock.mockImplementation(() => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: (cb: any) => Promise.resolve(cb({ data: [], error: null }))
      };
      return builder;
    });

    // 8. Trigger sync again
    await syncManager.processQueue();

    // 9. Verify queue is eventually empty
    await waitFor(() => {
      expect(syncManager.getQueueStatus().pending).toBe(0);
      expect(insertMock).toHaveBeenCalled();
    }, { timeout: 15000 });
  });
});
