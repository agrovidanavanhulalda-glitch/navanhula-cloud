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
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } } }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } }, error: null }),
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
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Default online
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
      writable: true
    });

    (supabase.from as any).mockImplementation((table: string) => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        match: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((cb) => {
          if (table === 'stores') return Promise.resolve(cb({ data: [{ id: TEST_STORE_ID, name: 'Test Store', is_active: true, company_id: TEST_COMPANY_ID }], error: null }));
          if (table === 'products') return Promise.resolve(cb({ data: [{ id: TEST_PRODUCT_ID, name: 'Arroz', sale_price: 100, cost_price: 80, is_active: true, company_id: TEST_COMPANY_ID }], error: null }));
          if (table === 'cash_registers') return Promise.resolve(cb({ data: [{ id: 'cr-1', status: 'open', user_id: TEST_USER_ID, store_id: TEST_STORE_ID, opening_amount: 1000, opened_at: new Date().toISOString() }], error: null }));
          if (table === 'profiles') return Promise.resolve(cb({ data: [{ id: TEST_USER_ID, full_name: 'Test User', store_id: TEST_STORE_ID, company_id: TEST_COMPANY_ID }], error: null }));
          if (table === 'companies') return Promise.resolve(cb({ data: [{ id: TEST_COMPANY_ID, name: 'Test Company', country: 'MZ', nif: '123456789' }], error: null }));
          if (table === 'user_roles') return Promise.resolve(cb({ data: [{ user_id: TEST_USER_ID, role: 'admin' }], error: null }));
          return Promise.resolve(cb({ data: [], error: null }));
        }),
      };

      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.maybeSingle.mockImplementation(() => {
        if (table === 'profiles') return Promise.resolve({ data: { id: TEST_USER_ID, company_id: TEST_COMPANY_ID, store_id: TEST_STORE_ID, full_name: 'Test User' }, error: null });
        if (table === 'companies') return Promise.resolve({ data: { id: TEST_COMPANY_ID, name: 'Test Company', country: 'MZ', nif: '123456789' }, error: null });
        if (table === 'user_roles') return Promise.resolve({ data: { role: 'admin' }, error: null });
        if (table === 'stores') return Promise.resolve({ data: { id: TEST_STORE_ID, name: 'Test Store' }, error: null });
        return Promise.resolve({ data: null, error: null });
      });
      queryBuilder.single.mockReturnValue(Promise.resolve({ data: { id: 'new-id' }, error: null }));
      
      return queryBuilder;
    });

    (supabase.rpc as any).mockResolvedValue({ data: { success: true }, error: null });
  });

  it('completes an online sale successfully', async () => {
    render(<LocalPOSPage />, { wrapper: AllProviders });

    // Wait for data load and Arroz to appear
    const productItem = await screen.findByText(/Arroz/i, {}, { timeout: 5000 });
    fireEvent.click(productItem);

    // Verify item added to cart (should see subtotal or similar)
    const cartItem = await screen.findByText(/Arroz/i, { selector: '.font-bold' });
    expect(cartItem).toBeInTheDocument();

    // Click on finalize sale button (RECEBER PAGAMENTO)
    const finalizeBtn = screen.getByText(/RECEBER PAGAMENTO/i);
    fireEvent.click(finalizeBtn);

    // In PaymentModal, select Cash and confirm
    const cashBtn = await screen.findByText(/Dinheiro/i, {}, { timeout: 5000 });
    fireEvent.click(cashBtn);

    const confirmPaymentBtn = screen.getByText(/Confirmar Pagamento/i);
    fireEvent.click(confirmPaymentBtn);

    // Verify Supabase was called
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('sales');
      expect(supabase.from).toHaveBeenCalledWith('sale_items');
    }, { timeout: 5000 });
  });

  it('queues a sale when offline and syncs when online', async () => {
    // Set offline
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    render(<LocalPOSPage />, { wrapper: AllProviders });

    // Add product
    const productItem = await screen.findByText(/Arroz/i, {}, { timeout: 5000 });
    fireEvent.click(productItem);

    // Finalize
    const finalizeBtn = await screen.findByText(/RECEBER PAGAMENTO/i);
    fireEvent.click(finalizeBtn);

    const cashBtn = await screen.findByText(/Dinheiro/i, { timeout: 5000 });
    fireEvent.click(cashBtn);

    const confirmPaymentBtn = screen.getByText(/Confirmar Pagamento/i);
    fireEvent.click(confirmPaymentBtn);

    // Verify it was NOT sent to Supabase but added to queue
    await waitFor(() => {
      expect(supabase.from).not.toHaveBeenCalledWith('sales');
      const savedQueue = JSON.parse(localStorage.getItem('navanhula_sync_queue') || '[]');
      expect(savedQueue.length).toBeGreaterThan(0);
      expect(savedQueue.some((t: any) => t.type === 'SALE')).toBe(true);
    });

    // Mock going online
    Object.defineProperty(navigator, 'onLine', { value: true });
    
    // Trigger online event
    fireEvent(window, new Event('online'));

    // Verify Supabase was eventually called after going online
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('sales');
      expect(supabase.from).toHaveBeenCalledWith('sale_items');
    }, { timeout: 15000 }); 

    // Verify queue is empty (or at least the SALE task is gone)
    await waitFor(() => {
      const finalQueue = JSON.parse(localStorage.getItem('navanhula_sync_queue') || '[]');
      expect(finalQueue.length).toBe(0);
    });
  });
});
