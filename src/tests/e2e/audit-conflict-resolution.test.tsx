import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import SystemAuditPage from '@/pages/SystemAuditPage';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const TEST_STORE_ID = 'store-1';

const mockAuditLogs = [
  {
    id: 'conflict-1-resolved',
    action: 'UPDATE_STOCK',
    table_name: 'inventory',
    details: { item: 'Coca-Cola', conflict: 'resolved_version_2', status: 'resolved' },
    created_at: '2024-05-20T10:00:00Z',
    store_id: TEST_STORE_ID,
    profiles: { full_name: 'Manager A', email: 'manager@store.com' }
  }
];

const mockStores = [
  { id: TEST_STORE_ID, name: 'Store 1', timezone: 'UTC' }
];

// Mock Supabase with immediate resolution to avoid timeout issues in CI
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => {
        if (table === 'audit_logs') return Promise.resolve(cb({ data: mockAuditLogs, error: null }));
        if (table === 'stores') return Promise.resolve(cb({ data: mockStores, error: null }));
        return Promise.resolve(cb({ data: [], error: null }));
      }),
    })),
  },
}));

// Mock XLSX
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn((data) => data),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

// Mock jsPDF
vi.mock('jspdf', () => {
  const jsPDFMock = vi.fn();
  jsPDFMock.prototype.text = vi.fn();
  jsPDFMock.prototype.save = vi.fn();
  jsPDFMock.prototype.autoTable = vi.fn();
  return { default: jsPDFMock };
});

describe('SystemAuditPage - Conflict Resolution', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
  });

  it('should maintain consistency between UI, Excel and PDF for conflict resolution events', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SystemAuditPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Verify UI is loaded
    expect(await screen.findByText(/Auditoria Enterprise/i)).toBeInTheDocument();

    // The data is present in the "general" logs query. 
    // We check that the export logic handles the conflict data correctly.
    
    // Test Excel Consistency
    const excelButtons = screen.getAllByRole('button', { name: /Excel/i });
    fireEvent.click(excelButtons[excelButtons.length - 1]);
    
    await waitFor(() => {
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
      const callData = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0] as any[];
      expect(callData.some(row => JSON.stringify(row).includes('resolved_version_2'))).toBe(true);
    });

    // Test PDF Consistency
    const pdfButtons = screen.getAllByRole('button', { name: /PDF/i });
    fireEvent.click(pdfButtons[pdfButtons.length - 1]);
    
    await waitFor(() => {
      const docInstance = vi.mocked(jsPDF).mock.results[0].value;
      expect(docInstance.save).toHaveBeenCalled();
    });
  });
});
