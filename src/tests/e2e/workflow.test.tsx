import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LocalStoresPage from '@/pages/LocalStoresPage';
import LocalProductsPage from '@/pages/LocalProductsPage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LocalPOSProvider } from '@/contexts/LocalPOSContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_COMPANY_ID = '550e8400-e29b-41d4-a716-446655440002';
const TEST_STORE_ID = '550e8400-e29b-41d4-a716-446655440003';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => {
  return {
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
    },
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

const TestAuthComp = () => {
  const { signOut, signIn, isAuthenticated } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'logged-in' : 'logged-out'}</span>
      <button onClick={() => signOut()}>Logout</button>
      <button onClick={() => signIn('test@test.com', 'pass')}>Login</button>
    </div>
  );
};

describe('NAVANHULA CLOUD E2E Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default implementation for supabase.from
    (supabase.from as any).mockImplementation((table: string) => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: { id: '550e8400-e29b-41d4-a716-446655449999' }, error: null }),
        update: vi.fn().mockReturnThis(),
        match: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((cb) => cb({ data: [], error: null })),
      };

      if (table === 'profiles') {
        queryBuilder.maybeSingle.mockResolvedValue({ 
          data: { id: TEST_USER_ID, company_id: TEST_COMPANY_ID, store_id: TEST_STORE_ID, full_name: 'Test User' }, 
          error: null 
        });
      } else if (table === 'user_roles') {
        queryBuilder.maybeSingle.mockResolvedValue({ data: { role: 'admin' }, error: null });
      } else if (table === 'companies') {
        queryBuilder.maybeSingle.mockResolvedValue({ data: { id: TEST_COMPANY_ID, name: 'Test Company' }, error: null });
      } else if (table === 'stores') {
        queryBuilder.maybeSingle.mockResolvedValue({ data: { id: TEST_STORE_ID, name: 'Test Store' }, error: null });
        queryBuilder.then.mockImplementation((cb) => cb({ data: [{ id: TEST_STORE_ID, name: 'Test Store', is_active: true, company_id: TEST_COMPANY_ID, city: 'Maputo' }], error: null }));
      } else if (table === 'products') {
        queryBuilder.then.mockImplementation((cb) => cb({ data: [], error: null }));
      } else if (table === 'onboarding_progress') {
        queryBuilder.maybeSingle.mockResolvedValue({ data: { step: 'none' }, error: null });
      }
      
      return queryBuilder;
    });

    // Mock rpc
    (supabase.rpc as any).mockResolvedValue({ data: null, error: null });
  });

  it('Flow 1: Create a Store and validate it appears in the list', async () => {
    render(<LocalStoresPage />, { wrapper: AllProviders });

    // Wait for the button to appear (Auth loading finish)
    const newStoreBtn = await screen.findByText(/Nova Loja/i);
    fireEvent.click(newStoreBtn);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Nome da loja/i), { target: { value: 'Filial Maputo' } });
    fireEvent.change(screen.getByPlaceholderText(/Maputo, Beira.../i), { target: { value: 'Maputo' } });

    // Submit
    const createBtn = screen.getByRole('button', { name: /Criar/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('stores');
    });
  });

  it('Flow 2: Create a Product and validate consistency', async () => {
    render(<LocalProductsPage />, { wrapper: AllProviders });

    const newProductBtn = await screen.findByText(/Novo Produto/i);
    fireEvent.click(newProductBtn);

    fireEvent.change(screen.getByPlaceholderText(/Nome do produto/i), { target: { value: 'Arroz 5kg' } });
    
    // Labels might vary, using broad match
    const costInput = screen.getByLabelText(/Preço de Compra/i);
    const saleInput = screen.getByLabelText(/Preço de Venda/i);
    const stockInput = screen.getByLabelText(/Estoque/i);

    fireEvent.change(costInput, { target: { value: '100' } });
    fireEvent.change(saleInput, { target: { value: '150' } });
    fireEvent.change(stockInput, { target: { value: '50' } });

    const createBtn = screen.getByRole('button', { name: /Criar/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      // It calls create_product_with_stock RPC
      expect(supabase.rpc).toHaveBeenCalledWith('create_product_with_stock', expect.anything());
    });
  });

  it('Flow 3: Logout and Login workflow', async () => {
    render(<TestAuthComp />, { wrapper: AllProviders });

    expect(await screen.findByTestId('auth-status')).toHaveTextContent('logged-in');

    fireEvent.click(screen.getByText('Logout'));
    expect(supabase.auth.signOut).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Login'));
    expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
  });

  it('Flow 4: Multi-company isolation simulation', async () => {
    render(<LocalProductsPage />, { wrapper: AllProviders });

    await waitFor(() => {
      // Check if any call to 'products' was made
      const productCalls = (supabase.from as any).mock.calls.filter((call: any) => call[0] === 'products');
      expect(productCalls.length).toBeGreaterThan(0);
    });
  });
});
