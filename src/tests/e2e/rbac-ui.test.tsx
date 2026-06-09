import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock Supabase COMPLETELY before importing any context or component
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

import Sidebar from '@/components/layout/Sidebar';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '@/contexts/i18n';
import { supabase } from '@/integrations/supabase/client';

// Mock useSidebar for Shadcn Sidebar
vi.mock('@/components/ui/sidebar', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    useSidebar: () => ({
      state: 'expanded',
      isMobile: false,
    }),
  };
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

describe('Role-Based Access Control (RBAC) UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (supabase.from as any).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        if (table === 'profiles') return Promise.resolve({ data: { id: 'test-user', full_name: 'Test User' }, error: null });
        if (table === 'user_roles') return Promise.resolve({ data: { role: 'seller' }, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
    }));
  });

  it('Seller: should see Sales and POS, but NOT see HR or Settings (admin levels)', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'seller-id', email: 'seller@test.com' } } },
      error: null
    });

    (supabase.from as any).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        if (table === 'profiles') return Promise.resolve({ data: { id: 'seller-id' }, error: null });
        if (table === 'user_roles') return Promise.resolve({ data: { role: 'seller' }, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
    }));

    render(<Sidebar forceExpanded={true} />, { wrapper: Wrapper });

    await waitFor(() => {
      // Sellers should see POS/Sales
      expect(screen.getByText(/Vendas/i)).toBeInTheDocument();
    });

    // Sellers should NOT see HR or Settings (based on Sidebar.tsx logic)
    // Sidebar.tsx has minRole: 'manager' or 'admin' for those
    expect(screen.queryByText(/Recursos Humanos/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Configurações/i)).not.toBeInTheDocument();
  });

  it('Manager: should see Reports and HR, but NOT see restricted Admin settings', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'manager-id', email: 'manager@test.com' } } },
      error: null
    });

    (supabase.from as any).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        if (table === 'profiles') return Promise.resolve({ data: { id: 'manager-id' }, error: null });
        if (table === 'user_roles') return Promise.resolve({ data: { role: 'manager' }, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
    }));

    render(<Sidebar forceExpanded={true} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Relatórios/i)).toBeInTheDocument();
      expect(screen.getByText(/Recursos Humanos/i)).toBeInTheDocument();
    });
    
    // Manager sees "Configurações" group but some items inside are admin-only
    expect(screen.getByText(/Configurações/i)).toBeInTheDocument();
    
    // "Minha Equipa" is admin-only in Sidebar.tsx
    expect(screen.queryByText(/Minha Equipa/i)).not.toBeInTheDocument();
  });

  it('Admin: should see everything including Team Management and System Settings', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'admin-id', email: 'admin@test.com' } } },
      error: null
    });

    (supabase.from as any).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        if (table === 'profiles') return Promise.resolve({ data: { id: 'admin-id' }, error: null });
        if (table === 'user_roles') return Promise.resolve({ data: { role: 'admin' }, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
    }));

    render(<Sidebar forceExpanded={true} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Minha Equipa/i)).toBeInTheDocument();
      expect(screen.getByText(/Níveis de Acesso/i)).toBeInTheDocument();
      expect(screen.getByText(/Configurações/i)).toBeInTheDocument();
    });
  });
});
