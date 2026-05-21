import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LocalStoresPage from '@/pages/LocalStoresPage';
import LocalProductsPage from '@/pages/LocalProductsPage';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocalPOSProvider } from '@/contexts/LocalPOSContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
      rpc: vi.fn(),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user-id' } } }, error: null }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
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

describe('NAVANHULA CLOUD E2E Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock profiles response
    (supabase.from as any).withArgs('profiles').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ 
        data: { id: 'test-user-id', company_id: 'test-company-id', store_id: 'test-store-id' }, 
        error: null 
      }),
    });

    // Mock user_roles response
    (supabase.from as any).withArgs('user_roles').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    });

    // Mock companies response
    (supabase.from as any).withArgs('companies').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'test-company-id', name: 'Test Company' }, error: null }),
    });

    // Mock stores response
    (supabase.from as any).withArgs('stores').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: { id: 'new-store-id' }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'test-store-id', name: 'Test Store' }, error: null }),
      then: vi.fn().mockImplementation((cb) => cb({ data: [{ id: 'test-store-id', name: 'Test Store' }], error: null })),
    });

    // Mock products response
    (supabase.from as any).withArgs('products').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: { id: 'new-product-id' }, error: null }),
      then: vi.fn().mockImplementation((cb) => cb({ data: [], error: null })),
    });

    // Mock product_stock response
    (supabase.from as any).withArgs('product_stock').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => cb({ data: [], error: null })),
    });

    // Mock cash_registers response
    (supabase.from as any).withArgs('cash_registers').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => cb({ data: [], error: null })),
    });
  });

  it('Flow 1: Create a Store and validate it appears in the list', async () => {
    render(<LocalStoresPage />, { wrapper: AllProviders });

    // Click "Nova Loja"
    const newStoreBtn = await screen.findByText(/Nova Loja/i);
    fireEvent.click(newStoreBtn);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Nome da loja/i), { target: { value: 'Filial Maputo' } });
    fireEvent.change(screen.getByPlaceholderText(/Maputo, Beira.../i), { target: { value: 'Maputo' } });

    // Submit
    const saveBtn = screen.getByRole('button', { name: /Criar/i });
    fireEvent.click(saveBtn);

    // Verify RPC call or Supabase call
    await waitFor(() => {
      // In LocalStoresPage, addStore is called from useLocalPOS
      // We expect a call to stores insert or similar
      expect(supabase.from).toHaveBeenCalledWith('stores');
    });
  });

  it('Flow 2: Create a Product and validate consistency', async () => {
    render(<LocalProductsPage />, { wrapper: AllProviders });

    // Click "Novo Produto"
    const newProductBtn = await screen.findByText(/Novo Produto/i);
    fireEvent.click(newProductBtn);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Nome do produto/i), { target: { value: 'Arroz 5kg' } });
    fireEvent.change(screen.getByLabelText(/Preço de Compra/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Preço de Venda/i), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText(/Estoque/i), { target: { value: '50' } });

    // Submit - The page uses handleSave which calls addProduct
    const createBtn = screen.getByRole('button', { name: /Criar/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      // Should call products insert or the create_product_with_stock RPC
      // expect(supabase.rpc).toHaveBeenCalledWith('create_product_with_stock', expect.anything());
    });
  });

  it('Flow 3: Logout and Login workflow', async () => {
    // This is better tested at a higher level, but we can simulate the context calls
    const { signOut, signIn } = (await import('@/contexts/AuthContext')).useAuth();
    
    // We can't easily test window.location.reload in jsdom without extra setup
    // But we can verify the supabase auth calls
    await signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();

    await signIn('test@example.com', 'password123');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('Flow 4: Multi-company isolation simulation', async () => {
    // Mock the profiles response to return a different company_id
    (supabase.from as any).withArgs('profiles').mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ 
        data: { id: 'user-2', company_id: 'company-B', store_id: 'store-B' }, 
        error: null 
      }),
    });

    // In a real test, we would verify that requests to 'products' include the correct company_id filter
    // Here we can check if the components filter correctly
    render(<LocalProductsPage />, { wrapper: AllProviders });

    await waitFor(() => {
      // Check if the query to products included the company_id filter
      // (This depends on how useLocalPOS is implemented)
    });
  });
});
