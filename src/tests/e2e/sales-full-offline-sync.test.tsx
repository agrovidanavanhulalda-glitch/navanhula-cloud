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
const TEST_PRODUCT_ID_1 = '550e8400-e29b-41d4-a716-446655440004';
const TEST_PRODUCT_ID_2 = '550e8400-e29b-41d4-a716-446655440005';

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

describe('Full Sales Offline & Sync E2E', () => {
  const insertMock = vi.fn().mockImplementation((payload) => {
    return Promise.resolve({ data: payload, error: null });
  });

  beforeEach(() => {
    vi.resetAllMocks();
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
        if (table === 'cash_registers') return Promise.resolve({ data: { id: 'cr-1', status: 'open', user_id: TEST_USER_ID, store_id: TEST_STORE_ID, opening_amount: 1000, opened_at: new Date().toISOString() }, error: null });
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
        if (table === 'products') return Promise.resolve(cb({ data: [
          { id: TEST_PRODUCT_ID_1, name: 'Arroz', sale_price: 100, cost_price: 80, is_active: true, company_id: TEST_COMPANY_ID },
          { id: TEST_PRODUCT_ID_2, name: 'Feijão', sale_price: 50, cost_price: 30, is_active: true, company_id: TEST_COMPANY_ID }
        ], error: null }));
        if (table === 'cash_registers') return Promise.resolve(cb({ data: [{ id: 'cr-1', status: 'open', user_id: TEST_USER_ID, store_id: TEST_STORE_ID, opening_amount: 1000, opened_at: new Date().toISOString() }], error: null }));
        if (table === 'profiles') return Promise.resolve(cb({ data: [{ id: TEST_USER_ID, full_name: 'Test User', store_id: TEST_STORE_ID, company_id: TEST_COMPANY_ID }], error: null }));
        if (table === 'companies') return Promise.resolve(cb({ data: [{ id: TEST_COMPANY_ID, name: 'Test Company', country: 'MZ', nif: '123456789' }], error: null }));
        if (table === 'user_roles') return Promise.resolve(cb({ data: [{ user_id: TEST_USER_ID, role: 'admin' }], error: null }));
        if (table === 'product_stock') return Promise.resolve(cb({ data: [
          { product_id: TEST_PRODUCT_ID_1, store_id: TEST_STORE_ID, quantity: 100 },
          { product_id: TEST_PRODUCT_ID_2, store_id: TEST_STORE_ID, quantity: 50 }
        ], error: null }));
        return Promise.resolve(cb({ data: [], error: null }));
      }),
    }));

    (supabase.rpc as any).mockResolvedValue({ data: { success: true }, error: null });
    
    (supabase.auth.getSession as any).mockResolvedValue({ 
      data: { session: { user: { id: TEST_USER_ID } } }, 
      error: null 
    });
  });

  const selectProduct = async (name: string) => {
    const items = await screen.findAllByText(new RegExp(name, 'i'));
    const gridItem = items.find(el => el.tagName === 'H3');
    if (!gridItem) throw new Error(`Grid product ${name} not found`);
    fireEvent.click(gridItem);
  };

  it('performs full offline sales flow with discounts and syncs correctly', { timeout: 60000 }, async () => {
    // 1. Go Offline
    (navigator as any).onLine = false;
    
    render(<AllProviders><LocalPOSPage /></AllProviders>);
    
    // 2. Add products to cart
    await screen.findByText(/Arroz/i);
    await selectProduct('Arroz');
    await selectProduct('Feijão');
    
    // Verify items in cart
    await screen.findByText(/Itens da Venda/i);
    expect(screen.getAllByText(/Arroz/i).length).toBeGreaterThan(1);
    expect(screen.getAllByText(/Feijão/i).length).toBeGreaterThan(1);
    
    // 3. Apply discount to Arroz
    const arrozDiscountInput = screen.getByLabelText(/Desconto para Arroz/i);
    fireEvent.change(arrozDiscountInput, { target: { value: '10' } });
    
    // Verify Total (100 + 50 - 10 = 140)
    await waitFor(() => {
      expect(screen.getByText(/140,00 MT/i)).toBeTruthy();
    });
    
    // 4. Finalize sale offline
    fireEvent.click(screen.getByText(/RECEBER PAGAMENTO/i));
    
    // In PaymentModal
    fireEvent.click(await screen.findByText(/Dinheiro/i));
    
    // Set amount received (140)
    const amountInput = screen.getByLabelText(/Valor Entregue/i);
    fireEvent.change(amountInput, { target: { value: '150' } });
    
    // Verify change (150 - 140 = 10)
    const changeDisplay = screen.getByText(/Troco a Devolver:/i).parentElement;
    expect(changeDisplay?.textContent).toContain('10,00 MT');
    
    fireEvent.click(screen.getByText(/Confirmar Pagamento/i));
    
    // 5. Verify offline success
    await waitFor(() => {
      expect(screen.getByText(/Venda concluída/i)).toBeTruthy();
    }, { timeout: 10000 });
    
    // Check queue
    expect(syncManager.getQueueStatus().pending).toBe(1);
    
    // 6. Restore Internet
    (navigator as any).onLine = true;
    fireEvent(window, new Event('online'));
    
    // 7. Verify Sync
    await waitFor(() => {
      // Sales and Sale Items should have been inserted
      expect(insertMock).toHaveBeenCalled();
      expect(syncManager.getQueueStatus().pending).toBe(0);
    }, { timeout: 30000 });
    
    // Verify payload of sync (should include discount)
    const lastCallPayload = insertMock.mock.calls.find(call => call[0].total === 140);
    expect(lastCallPayload).toBeTruthy();
    expect(lastCallPayload[0].discount_amount).toBe(10);
  });
});