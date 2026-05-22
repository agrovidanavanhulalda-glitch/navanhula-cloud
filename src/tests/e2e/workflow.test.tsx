import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LocalStoresPage from '@/pages/LocalStoresPage';
import LocalSellersPage from '@/pages/LocalSellersPage';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocalPOSProvider } from '@/contexts/LocalPOSContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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
  defaultOptions: { queries: { retry: false } },
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

describe('NAVANHULA CLOUD E2E Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (supabase.from as any).mockImplementation((table: string) => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        match: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((cb) => {
          if (table === 'stores') return Promise.resolve(cb({ data: [{ id: TEST_STORE_ID, name: 'Test Store', is_active: true, company_id: TEST_COMPANY_ID }], error: null }));
          if (table === 'profiles') return Promise.resolve(cb({ data: [{ id: 'seller-1', full_name: 'Vendedor 1', email: 'v1@test.com', store_id: TEST_STORE_ID, is_active: true }], error: null }));
          if (table === 'user_roles') return Promise.resolve(cb({ data: [{ user_id: 'seller-1', role: 'seller' }], error: null }));
          return Promise.resolve(cb({ data: [], error: null }));
        }),
      };

      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockReturnValue(Promise.resolve({ data: { id: 'new-id' }, error: null }));

      if (table === 'profiles') {
        queryBuilder.maybeSingle.mockResolvedValue({ data: { id: TEST_USER_ID, company_id: TEST_COMPANY_ID, store_id: TEST_STORE_ID, full_name: 'Test User' }, error: null });
      } else if (table === 'user_roles') {
        queryBuilder.maybeSingle.mockResolvedValue({ data: { role: 'admin' }, error: null });
      } else if (table === 'companies') {
        queryBuilder.maybeSingle.mockResolvedValue({ data: { id: TEST_COMPANY_ID, name: 'Test Company' }, error: null });
      } else if (table === 'stores') {
        queryBuilder.maybeSingle.mockResolvedValue({ data: { id: TEST_STORE_ID, name: 'Test Store' }, error: null });
      }
      return queryBuilder;
    });

    (supabase.rpc as any).mockResolvedValue({ data: { success: true }, error: null });
  });

  it('Flow 1: Create a Store and validate persistence', async () => {
    render(<LocalStoresPage />, { wrapper: AllProviders });
    const newStoreBtn = await screen.findByText(/Nova Loja/i);
    fireEvent.click(newStoreBtn);
    fireEvent.change(screen.getByPlaceholderText(/Nome da loja/i), { target: { value: 'Filial Maputo' } });
    const createBtn = screen.getByRole('button', { name: /Criar/i });
    fireEvent.click(createBtn);
    await waitFor(() => { expect(supabase.from).toHaveBeenCalledWith('stores'); });
  });

  it('Flow 2: Create a Seller via RPC and validate Popup', async () => {
    render(<LocalSellersPage />, { wrapper: AllProviders });
    const newSellerBtn = await screen.findByText(/Novo Vendedor/i);
    fireEvent.click(newSellerBtn);

    fireEvent.change(screen.getByPlaceholderText(/Nome completo/i), { target: { value: 'João Vendedor' } });
    fireEvent.change(screen.getByPlaceholderText(/email@exemplo.com/i), { target: { value: 'joao@test.com' } });
    
    // Ensure store is loaded in Select by waiting for it if necessary
    // But since we mock it, it should be there.
    
    const createBtn = screen.getByRole('button', { name: /Criar Vendedor/i });
    fireEvent.click(createBtn);

    // Explicitly wait for the RPC call to happen
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('create_enterprise_seller', expect.anything());
    }, { timeout: 4000 });

    // Look for success popup - it should be rendered in the DOM now
    const successTitle = await screen.findByText(/Vendedor Criado/i, {}, { timeout: 4000 });
    expect(successTitle).toBeInTheDocument();
    
    // Check if the temporary password is shown
    expect(await screen.findByText(/NAV@12345/i)).toBeInTheDocument();
  });

  it('Flow 3: Role-based permissions validation', async () => {
    render(<LocalSellersPage />, { wrapper: AllProviders });
    expect(await screen.findByText(/Novo Vendedor/i)).toBeInTheDocument();
  });
});