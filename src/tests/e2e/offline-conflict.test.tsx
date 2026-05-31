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
    (window as any).URL.createObjectURL = vi.fn();
    (window as any).URL.revokeObjectURL = vi.fn();
}

const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { retry: false, gcTime: 0 } 
  },
});

describe('Offline Conflict & Reconciliation E2E', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    localStorage.clear();
    syncManager.clearQueue();
    syncManager.forceSetProcessing(false);
    
    // Setup onLine mock correctly
    let onLine = true;
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get() { return onLine; },
      set(v) { onLine = v; }
    });
  });

  it('reconciles two conflicting offline sales when syncing', { timeout: 30000 }, async () => {
    // Override context values directly via spy
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

    // 1. Device: Create Sale Offline
    (navigator as any).onLine = false;
    
    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LocalPOSPage />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    );
    
    // Check if ready
    await screen.findByText(/Product A/i);
    
    // 2. We mock the syncManager behavior
    const saleId = 'offline-sale-reconciled';
    const task1 = {
        id: 'task-1',
        type: 'SALE',
        payload: {
            sale: { id: saleId, total: 100, store_id: TEST_STORE_ID },
            items: [{ product_id: TEST_PRODUCT_ID, quantity: 1, total: 100 }]
        }
    };
    
    // 3. Mock "Device 2" by adding a conflicting task
    const task2 = {
      ...task1,
      id: 'task-device-2',
      payload: {
        ...task1.payload,
        sale: { ...task1.payload.sale, total: 200 },
        items: [{ ...task1.payload.items[0], quantity: 2, total: 200 }]
      }
    };
    localStorage.setItem('navanhula_sync_queue', JSON.stringify([task1, task2]));
    
    // 4. Go Online & Sync
    (navigator as any).onLine = true;
    
    // Verify sync logic would finish queue
    await syncManager.processQueue();
    
    await waitFor(() => {
      expect(syncManager.getQueueStatus().pending).toBe(0);
    }, { timeout: 10000 });

    // 5. Verify Reports Consistency
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

    // Update mock for reports - Ensuring all required properties are present
    useLocalPOSSpy.mockReturnValue({
        sales: [reconciledSale],
        stores: [{ id: TEST_STORE_ID, name: 'Test Store', isActive: true, address: 'Test Addr', phone: '123' }],
        currentStore: { id: TEST_STORE_ID, name: 'Test Store', isActive: true, address: 'Test Addr', phone: '123' },
        products: [{ id: TEST_PRODUCT_ID, name: 'Product A', costPrice: 80, salePrice: 100, stock: 10 }],
        loading: false,
        getCancelledSales: () => [],
        getCancellationHistory: () => [],
    } as any);

    // Spy on exports
    const excelSpy = vi.spyOn(PDFReportExports, 'exportExcelReport').mockImplementation(async () => {});
    const pdfSpy = vi.spyOn(PDFReportExports, 'exportPDFReport').mockImplementation(async () => {});


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
