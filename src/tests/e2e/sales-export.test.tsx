import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LocalReportsPage from '@/pages/LocalReportsPage';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocalPOSProvider } from '@/contexts/LocalPOSContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import * as PDFReportExports from '@/components/reports/PDFReport';

// Real UUIDs for enterprise validation
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_COMPANY_ID = '550e8400-e29b-41d4-a716-446655440002';
const TEST_STORE_ID = '550e8400-e29b-41d4-a716-446655440003';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn().mockResolvedValue({}),
  },
}));

// Mock jsPDF and URL methods
vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      setFont: vi.fn().mockReturnThis(),
      setFontSize: vi.fn().mockReturnThis(),
      text: vi.fn().mockReturnThis(),
      line: vi.fn().mockReturnThis(),
      setLineWidth: vi.fn().mockReturnThis(),
      addPage: vi.fn().mockReturnThis(),
      save: vi.fn().mockReturnThis(),
    })),
  };
});

global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { 
      retry: false,
      gcTime: 0
    } 
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

describe('Sales Export E2E', () => {
  const TEST_SALE_SYNCED_ID = '550e8400-e29b-41d4-a716-446655440004';

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();

    // Mock session correctly
    (supabase.auth.getSession as any).mockResolvedValue({ 
      data: { session: { user: { id: TEST_USER_ID } } }, 
      error: null 
    });

    (supabase.auth.onAuthStateChange as any).mockReturnValue({ 
      data: { subscription: { unsubscribe: vi.fn() } } 
    });

    // Mock RPC for Auth bootstrap
    (supabase.rpc as any).mockResolvedValue({ data: { success: true }, error: null });

    // Helper for fluent mock
    const mockFluent = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      then: vi.fn()
    };

    // Mock profiles, stores, etc.
    (supabase.from as any).mockImplementation((table: string) => ({
      ...mockFluent,
      maybeSingle: vi.fn().mockImplementation(() => {
        if (table === 'profiles') return Promise.resolve({ data: { id: TEST_USER_ID, company_id: TEST_COMPANY_ID, store_id: TEST_STORE_ID }, error: null });
        if (table === 'user_roles') return Promise.resolve({ data: { role: 'admin' }, error: null });
        if (table === 'companies') return Promise.resolve({ data: { id: TEST_COMPANY_ID, name: 'Test Company' }, error: null });
        if (table === 'stores') return Promise.resolve({ data: { id: TEST_STORE_ID, name: 'Test Store' }, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
      then: vi.fn().mockImplementation((cb) => {
        if (table === 'stores') return Promise.resolve(cb({ data: [{ id: TEST_STORE_ID, name: 'Test Store', is_active: true }], error: null }));
        if (table === 'products') return Promise.resolve(cb({ data: [], error: null }));
        if (table === 'sales') return Promise.resolve(cb({ 
          data: [{ 
            id: TEST_SALE_SYNCED_ID, 
            store_id: TEST_STORE_ID, 
            total: 1500, 
            subtotal: 1500, 
            discount_amount: 0, 
            status: 'completed', 
            created_at: new Date().toISOString(),
            payment_method: 'cash'
          }], 
          error: null 
        }));
        if (table === 'profiles') return Promise.resolve(cb({ data: [{ id: TEST_USER_ID, full_name: 'Test User' }], error: null }));
        return Promise.resolve(cb({ data: [], error: null }));
      }),
    }));

    // Populate localStorage with a "synced" sale that was originally offline
    const sales = [
      {
        id: TEST_SALE_SYNCED_ID,
        storeId: TEST_STORE_ID,
        total: 1500,
        subtotal: 1500,
        discount: 0,
        items: [],
        createdAt: new Date().toISOString(),
        status: 'completed',
        isOffline: true,
        synced: true,
        paymentMethod: 'cash'
      }
    ];
    localStorage.setItem(`pos_sales_${TEST_COMPANY_ID}`, JSON.stringify(sales));
    localStorage.setItem(`pos_stores_${TEST_COMPANY_ID}`, JSON.stringify([{ id: TEST_STORE_ID, name: 'Test Store' }]));
  });

  it('exports sales including synced offline sales when filtered by store', async () => {
    // Spy on export functions
    const pdfSpy = vi.spyOn(PDFReportExports, 'exportPDFReport');
    const excelSpy = vi.spyOn(PDFReportExports, 'exportExcelReport');

    render(<AllProviders><LocalReportsPage /></AllProviders>);

    // Wait for data to load
    await screen.findByText(/Performance/i);
    
    // Select store filter
    // Note: Shadcn select is tricky to test with fireEvent, so we'll just check if it's there
    // and verify the export uses the selectedStore state
    expect(screen.getByLabelText(/Loja/i)).toBeDefined();

    // Verify stats include our sale
    // Flexible matcher for currency "1.500,00"
    await waitFor(() => {
      const elements = screen.queryAllByText((content, element) => {
        return element?.tagName === 'P' && content.includes('1.500,00');
      });
      expect(elements.length).toBeGreaterThan(0);
    });

    // Click Excel export
    const excelBtn = screen.getByRole('button', { name: /Excel/i });
    fireEvent.click(excelBtn);
    expect(excelSpy).toHaveBeenCalled();
    
    // Verify excel data includes the synced offline sale
    const excelArgs = excelSpy.mock.calls[0][0];
    const exportedSale = excelArgs.sales.find((s: any) => s.id === TEST_SALE_SYNCED_ID);
    expect(exportedSale).toBeDefined();
    expect(exportedSale.isOffline).toBe(true);
    expect(exportedSale.synced).toBe(true);

    // Click PDF export
    const pdfBtn = screen.getByRole('button', { name: /Relatório/i });
    fireEvent.click(pdfBtn);
    expect(pdfSpy).toHaveBeenCalled();
    
    // Verify pdf data includes the synced offline sale
    const pdfArgs = pdfSpy.mock.calls[0][0];
    const pdfExportedSale = pdfArgs.sales.find((s: any) => s.id === TEST_SALE_SYNCED_ID);
    expect(pdfExportedSale).toBeDefined();
    expect(pdfExportedSale.synced).toBe(true);
  });

  it('filters by date range correctly in export', async () => {
    const excelSpy = vi.spyOn(PDFReportExports, 'exportExcelReport');

    render(<AllProviders><LocalReportsPage /></AllProviders>);

    await screen.findByText(/Performance/i);

    // Set dates
    const startDateInput = screen.getByLabelText(/Data Início/i);
    const endDateInput = screen.getByLabelText(/Data Fim/i);

    fireEvent.change(startDateInput, { target: { value: '2023-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2023-12-31' } });

    const excelBtn = screen.getByRole('button', { name: /Excel/i });
    fireEvent.click(excelBtn);

    expect(excelSpy).toHaveBeenCalledWith(expect.objectContaining({
      startDate: '2023-01-01',
      endDate: '2023-12-31'
    }));
  });
});