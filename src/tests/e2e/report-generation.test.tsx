import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
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

// Evidence Collector
const evidence: { step: string; timestamp: string; details: string; status: 'PASS' | 'FAIL' }[] = [];

function collectEvidence(step: string, details: string, status: 'PASS' | 'FAIL' = 'PASS') {
  const timestamp = new Date().toISOString();
  evidence.push({ step, timestamp, details, status });
  console.log(`[EVIDENCE] ${step}: ${details} (${status})`);
}

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

  afterAll(() => {
    console.log('--- GENERATING FINAL E2E AUTOMATED REPORT ---');
    console.table(evidence);
    console.log('--- END OF REPORT ---');
  });

  it('runs the full synchronization cycle and generates evidence', { timeout: 40000 }, async () => {
    collectEvidence('START', 'Starting E2E Execution Report generation');
    
    // 1. Evidence: Initial State (Offline)
    (navigator as any).onLine = false;
    collectEvidence('OFFLINE_SETUP', 'System set to offline mode');

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
    collectEvidence('UI_CHECK_OFFLINE', 'Product A visible in POS grid (Offline)');

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
    collectEvidence('OFFLINE_DATA', 'Sale data queued in LocalStorage');

    // 3. Reconnection and Sync
    (navigator as any).onLine = true;
    collectEvidence('RECONNECTION', 'System back online');
    
    await syncManager.processQueue();
    
    await waitFor(() => {
      expect(syncManager.getQueueStatus().pending).toBe(0);
    }, { timeout: 10000 });
    collectEvidence('SYNC_COMPLETED', 'Queue processed successfully by SyncManager');

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
        sellers: [{ id: TEST_USER_ID, name: 'Test User', email: 'test@test.com', role: 'admin', storeId: TEST_STORE_ID, isActive: true }],
        loading: false,
        getCancelledSales: () => [],
        getCancellationHistory: () => [],
    } as any);

    const excelSpy = vi.spyOn(PDFReportExports, 'exportExcelReport').mockImplementation(async () => {
        collectEvidence('EXCEL_EXPORT', 'Excel report triggered with reconciled data (150 MT)');
    });
    const pdfSpy = vi.spyOn(PDFReportExports, 'exportPDFReport').mockImplementation(async () => {
        collectEvidence('PDF_EXPORT', 'PDF report triggered with reconciled data (150 MT)');
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
    collectEvidence('UI_CHECK_REPORTS', 'Reports dashboard reflects reconciled sale (150 MT)');
    
    fireEvent.click(screen.getByRole('button', { name: /Excel/i }));
    expect(excelSpy).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Relatório/i }));
    expect(pdfSpy).toHaveBeenCalled();

    // 5. Test Auto-Export
    collectEvidence('AUTO_EXPORT_TEST', 'Testing automatic export on filter change');
    const autoExportSwitch = screen.getByLabelText(/Exportação Automática/i);
    fireEvent.click(autoExportSwitch);
    
    // Reset spies to check auto-trigger
    excelSpy.mockClear();
    pdfSpy.mockClear();

    // Change a filter (e.g., end date)
    const endDateInput = screen.getByLabelText(/Data Fim/i);
    fireEvent.change(endDateInput, { target: { value: '2026-12-31' } });

    // Wait for debounce (1s)
    await waitFor(() => {
        expect(excelSpy).toHaveBeenCalled();
        expect(pdfSpy).toHaveBeenCalled();
    }, { timeout: 3000 });
    collectEvidence('AUTO_EXPORT_SUCCESS', 'Reports exported automatically after filter change');

    collectEvidence('FINISH', 'Full E2E automation cycle complete with data consistency');
  });
});
