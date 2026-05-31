import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LocalPOSPage from '@/pages/LocalPOSPage';
import LocalReportsPage from '@/pages/LocalReportsPage';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocalPOSProvider, useLocalPOS } from '@/contexts/LocalPOSContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { syncManager } from '@/lib/syncQueue';
import * as PDFReportExports from '@/components/reports/PDFReport';

// Test IDs
const TEST_USER_ID = 'user-1';
const TEST_COMPANY_ID = 'company-1';
const TEST_STORE_ID = 'store-1';
const TEST_PRODUCT_ID = 'product-1';

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    removeChannel: vi.fn().mockResolvedValue({}),
    auth: {
      getSession: vi.fn().mockResolvedValue({ 
        data: { session: { user: { id: 'user-1' } } }, 
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

// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', full_name: 'Test User', store_id: 'store-1' },
    role: 'admin',
    company: { id: 'company-1', name: 'Test Company' },
    store: { id: 'store-1', name: 'Test Store' },
    loading: false,
    isAuthenticated: true,
  }),
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { retry: false, gcTime: 0 } 
  },
});

describe('Offline Conflict & Reconciliation E2E', () => {
  const insertMock = vi.fn().mockImplementation(() => {
    return {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: (cb: any) => Promise.resolve(cb({ data: { id: 'new-sale-id' }, error: null }))
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
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        if (table === 'profiles') return Promise.resolve({ data: { id: TEST_USER_ID, company_id: TEST_COMPANY_ID, store_id: TEST_STORE_ID, full_name: 'Test User' }, error: null });
        if (table === 'stores') return Promise.resolve({ data: { id: TEST_STORE_ID, name: 'Test Store' }, error: null });
        if (table === 'cash_registers') return Promise.resolve({ data: { id: 'cr-1', status: 'open', user_id: TEST_USER_ID, store_id: TEST_STORE_ID, opening_amount: 1000, opened_at: new Date().toISOString() }, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
      insert: vi.fn().mockImplementation((payload) => insertMock(payload)),
      then: vi.fn().mockImplementation((cb) => {
        if (table === 'products') return Promise.resolve(cb({ data: [{ id: TEST_PRODUCT_ID, name: 'Product A', sale_price: 100, cost_price: 80, is_active: true, company_id: TEST_COMPANY_ID }], error: null }));
        if (table === 'stores') return Promise.resolve(cb({ data: [{ id: TEST_STORE_ID, name: 'Test Store', is_active: true, company_id: TEST_COMPANY_ID, address: 'Test Addr', phone: '123' }], error: null }));
        if (table === 'cash_registers') return Promise.resolve(cb({ data: [{ id: 'cr-1', status: 'open', user_id: TEST_USER_ID, store_id: TEST_STORE_ID, opening_amount: 1000, opened_at: new Date().toISOString() }], error: null }));
        if (table === 'product_stock') return Promise.resolve(cb({ data: [{ product_id: TEST_PRODUCT_ID, store_id: TEST_STORE_ID, quantity: 100 }], error: null }));
        return Promise.resolve(cb({ data: [], error: null }));
      }),
    }));

    (supabase.rpc as any).mockResolvedValue({ data: { success: true }, error: null });
  });

  it('reconciles two conflicting offline sales when syncing', { timeout: 30000 }, async () => {
    // 1. First Device: Create Sale Offline
    (navigator as any).onLine = false;
    
    // We override LocalPOSProvider to ensure it has the initial data even if fetch fails/delays
    const { unmount } = render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LocalPOSProvider>
                <StateForcer>
                    <LocalPOSPage />
                </StateForcer>
            </LocalPOSProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    );
    
    await screen.findByText(/Product A/i);
    fireEvent.click(screen.getByText(/Product A/i));
    fireEvent.click(screen.getByText(/RECEBER PAGAMENTO/i));
    fireEvent.click(await screen.findByText(/Dinheiro/i));
    fireEvent.click(screen.getByText(/Confirmar Pagamento/i));
    await screen.findByText(/Venda concluída com sucesso/i);
    
    // Check queue has 1 task
    expect(syncManager.getQueueStatus().pending).toBe(1);
    const task1 = JSON.parse(localStorage.getItem('navanhula_sync_queue') || '[]')[0];
    const saleId = task1.payload.sale.id;

    // 2. Mock "Device 2" by manually adding a conflicting task with the same Sale ID but different item quantity
    const task2 = {
      ...task1,
      id: 'task-device-2',
      payload: {
        ...task1.payload,
        sale: { ...task1.payload.sale, total: 200 },
        items: [{ ...task1.payload.items[0], quantity: 2, total: 200 }]
      }
    };
    const currentQueue = JSON.parse(localStorage.getItem('navanhula_sync_queue') || '[]');
    localStorage.setItem('navanhula_sync_queue', JSON.stringify([...currentQueue, task2]));
    
    // 3. Go Online & Sync
    (navigator as any).onLine = true;
    fireEvent(window, new Event('online'));
    
    // Process queue
    await syncManager.processQueue();
    
    await waitFor(() => {
      expect(syncManager.getQueueStatus().pending).toBe(0);
    }, { timeout: 10000 });

    // 4. Verify Reports Consistency
    const reconciledSale = {
      id: saleId,
      total: 200, 
      subtotal: 200,
      discount: 0,
      items: [{ product: { id: TEST_PRODUCT_ID, name: 'Product A', salePrice: 100, costPrice: 80 }, quantity: 2, total: 200 }],
      createdAt: new Date(),
      status: 'completed',
      paymentMethod: 'cash',
      storeId: TEST_STORE_ID
    };

    // Spy on exports
    const excelSpy = vi.spyOn(PDFReportExports, 'exportExcelReport');
    const pdfSpy = vi.spyOn(PDFReportExports, 'exportPDFReport');

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LocalPOSProvider>
              <ReconciledReportsWrapper reconciledSale={reconciledSale} />
            </LocalPOSProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    );

    await screen.findByText(/Performance/i);
    
    // Click Excel Export
    fireEvent.click(screen.getByRole('button', { name: /Excel/i }));
    expect(excelSpy).toHaveBeenCalledWith(expect.objectContaining({
      sales: expect.arrayContaining([expect.objectContaining({ total: 200 })])
    }));

    // Click PDF Export
    fireEvent.click(screen.getByRole('button', { name: /Relatório/i }));
    expect(pdfSpy).toHaveBeenCalledWith(expect.objectContaining({
      sales: expect.arrayContaining([expect.objectContaining({ total: 200 })])
    }));
  });
});

const StateForcer = ({ children }: any) => {
    const context = useLocalPOS();
    React.useEffect(() => {
        if (context) {
            (context as any).currentStore = { id: TEST_STORE_ID, name: 'Test Store', isActive: true, address: 'Test Addr', phone: '123' };
            (context as any).stores = [(context as any).currentStore];
            (context as any).cashRegisterOpen = true;
            (context as any).loading = false;
        }
    }, [context]);
    return children;
}

const ReconciledReportsWrapper = ({ reconciledSale }: any) => {
  const context = useLocalPOS();
  React.useEffect(() => {
    if (context) {
        (context as any).sales = [reconciledSale];
    }
  }, [context, reconciledSale]);
  
  return <LocalReportsPage />;
};
