import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CompanyUsersPage from '@/pages/CompanyUsersPage';
import InviteAcceptPage from '@/pages/InviteAcceptPage';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Mock IDs
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_COMPANY_ID = '550e8400-e29b-41d4-a716-446655440002';
const TEST_BRANCH_ID = '550e8400-e29b-41d4-a716-446655440003';
const TEST_ROLE_ID = '550e8400-e29b-41d4-a716-446655440004';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
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

describe('Auth & User Creation E2E Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockInsert = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn();
    const mockSingle = vi.fn();

    // Default mock implementation for Supabase.from
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
          if (table === 'roles') return Promise.resolve(cb({ data: [{ id: TEST_ROLE_ID, name: 'Admin', key: 'admin' }], error: null }));
          if (table === 'branches') return Promise.resolve(cb({ data: [{ id: TEST_BRANCH_ID, name: 'Main Branch' }], error: null }));
          if (table === 'companies') return Promise.resolve(cb({ data: [{ id: TEST_COMPANY_ID, name: 'Test Co' }], error: null }));
          if (table === 'profiles') return Promise.resolve(cb({ data: { id: TEST_USER_ID, company_id: TEST_COMPANY_ID }, error: null }));
          return Promise.resolve(cb({ data: [], error: null }));
        }),
      };
      
      mockMaybeSingle.mockImplementation(() => {
          if (table === 'profiles') return Promise.resolve({ data: { id: TEST_USER_ID, company_id: TEST_COMPANY_ID }, error: null });
          if (table === 'user_roles') return Promise.resolve({ data: { role: 'admin' }, error: null });
          if (table === 'companies') return Promise.resolve({ data: { id: TEST_COMPANY_ID, name: 'Test Co' }, error: null });
          return Promise.resolve({ data: null, error: null });
      });

      mockSingle.mockImplementation(() => {
        if (table === 'invites') return Promise.resolve({ data: { token: 'mock-token' }, error: null });
        return Promise.resolve({ data: {}, error: null });
      });

      return queryBuilder;
    });

    (supabase.from as any).mockInsert = mockInsert; // Store for easy access

    (supabase.rpc as any).mockImplementation((method: string, params: any) => {
      if (method === 'get_invite_details') {
        return Promise.resolve({ data: [{ 
          invite_id: 'inv-1', 
          company_name: 'Test Co', 
          role_name: 'Admin',
          branch_name: 'Main Branch'
        }], error: null });
      }
      return Promise.resolve({ data: { success: true }, error: null });
    });
  });

  it('Flow: Should create user with correct company_id, branch_id and role(key)', async () => {
    render(<CompanyUsersPage />, { wrapper: Wrapper });

    // Open "Criar Utilizador" dialog
    const createBtn = await screen.findByText(/Criar Utilizador/i);
    fireEvent.click(createBtn);

    // Fill the form
    fireEvent.change(screen.getByPlaceholderText(/João Silva/i), { target: { value: 'Novo User' } });
    fireEvent.change(screen.getByPlaceholderText(/joao@exemplo.com/i), { target: { value: 'novo@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'Password123!' } });

    // Select Role
    const roleSelect = screen.getByText(/Selecione o cargo/i);
    fireEvent.click(roleSelect);
    const adminOption = await screen.findByText(/Admin/i);
    fireEvent.click(adminOption);

    // Select Branch
    const branchSelect = screen.getByText(/Selecione a branch/i);
    fireEvent.click(branchSelect);
    const branchOption = await screen.findByText(/Main Branch/i);
    fireEvent.click(branchOption);

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Criar Utilizador/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
        email: 'novo@test.com',
        options: expect.objectContaining({
          data: expect.objectContaining({
            company_id: TEST_COMPANY_ID,
            branch_id: TEST_BRANCH_ID,
            role: 'admin'
          })
        })
      }));
    });
  });

  it('Flow: Should invite user with correct branch_id and role_id', async () => {
    render(<CompanyUsersPage />, { wrapper: Wrapper });

    // Open "Convidar" dialog
    const inviteBtn = await screen.findByText(/Convidar/i);
    fireEvent.click(inviteBtn);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/email@exemplo.com/i), { target: { value: 'convidado@test.com' } });
    
    // Select Role
    fireEvent.click(screen.getByText(/Selecione o cargo/i));
    fireEvent.click(await screen.findByText(/Admin/i));

    // Select Branch
    fireEvent.click(screen.getByText(/Selecione a branch/i));
    fireEvent.click(await screen.findByText(/Main Branch/i));

    // Generate Invite
    fireEvent.click(screen.getByRole('button', { name: /Gerar Convite/i }));

    await waitFor(() => {
      expect((supabase.from as any).mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        email: 'convidado@test.com',
        company_id: TEST_COMPANY_ID,
        branch_id: TEST_BRANCH_ID,
        role_id: TEST_ROLE_ID
      }));
    }, { timeout: 3000 });
  });

  it('Flow: Should accept invite and sync company/branch/role via secure RPC', async () => {
    // Mock URL with token
    window.history.pushState({}, 'Invite', '/convite/test-token');

    render(
      <Wrapper>
        <Routes>
          <Route path="/convite/:token" element={<InviteAcceptPage />} />
        </Routes>
      </Wrapper>
    );

    // Verify invite details shown
    expect(await screen.findByText(/Test Co/i)).toBeInTheDocument();
    expect(await screen.findByText(/Unidade: Main Branch/i)).toBeInTheDocument();

    // Click Accept
    const acceptBtn = screen.getByRole('button', { name: /Aceitar Convite e Entrar/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('accept_invite_secure', {
        p_token: 'test-token'
      });
    });
  });
});
