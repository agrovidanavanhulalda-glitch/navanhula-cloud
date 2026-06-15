import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CompanyUsersPage from '@/pages/CompanyUsersPage';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Mock IDs
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_COMPANY_ID = '550e8400-e29b-41d4-a716-446655440002';
const TEST_BRANCH_ID = '550e8400-e29b-41d4-a716-446655440003';
const TEST_ROLE_ID_ADMIN = '550e8400-e29b-41d4-a716-446655440004';
const TEST_ROLE_ID_SELLER = '550e8400-e29b-41d4-a716-446655440005';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { email: 'vendedor@test.com', password: 'Password123!' }, error: null }),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } } }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } }, error: null }),
    },
  },
}));

// Mock scrollIntoView for Radix Select
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

describe('Auth Flow E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockInsert = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn();
    const mockSingle = vi.fn();

    (supabase.from as any).mockImplementation((table: string) => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: mockInsert,
        delete: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
        single: mockSingle,
        then: vi.fn().mockImplementation((cb) => {
          if (table === 'roles') return Promise.resolve(cb({ 
            data: [
              { id: TEST_ROLE_ID_ADMIN, name: 'Admin', key: 'admin' },
              { id: TEST_ROLE_ID_SELLER, name: 'Vendedor', key: 'seller' }
            ], 
            error: null 
          }));
          if (table === 'branches') return Promise.resolve(cb({ data: [{ id: TEST_BRANCH_ID, name: 'Sede' }], error: null }));
          if (table === 'companies') return Promise.resolve(cb({ data: [{ id: TEST_COMPANY_ID, name: 'Empresa Teste' }], error: null }));
          if (table === 'profiles') return Promise.resolve(cb({ data: { id: TEST_USER_ID, company_id: TEST_COMPANY_ID, branch_id: TEST_BRANCH_ID }, error: null }));
          if (table === 'company_users') return Promise.resolve(cb({ data: [], error: null }));
          if (table === 'invites') return Promise.resolve(cb({ data: [], error: null }));
          return Promise.resolve(cb({ data: [], error: null }));
        }),
      };
      
      mockMaybeSingle.mockImplementation(() => {
          if (table === 'profiles') return Promise.resolve({ data: { id: TEST_USER_ID, company_id: TEST_COMPANY_ID, branch_id: TEST_BRANCH_ID }, error: null });
          if (table === 'user_roles') return Promise.resolve({ data: { role: 'admin' }, error: null });
          if (table === 'companies') return Promise.resolve({ data: { id: TEST_COMPANY_ID, name: 'Empresa Teste' }, error: null });
          return Promise.resolve({ data: null, error: null });
      });

      mockSingle.mockImplementation(() => {
        if (table === 'invites') return Promise.resolve({ data: { token: 'mock-token' }, error: null });
        return Promise.resolve({ data: {}, error: null });
      });

      return queryBuilder;
    });

    (supabase.from as any).mockInsert = mockInsert;
    
    // Fix for the destructuring error in AuthContext
    (supabase.rpc as any).mockImplementation((method: string) => {
       if (method === 'bootstrap_current_user') return Promise.resolve({ data: { success: true }, error: null });
       return Promise.resolve({ data: null, error: null });
    });
  });

  it('Flow: Should create user via edge function', async () => {
    render(<CompanyUsersPage />, { wrapper: Wrapper });

    // Open creation dialog
    const createBtn = await screen.findByText(/Criar Utilizador/i);
    fireEvent.click(createBtn);

    // Fill the form
    fireEvent.change(screen.getByPlaceholderText(/João Silva/i), { target: { value: 'Novo Vendedor' } });
    fireEvent.change(screen.getByPlaceholderText(/joao@exemplo.com/i), { target: { value: 'vendedor@test.com' } });
    
    // Select Role "Vendedor" (should map to "seller")
    const roleSelect = screen.getByText(/Selecione o cargo/i);
    fireEvent.click(roleSelect);
    const sellerOption = await screen.findByText(/Vendedor/i);
    fireEvent.click(sellerOption);

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Criar Utilizador/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('manage-team-member', expect.objectContaining({
        body: expect.objectContaining({
          email: 'vendedor@test.com',
          role: 'seller'
        })
      }));
    });
  });

  it('Flow: Should create manager without email', async () => {
    render(<CompanyUsersPage />, { wrapper: Wrapper });

    const createBtn = await screen.findByText(/Criar Utilizador/i);
    fireEvent.click(createBtn);

    fireEvent.change(screen.getByPlaceholderText(/João Silva/i), { target: { value: 'Novo Gerente' } });

    const roleSelect = screen.getByText(/Selecione o cargo/i);
    fireEvent.click(roleSelect);
    const adminOption = await screen.findByText(/Admin/i);
    fireEvent.click(adminOption);

    const submitBtn = screen.getByRole('button', { name: /Confirmar e Criar Utilizador|Criar Utilizador/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('manage-team-member', expect.objectContaining({
        body: expect.objectContaining({
          full_name: 'Novo Gerente',
          role: 'admin',
          email: undefined,
        })
      }));
    });
  });

  it('Flow: Should invite user with correct branch_id and role_id', async () => {
    render(<CompanyUsersPage />, { wrapper: Wrapper });

    // Open invite dialog
    const inviteBtn = await screen.findByText(/Convidar/i);
    fireEvent.click(inviteBtn);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/email@exemplo.com/i), { target: { value: 'invite_admin@test.com' } });
    
    // Select Role "Admin" (should map to "admin")
    fireEvent.click(screen.getByText(/Selecione o cargo/i));
    fireEvent.click(await screen.findByText(/Admin/i));

    // Generate Invite
    fireEvent.click(screen.getByRole('button', { name: /Gerar Convite/i }));

    await waitFor(() => {
      expect((supabase.from as any).mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        email: 'invite_admin@test.com',
        role_id: TEST_ROLE_ID_ADMIN
      }));
    });
  });
});
