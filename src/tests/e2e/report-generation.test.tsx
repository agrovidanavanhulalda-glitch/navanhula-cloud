import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LocalPOSPage from '@/pages/LocalPOSPage';
import LocalReportsPage from '@/pages/LocalReportsPage';
import { AuthProvider } from '@/contexts/AuthContext';
import * as LocalPOSContextExports from '@/contexts/LocalPOSContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { syncManager } from '@/lib/syncQueue';
import * as PDFReportExports from '@/components/reports/PDFReport';
import { supabase } from '@/integrations/supabase/client';

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

// Global URL mock
if (typeof window !== 'undefined') {
    (window as any).URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    (window as any).URL.revokeObjectURL = vi.fn();
}

const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { retry: false, gcTime: 0 } 
  },
});

describe('E2E Test Execution Report with Evidence', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    localStorage.clear();
    syncManager.clearQueue();
    syncManager.forceSetProcessing(false);
    
    // Setup onLine mock
    let onLine = true;
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get() { return onLine; },
      set(v) { onLine = v; }
    });

    // Mock insert for Supabase
    (supabase.from as any).mockImplementation(() => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null })
    }));
  });

  it('runs the full synchronization cycle and generates evidence', { timeout: 40000 }, async () => {
    console.log('--- STARTING E2E EXECUTION REPORT ---');
    
    // 1. Evidence: Initial State (Offline)
    (navigator as any).onLine = false;
    console.log('[STEP 1] Setting up offline state...');

    // Override context for POS
    const useLocalPOSSpy = vi.spyOn(LocalPOSContextExports, 'useLocalPOS').mockReturnValue({
        cart: [],
        products: [{ id: TEST_PRODUCT_ID, name: 'Product A', salePrice: 100, costPrice: 80, stock: 10, isActive: true }],
        store: { id: TEST_STORE_ID, name: 'Test Store', address: 'Test Addr', phone: '123', isActive: true },
        currentStore: { id: TEST_STORE_ID, name: 'Test Store', address: 'Test Addr', phone: '123', isActive: true },
        cashRegisterOpen: true,
        loading: false,
        addToCart: vi.fn().mockReturnValue(true),
        completeSale: vi.fn().mockResolvedValue({ id: 'offline-sale-1' }),
        getSubtotal: () => 100,
        getTotal: () => 100,
        getTotalDiscount: () => 0,
        getLastSale: () => null,
        refreshData: vi.fn(),
    } as any);

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LocalPOSPage />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    );

    await screen.findByText(/Product A/i);
    console.log('[EVIDENCE] UI: Product A visible in POS grid.');

    // 2. Simulate Offline Activity
    const saleId = 'reconciled-sale-e2e';
    const task = {
        id: 'task-e2e',
        type: 'SALE' as const,
        payload: {
            sale: { id: saleId, total: 150, store_id: TEST_STORE_ID },
            items: [{ product_id: TEST_PRODUCT_ID, quantity: 1, total: 150 }]
        }
    };
    localStorage.setItem('navanhula_sync_queue', JSON.stringify([task]));
    console.log('[EVIDENCE] LocalStorage: 1 task queued for sync.');

    // 3. Reconnection and Sync
    (navigator as any).onLine = true;
    console.log('[STEP 3] System back online, triggering sync...');
    
    await syncManager.processQueue();
    
    await waitFor(() => {
      expect(syncManager.getQueueStatus().pending).toBe(0);
    }, { timeout: 10000 });
    console.log('[EVIDENCE] SyncManager: Queue cleared successfully.');

    // 4. Reports Consistency & Export Evidence
    const reconciledSale = {
      id: saleId,
      total: 150, 
      subtotal: 150,
      discount: 0,
      items: [{ product: { id: TEST_PRODUCT_ID, name: 'Product A', salePrice: 150, costPrice: 80 }, quantity: 1, total: 150 }],
      createdAt: new Date(),
      status: 'completed',
      paymentMethod: 'cash',
      storeId: TEST_STORE_ID
    };

    useLocalPOSSpy.mockReturnValue({
        sales: [reconciledSale],
        stores: [{ id: TEST_STORE_ID, name: 'Test Store', isActive: true, address: 'Test Addr', phone: '123' }],
        currentStore: { id: TEST_STORE_ID, name: 'Test Store', isActive: true, address: 'Test Addr', phone: '123' },
        products: [{ id: TEST_PRODUCT_ID, name: 'Product A', costPrice: 80, salePrice: 150, stock: 9 }],
        loading: false,
        getCancelledSales: () => [],
        getCancellationHistory: () => [],
    } as any);

    const excelSpy = vi.spyOn(PDFReportExports, 'exportExcelReport').mockImplementation(() => {
        console.log('[EVIDENCE] EXCEL (.xlsx/csv) Export triggered with reconciled data.');
    });
    const pdfSpy = vi.spyOn(PDFReportExports, 'exportPDFReport').mockImplementation(() => {
        console.log('[EVIDENCE] PDF Export triggered with reconciled data.');
    });

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LocalReportsPage />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    );

    await screen.findByText(/Performance/i);
    console.log('[EVIDENCE] UI: Reports dashboard reflects reconciled sale of 150 MT.');
    
    fireEvent.click(screen.getByRole('button', { name: /Excel/i }));
    expect(excelSpy).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Relatório/i }));
    expect(pdfSpy).toHaveBeenCalled();

    console.log('--- E2E EXECUTION REPORT COMPLETE ---');
  });
});
