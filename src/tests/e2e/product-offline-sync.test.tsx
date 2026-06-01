import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LocalProductsPage from '@/pages/LocalProductsPage';
import LocalInventoryPage from '@/pages/LocalInventoryPage';
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
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
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

describe('Product & Stock Offline Sync E2E', () => {
  const insertMock = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: TEST_PRODUCT_ID }, error: null }),
    then: vi.fn().mockImplementation((cb) => Promise.resolve(cb({ data: { id: TEST_PRODUCT_ID }, error: null })))
  }));

  const updateMock = vi.fn().mockImplementation(() => ({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockImplementation((cb) => Promise.resolve(cb({ data: null, error: null })))
  }));

  beforeEach(() => {
    vi.resetAllMocks();
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

    // Explicitly mock getSession and ensure it returns expected structure
    (supabase.auth.getSession as any).mockResolvedValue({ 
      data: { session: { user: { id: TEST_USER_ID, user_metadata: { company_id: TEST_COMPANY_ID } } } }, 
      error: null 
    });
    
    // Add onAuthStateChange mock to avoid destructuring error
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    });

    (supabase.from as any).mockImplementation((table: string) => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => {
          if (table === 'profiles') return Promise.resolve({ data: { id: TEST_USER_ID, company_id: TEST_COMPANY_ID, store_id: TEST_STORE_ID, is_active: true, is_super_admin: true }, error: null });
          if (table === 'user_roles') return Promise.resolve({ data: { role: 'admin' }, error: null });
          if (table === 'stores') return Promise.resolve({ data: { id: TEST_STORE_ID, name: 'Test Store' }, error: null });
          if (table === 'categories') return Promise.resolve({ data: [], error: null });
          return Promise.resolve({ data: null, error: null });
        }),
        insert: insertMock,
        update: updateMock,
        then: vi.fn().mockImplementation((cb) => {
          if (table === 'products') return Promise.resolve(cb({ 
            data: [{ id: TEST_PRODUCT_ID, name: 'Produto Teste', sale_price: 100, cost_price: 80, is_active: true, company_id: TEST_COMPANY_ID, product_stock: [{ quantity: 50, store_id: TEST_STORE_ID }] }], 
            count: 1,
            error: null 
          }));
          if (table === 'stores') return Promise.resolve(cb({ data: [{ id: TEST_STORE_ID, name: 'Test Store', is_active: true }], error: null }));
          if (table === 'product_stock') return Promise.resolve(cb({ data: [{ product_id: TEST_PRODUCT_ID, quantity: 50, store_id: TEST_STORE_ID }], error: null }));
          if (table === 'categories') return Promise.resolve(cb({ data: [], error: null }));
          if (table === 'inventory_movements') return Promise.resolve(cb({ data: [], error: null }));
          return Promise.resolve(cb({ data: [], error: null }));
        }),
      };
      return builder;
    });

    (supabase.rpc as any).mockResolvedValue({ data: { success: true, new_stock: 60 }, error: null });
  });

  it('queues product creation when offline and syncs when online', async () => {
    (navigator as any).onLine = false;
    render(<AllProviders><LocalProductsPage /></AllProviders>);
    
    // Open new product dialog
    const newBtn = await screen.findByText(/Novo Produto/i);
    fireEvent.click(newBtn);
    
    // Fill form
    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'Novo Offline' } });
    fireEvent.change(screen.getByLabelText(/Preço de Venda/i), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText(/Preço de Custo/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Estoque Inicial/i), { target: { value: '10' } });
    
    fireEvent.click(screen.getByText(/Salvar Produto/i));
    
    await waitFor(() => {
      expect(syncManager.getTasksByType('PRODUCT_UPDATE').length).toBe(1);
    });
    
    (navigator as any).onLine = true;
    fireEvent(window, new Event('online'));
    
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
      expect(syncManager.getQueueStatus().pending).toBe(0);
    }, { timeout: 5000 });
  });

  it('queues stock adjustment when offline and syncs when online', async () => {
    (navigator as any).onLine = false;
    render(<AllProviders><LocalInventoryPage /></AllProviders>);
    
    const adjustBtn = await screen.findByText(/Ajustar/i);
    fireEvent.click(adjustBtn);
    
    fireEvent.change(screen.getByPlaceholderText(/0/i), { target: { value: '10' } });
    
    fireEvent.click(screen.getByText(/Confirmar Ajuste/i));
    
    await waitFor(() => {
      expect(syncManager.getTasksByType('STOCK_ADJUSTMENT').length).toBe(1);
    });
    
    (navigator as any).onLine = true;
    fireEvent(window, new Event('online'));
    
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('add_inventory_adjustment', expect.anything());
      expect(syncManager.getQueueStatus().pending).toBe(0);
    }, { timeout: 5000 });
  });

  it('queues soft delete when offline and syncs when online', async () => {
    (navigator as any).onLine = false;
    render(<AllProviders><LocalProductsPage /></AllProviders>);
    
    const deleteBtn = await screen.findByRole('button', { name: /trash/i });
    fireEvent.click(deleteBtn);
    
    await waitFor(() => {
      expect(syncManager.getTasksByType('PRODUCT_UPDATE').some(t => t.payload.action === 'DELETE')).toBe(true);
    });
    
    (navigator as any).onLine = true;
    fireEvent(window, new Event('online'));
    
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
      expect(syncManager.getQueueStatus().pending).toBe(0);
    }, { timeout: 5000 });
  });
});
