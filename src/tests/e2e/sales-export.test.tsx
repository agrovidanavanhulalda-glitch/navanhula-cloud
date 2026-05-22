import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LocalReportsPage from '@/pages/LocalReportsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import * as PDFReportExports from '@/components/reports/PDFReport';
import * as LocalPOSContextExports from '@/contexts/LocalPOSContext';

// Mock jsPDF and URL methods
const mockDoc = {
  setFont: vi.fn().mockReturnThis(),
  setFontSize: vi.fn().mockReturnThis(),
  text: vi.fn().mockReturnThis(),
  line: vi.fn().mockReturnThis(),
  setLineWidth: vi.fn().mockReturnThis(),
  addPage: vi.fn().mockReturnThis(),
  save: vi.fn().mockReturnThis(),
};

vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(() => mockDoc),
    jsPDF: vi.fn().mockImplementation(() => mockDoc)
  };
});

global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', full_name: 'Test User' },
    role: 'admin',
    company: { id: 'company-1', name: 'Test Company' },
    store: { id: 'store-1', name: 'Test Store' },
    loading: false,
    isAuthenticated: true,
  }),
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

const queryClient = new QueryClient();

describe('Sales Export E2E', () => {
  const TEST_STORE_ID = 'store-1';
  const TEST_SALE_SYNCED_ID = 'sale-synced-1';

  const mockSales = [
    {
      id: TEST_SALE_SYNCED_ID,
      storeId: TEST_STORE_ID,
      total: 1500,
      subtotal: 1500,
      discount: 0,
      items: [],
      createdAt: new Date(),
      status: 'completed' as const,
      isOffline: true,
      synced: true,
      paymentMethod: 'cash'
    }
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    
    vi.spyOn(LocalPOSContextExports, 'useLocalPOS').mockReturnValue({
      sales: mockSales,
      stores: [{ id: TEST_STORE_ID, name: 'Test Store', isActive: true, address: '', phone: '' }],
      currentStore: { id: TEST_STORE_ID, name: 'Test Store', isActive: true, address: '', phone: '' },
      products: [],
      loading: false,
      getCancelledSales: vi.fn().mockReturnValue([]),
      getCancellationHistory: vi.fn().mockReturnValue([]),
      refreshData: vi.fn(),
    } as any);
  });

  it('exports sales including synced offline sales when filtered by store', async () => {
    const pdfSpy = vi.spyOn(PDFReportExports, 'exportPDFReport');
    const excelSpy = vi.spyOn(PDFReportExports, 'exportExcelReport');

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <LocalReportsPage />
        </QueryClientProvider>
      </BrowserRouter>
    );

    await screen.findByText(/Performance/i);
    
    // Check Excel export contains offline/synced flags
    const excelBtn = screen.getByRole('button', { name: /Excel/i });
    fireEvent.click(excelBtn);
    expect(excelSpy).toHaveBeenCalled();
    const excelArgs = excelSpy.mock.calls[0][0];
    const exportedSale = excelArgs.sales.find((s: any) => s.id === TEST_SALE_SYNCED_ID);
    expect(exportedSale).toBeDefined();
    expect(exportedSale.isOffline).toBe(true);
    expect(exportedSale.synced).toBe(true);

    // Check PDF export
    const pdfBtn = screen.getByRole('button', { name: /Relatório/i });
    fireEvent.click(pdfBtn);
    expect(pdfSpy).toHaveBeenCalled();
  });

  it('filters by date range correctly in export', async () => {
    const excelSpy = vi.spyOn(PDFReportExports, 'exportExcelReport');

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <LocalReportsPage />
        </QueryClientProvider>
      </BrowserRouter>
    );

    await screen.findByText(/Performance/i);

    const startDateInput = screen.getByLabelText(/Data Início/i);
    const endDateInput = screen.getByLabelText(/Data Fim/i);

    fireEvent.change(startDateInput, { target: { value: '2023-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2023-12-31' } });

    fireEvent.click(screen.getByRole('button', { name: /Excel/i }));

    expect(excelSpy).toHaveBeenCalledWith(expect.objectContaining({
      startDate: '2023-01-01',
      endDate: '2023-12-31'
    }));
  });
});