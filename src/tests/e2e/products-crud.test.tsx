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

// Mock values must be prefixed with "vi" for hoisting
const vi_TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const vi_TEST_COMPANY_ID = '550e8400-e29b-41d4-a716-446655440002';
const vi_TEST_STORE_ID = '550e8400-e29b-41d4-a716-446655440003';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => {
  const mockInsert = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null })
  }));

  const mockUpdate = vi.fn().mockImplementation(() => ({
    eq: vi.fn().mockResolvedValue({ error: null })
  }));

  const mockDelete = vi.fn().mockImplementation(() => ({
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ count: 1, error: null })
  }));

  const mockFrom = vi.fn().mockImplementation((table: string) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockImplementation(() => {
      // Re-define constants inside or use the prefixed ones
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
    then: vi.fn().mockImplementation((cb) => {
      const storeId = '550e8400-e29b-41d4-a716-446655440003';
      if (table === 'products') {
        const products = (global as any).mockProducts || [];
        return Promise.resolve(cb({ data: products, count: products.length, error: null }));
      }
      if (table === 'categories') return Promise.resolve(cb({ data: [{ id: 'cat1', name: 'Alimentos' }], error: null }));
      if (table === 'stores') return Promise.resolve(cb({ data: [{ id: storeId, name: 'Test Store' }], error: null }));
      if (table === 'profiles') return Promise.resolve(cb({ data: [{ id: '550e8400-e29b-41d4-a716-446655440001', full_name: 'Test User' }], error: null }));
      if (table === 'product_stock') return Promise.resolve(cb({ data: [], error: null }));
      return Promise.resolve(cb({ data: [], error: null }));
    }),
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
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      })),
    },
  };
});

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
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    syncManager.clearQueue();
    syncManager.forceSetProcessing(false);
    (global as any).mockProducts = [];
    
    // Default online
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get() { return this._val ?? true; },
      set(v) { this._val = v; }
    });
    (navigator as any).onLine = true;
  });

  it('creates a product in online mode', async () => {
    render(<AllProviders><LocalProductsPage /></AllProviders>);
    
    const newBtn = await screen.findByText(/Novo Produto/i);
    fireEvent.click(newBtn);
    
    fireEvent.change(await screen.findByPlaceholderText(/Nome do produto/i), { target: { value: 'Produto Teste Online' } });
    fireEvent.change(screen.getByLabelText(/Preço de Compra/i), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText(/Preço de Venda/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Estoque Inicial/i), { target: { value: '10' } });
    
    fireEvent.click(screen.getByText(/Salvar Produto/i));
    
    await waitFor(() => {
      expect(supabase.from('products').insert).toHaveBeenCalled();
    });
  });

  it('queues product creation when offline and syncs when online', async () => {
    (navigator as any).onLine = false;
    render(<AllProviders><LocalProductsPage /></AllProviders>);
    
    const newBtn = await screen.findByText(/Novo Produto/i);
    fireEvent.click(newBtn);
    
    fireEvent.change(await screen.findByPlaceholderText(/Nome do produto/i), { target: { value: 'Produto Teste Offline' } });
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
      expect(supabase.from('products').insert).toHaveBeenCalled();
      expect(syncManager.getQueueStatus().pending).toBe(0);
    }, { timeout: 10000 });
  });

  it('edits a product offline and syncs online', async () => {
    (global as any).mockProducts = [{ 
      id: 'p1', name: 'Existente', code: 'SKU123', sale_price: 100, cost_price: 50, is_active: true, 
      product_stock: [{ quantity: 10, store_id: vi_TEST_STORE_ID }] 
    }];

    (navigator as any).onLine = false;
    render(<AllProviders><LocalProductsPage /></AllProviders>);
    
    const editBtn = await screen.findByRole('button', { name: /pencil/i });
    fireEvent.click(editBtn);
    
    fireEvent.change(await screen.findByPlaceholderText(/Nome do produto/i), { target: { value: 'Existente Editado' } });
    fireEvent.click(screen.getByText(/Salvar Alterações/i));
    
    await screen.findByText(/Alterações salvas localmente/i);
    expect(syncManager.getQueueStatus().pending).toBe(1);
    
    (navigator as any).onLine = true;
    fireEvent(window, new Event('online'));
    
    await waitFor(() => {
      expect(supabase.from('products').update).toHaveBeenCalled();
      expect(syncManager.getQueueStatus().pending).toBe(0);
    });
  });

  it('deletes a product offline and syncs online', async () => {
    (global as any).mockProducts = [{ 
      id: 'p1', name: 'Deletar', code: 'SKU123', sale_price: 100, cost_price: 50, is_active: true, 
      product_stock: [{ quantity: 10, store_id: vi_TEST_STORE_ID }] 
    }];

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
      expect(supabase.from('products').delete).toHaveBeenCalled();
      expect(syncManager.getQueueStatus().pending).toBe(0);
    });
  });

  it('eliminates products with zero stock', async () => {
    (global as any).mockProducts = [
      { id: 'p1', name: 'Com Estoque', sale_price: 100, cost_price: 50, is_active: true, product_stock: [{ quantity: 10 }] },
      { id: 'p2', name: 'Sem Estoque', sale_price: 100, cost_price: 50, is_active: true, product_stock: [{ quantity: 0 }] }
    ];
    
    render(<AllProviders><LocalProductsPage /></AllProviders>);
    
    const delZeroBtn = await screen.findByText(/Eliminar Estoque Zero/i);
    fireEvent.click(delZeroBtn);
    
    await waitFor(() => {
      expect(supabase.from('products').delete).toHaveBeenCalled();
    });
  });
});
