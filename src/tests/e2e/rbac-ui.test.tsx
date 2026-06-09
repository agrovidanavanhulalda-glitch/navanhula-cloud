import { describe, it, expect } from 'vitest';
import { canAccessRoute, getDefaultRouteForRole } from '@/lib/roleRoutes';
import type { AppRole } from '@/types/pos';

describe('RBAC Routing and Logic Tests', () => {
  describe('canAccessRoute logic', () => {
    it('Seller: should be restricted from admin/manager routes', () => {
      const sellerRole: AppRole = 'seller';
      
      // Allowed
      expect(canAccessRoute('/app/pdv', sellerRole)).toBe(true);
      expect(canAccessRoute('/app/vendas', sellerRole)).toBe(true);
      
      // Restricted (requires manager/admin)
      expect(canAccessRoute('/app/configuracoes', sellerRole)).toBe(false);
      expect(canAccessRoute('/app/lojas', sellerRole)).toBe(false);
      expect(canAccessRoute('/app/compliance', sellerRole)).toBe(false);
      expect(canAccessRoute('/app/bi', sellerRole)).toBe(false);
    });

    it('Manager: should access inventory and settings, but restricted from CEO/Compliance', () => {
      const managerRole: AppRole = 'manager';
      
      // Allowed
      expect(canAccessRoute('/app/estoque', managerRole)).toBe(true);
      expect(canAccessRoute('/app/configuracoes', managerRole)).toBe(true);
      expect(canAccessRoute('/app/dashboard/gestor', managerRole)).toBe(true);
      
      // Restricted
      expect(canAccessRoute('/app/ceo', managerRole)).toBe(false);
      expect(canAccessRoute('/app/compliance', managerRole)).toBe(false);
      expect(canAccessRoute('/app/auditoria', managerRole)).toBe(false);
    });

    it('Admin/CEO: should have access to everything', () => {
      const adminRole: AppRole = 'admin';
      const ceoRole: AppRole = 'ceo';
      
      const allRoutes = [
        '/app/pdv',
        '/app/configuracoes',
        '/app/ceo',
        '/app/compliance',
        '/app/auditoria',
        '/app/bi'
      ];
      
      allRoutes.forEach(route => {
        expect(canAccessRoute(route, adminRole)).toBe(true);
        expect(canAccessRoute(route, ceoRole)).toBe(true);
      });
    });
  });

  describe('getDefaultRouteForRole logic', () => {
    it('should return correct landing page for each role', () => {
      expect(getDefaultRouteForRole('seller')).toBe('/app/pdv');
      expect(getDefaultRouteForRole('manager')).toBe('/app/dashboard/gestor');
      expect(getDefaultRouteForRole('admin')).toBe('/app/dashboard');
      expect(getDefaultRouteForRole('ceo')).toBe('/app/ceo');
    });
  });
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
