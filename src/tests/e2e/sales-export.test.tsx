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

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ 
        data: { session: { user: { id: 'test-user-id' } } }, 
        error: null 
      }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
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
  const TEST_STORE_ID = 'store-1';
  const TEST_SALE_OFFLINE_ID = 'sale-offline-1';
  const TEST_SALE_SYNCED_ID = 'sale-synced-1';

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();

    // Mock session
    (supabase.auth.getSession as any).mockResolvedValue({ 
      data: { session: { user: { id: 'test-user-id' } } }, 
      error: null 
    });

    (supabase.auth.onAuthStateChange as any).mockReturnValue({ 
      data: { subscription: { unsubscribe: vi.fn() } } 
    });

    // Mock profiles, stores, etc.
    (supabase.from as any).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        if (table === 'profiles') return Promise.resolve({ data: { id: 'test-user-id', company_id: 'company-1', store_id: TEST_STORE_ID }, error: null });
        if (table === 'user_roles') return Promise.resolve({ data: { role: 'admin' }, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
      then: vi.fn().mockImplementation((cb) => {
        if (table === 'stores') return Promise.resolve(cb({ data: [{ id: TEST_STORE_ID, name: 'Test Store', is_active: true }], error: null }));
        if (table === 'products') return Promise.resolve(cb({ data: [], error: null }));
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
    localStorage.setItem('pos_sales_company-1', JSON.stringify(sales));
    localStorage.setItem('pos_stores_company-1', JSON.stringify([{ id: TEST_STORE_ID, name: 'Test Store' }]));
  });

  it('exports sales including synced offline sales when filtered by store', async () => {
    // Spy on export functions
    const pdfSpy = vi.spyOn(PDFReportExports, 'exportPDFReport');
    const excelSpy = vi.spyOn(PDFReportExports, 'exportExcelReport');

    render(<AllProviders><LocalReportsPage /></AllProviders>);

    // Wait for data to load
    await screen.findByText(/Performance/i);
    
    // Select store filter
    const storeSelect = screen.getByLabelText(/Loja/i);
    fireEvent.change(storeSelect, { target: { value: TEST_STORE_ID } });

    // Verify stats include our sale
    const revenueElements = await screen.findAllByText(/1.500,00/);
    expect(revenueElements.length).toBeGreaterThan(0);

    // Click Excel export
    const excelBtn = screen.getByRole('button', { name: /Excel/i });
    fireEvent.click(excelBtn);
    expect(excelSpy).toHaveBeenCalled();
    
    // Verify excel data includes the synced offline sale
    const excelArgs = excelSpy.mock.calls[0][0];
    const exportedSale = excelArgs.sales.find((s: any) => s.id === TEST_SALE_SYNCED_ID);
    expect(exportedSale).toBeDefined();

    // Click PDF export
    const pdfBtn = screen.getByRole('button', { name: /Relatório/i });
    fireEvent.click(pdfBtn);
    expect(pdfSpy).toHaveBeenCalled();
    
    // Verify pdf data includes the synced offline sale
    const pdfArgs = pdfSpy.mock.calls[0][0];
    const pdfExportedSale = pdfArgs.sales.find((s: any) => s.id === TEST_SALE_SYNCED_ID);
    expect(pdfExportedSale).toBeDefined();
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