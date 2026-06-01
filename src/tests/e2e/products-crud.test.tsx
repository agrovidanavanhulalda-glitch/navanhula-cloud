import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LocalProductsPage from '@/pages/LocalProductsPage';
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
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } }, 
        error: null 
      }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
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

describe('Products CRUD E2E (Online & Offline)', () => {
  const insertMock = vi.fn().mockImplementation(() => {
    return {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'new-product-id' }, error: null })
    };
  });

  const updateMock = vi.fn().mockImplementation(() => {
    return {
      eq: vi.fn().mockResolvedValue({ error: null })
    };
  });

  const deleteMock = vi.fn().mockImplementation(() => {
    return {
      eq: vi.fn().mockResolvedValue({ error: null })
    };
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
        if (table === 'profiles') return Promise.resolve({ data: { id: TEST_USER_ID, company_id: TEST_COMPANY_ID, store_id: TEST_STORE_ID, full_name: 'Test User', is_super_admin: true }, error: null });
        if (table === 'companies') return Promise.resolve({ data: { id: TEST_COMPANY_ID, name: 'Test Company' }, error: null });
        if (table === 'user_roles') return Promise.resolve({ data: { role: 'admin' }, error: null });
        if (table === 'stores') return Promise.resolve({ data: { id: TEST_STORE_ID, name: 'Test Store' }, error: null });
        if (table === 'onboarding_progress') return Promise.resolve({ data: { user_id: TEST_USER_ID, step: 'completed' }, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
      insert: insertMock,
      update: updateMock,
      delete: deleteMock,
      upsert: vi.fn().mockResolvedValue({ error: null }),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => {
        if (table === 'products') return Promise.resolve(cb({ data: [], count: 0, error: null }));
        if (table === 'categories') return Promise.resolve(cb({ data: [], error: null }));
        if (table === 'stores') return Promise.resolve(cb({ data: [{ id: TEST_STORE_ID, name: 'Test Store' }], error: null }));
        if (table === 'profiles') return Promise.resolve(cb({ data: [{ id: TEST_USER_ID, full_name: 'Test User' }], error: null }));
        return Promise.resolve(cb({ data: [], error: null }));
      }),
    }));

    (supabase.rpc as any).mockResolvedValue({ data: { success: true }, error: null });
    
    (supabase.auth.getSession as any).mockResolvedValue({ 
      data: { session: { user: { id: TEST_USER_ID } } }, 
      error: null 
    });
    (supabase.auth.getUser as any).mockResolvedValue({ 
      data: { user: { id: TEST_USER_ID } }, 
      error: null 
    });
  });

  it('creates a product in online mode', async () => {
    render(<AllProviders><LocalProductsPage /></AllProviders>);
    
    const newBtn = await screen.findByText(/Novo Produto/i);
    fireEvent.click(newBtn);
    
    fireEvent.change(screen.getByPlaceholderText(/Nome do produto/i), { target: { value: 'Produto Teste Online' } });
    fireEvent.change(screen.getByLabelText(/Preço de Compra/i), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText(/Preço de Venda/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Estoque Inicial/i), { target: { value: '10' } });
    
    fireEvent.click(screen.getByText(/Salvar Produto/i));
    
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
      expect(screen.queryByText(/Produto adicionado com sucesso/i)).toBeInTheDocument();
    });
  });

  it('queues product creation when offline and syncs when online', async () => {
    (navigator as any).onLine = false;
    render(<AllProviders><LocalProductsPage /></AllProviders>);
    
    const newBtn = await screen.findByText(/Novo Produto/i);
    fireEvent.click(newBtn);
    
    fireEvent.change(screen.getByPlaceholderText(/Nome do produto/i), { target: { value: 'Produto Teste Offline' } });
    fireEvent.change(screen.getByLabelText(/Preço de Compra/i), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText(/Preço de Venda/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Estoque Inicial/i), { target: { value: '10' } });
    
    fireEvent.click(screen.getByText(/Salvar Produto/i));
    
    await screen.findByText(/Produto salvo localmente/i);
    expect(syncManager.getQueueStatus().pending).toBe(1);
    
    // Simulate back online
    (navigator as any).onLine = true;
    fireEvent(window, new Event('online'));
    
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
      expect(syncManager.getQueueStatus().pending).toBe(0);
    }, { timeout: 10000 });
  });

  it('edits a product offline and syncs online', async () => {
    // Mock existing product
    (supabase.from as any).mockImplementation((table: string) => ({
      ...((supabase.from as any).mock.results[0]?.value || {}),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => {
        if (table === 'products') return Promise.resolve(cb({ 
          data: [{ 
            id: 'p1', name: 'Existente', cost_price: 50, sale_price: 100, is_active: true, 
            product_stock: [{ quantity: 10, store_id: TEST_STORE_ID }] 
          }], 
          count: 1, 
          error: null 
        }));
        if (table === 'stores') return Promise.resolve(cb({ data: [{ id: TEST_STORE_ID, name: 'Test Store' }], error: null }));
        if (table === 'profiles') return Promise.resolve(cb({ data: [{ id: TEST_USER_ID, full_name: 'Test User' }], error: null }));
        return Promise.resolve(cb({ data: [], error: null }));
      }),
      maybeSingle: vi.fn().mockImplementation(() => {
        if (table === 'profiles') return Promise.resolve({ data: { id: TEST_USER_ID, company_id: TEST_COMPANY_ID, store_id: TEST_STORE_ID, full_name: 'Test User', is_super_admin: true }, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
      update: updateMock,
    }));

    (navigator as any).onLine = false;
    render(<AllProviders><LocalProductsPage /></AllProviders>);
    
    const editBtn = await screen.findByRole('button', { name: /pencil/i });
    fireEvent.click(editBtn);
    
    fireEvent.change(screen.getByPlaceholderText(/Nome do produto/i), { target: { value: 'Existente Editado' } });
    fireEvent.click(screen.getByText(/Salvar Alterações/i));
    
    await screen.findByText(/Alterações salvas localmente/i);
    expect(syncManager.getQueueStatus().pending).toBe(1);
    
    (navigator as any).onLine = true;
    fireEvent(window, new Event('online'));
    
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
      expect(syncManager.getQueueStatus().pending).toBe(0);
    });
  });

  it('deletes a product offline and syncs online', async () => {
     // Mock existing product
     (supabase.from as any).mockImplementation((table: string) => ({
      ...((supabase.from as any).mock.results[0]?.value || {}),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => {
        if (table === 'products') return Promise.resolve(cb({ 
          data: [{ 
            id: 'p1', name: 'Deletar', cost_price: 50, sale_price: 100, is_active: true, 
            product_stock: [{ quantity: 10, store_id: TEST_STORE_ID }] 
          }], 
          count: 1, 
          error: null 
        }));
        if (table === 'stores') return Promise.resolve(cb({ data: [{ id: TEST_STORE_ID, name: 'Test Store' }], error: null }));
        if (table === 'profiles') return Promise.resolve(cb({ data: [{ id: TEST_USER_ID, full_name: 'Test User' }], error: null }));
        return Promise.resolve(cb({ data: [], error: null }));
      }),
      maybeSingle: vi.fn().mockImplementation(() => {
        if (table === 'profiles') return Promise.resolve({ data: { id: TEST_USER_ID, company_id: TEST_COMPANY_ID, store_id: TEST_STORE_ID, full_name: 'Test User', is_super_admin: true }, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
      delete: deleteMock,
    }));

    (navigator as any).onLine = false;
    render(<AllProviders><LocalProductsPage /></AllProviders>);
    
    const delBtn = await screen.findByRole('button', { name: /trash/i });
    fireEvent.click(delBtn);
    
    // Confirm delete in dialog
    fireEvent.click(screen.getByText(/Eliminar/i));
    
    await screen.findByText(/Produto será eliminado quando estiver online/i);
    expect(syncManager.getQueueStatus().pending).toBe(1);
    
    (navigator as any).onLine = true;
    fireEvent(window, new Event('online'));
    
    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalled();
      expect(syncManager.getQueueStatus().pending).toBe(0);
    });
  });
});
