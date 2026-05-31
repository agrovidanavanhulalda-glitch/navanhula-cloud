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
  },
  {
    id: 'conflict-1-original',
    action: 'UPDATE_STOCK',
    table_name: 'inventory',
    details: { item: 'Coca-Cola', conflict: 'original_offline_version_1', status: 'overridden' },
    created_at: '2024-05-20T10:00:00Z',
    store_id: TEST_STORE_ID,
    profiles: { full_name: 'Manager B', email: 'manager-b@store.com' }
  }
];

const mockStores = [
  { id: TEST_STORE_ID, name: 'Store 1', timezone: 'UTC' }
];

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table) => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        match: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((cb) => {
          if (table === 'audit_logs') {
            return Promise.resolve(cb({ data: mockAuditLogs, error: null }));
          }
          if (table === 'stores') {
            return Promise.resolve(cb({ data: mockStores, error: null }));
          }
          return Promise.resolve(cb({ data: [], error: null }));
        }),
      };
      return queryBuilder;
    }),
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
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
      },
    });
  });

  const renderComponent = () => render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SystemAuditPage />
      </BrowserRouter>
    </QueryClientProvider>
  );

  it('should display conflict resolution events correctly in UI', async () => {
    renderComponent();

    // Go to "Auditoria DB" tab
    const dbTab = await screen.findByRole('tab', { name: /Auditoria DB/i });
    fireEvent.click(dbTab);

    // Wait for the action text to appear in the list
    await waitFor(() => {
      const actions = screen.getAllByText(/UPDATE_STOCK/i);
      expect(actions.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 5000 });

    // Check if the UI reflects the manager info
    expect(screen.getByText(/Manager A/i)).toBeInTheDocument();
    
    // Check if conflict details are rendered (in the JSON preview)
    expect(screen.getByText(/resolved_version_2/i)).toBeInTheDocument();
  });

  it('should ensure consistency in Excel export when conflicts are resolved', async () => {
    renderComponent();

    // Wait for component to be ready
    await screen.findByRole('tab', { name: /Auditoria DB/i });
    fireEvent.click(screen.getByRole('tab', { name: /Auditoria DB/i }));

    // Wait for logs
    await screen.findAllByText(/UPDATE_STOCK/i);

    // Find and click Excel button in the DB tab section
    const excelButtons = screen.getAllByRole('button', { name: /Excel/i });
    // Usually the last one or we can target by container if needed, but let's try to click one that is visible
    fireEvent.click(excelButtons[excelButtons.length - 1]);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
    const callData = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0] as any[];
    
    // Verify conflict details are present in exported data
    const hasConflict = callData.some(row => 
      (row.details && row.details.includes('resolved_version_2')) ||
      (row.details && row.details.includes('original_offline_version_1'))
    );
    expect(hasConflict).toBe(true);
  });

  it('should ensure consistency in PDF export when conflicts are resolved', async () => {
    renderComponent();

    fireEvent.click(await screen.findByRole('tab', { name: /Auditoria DB/i }));
    await screen.findAllByText(/UPDATE_STOCK/i);

    const pdfButtons = screen.getAllByRole('button', { name: /PDF/i });
    fireEvent.click(pdfButtons[pdfButtons.length - 1]);

    const docInstance = vi.mocked(jsPDF).mock.results[0].value;
    expect(docInstance.save).toHaveBeenCalled();
    
    const autoTableCall = (docInstance as any).autoTable.mock.calls[0][0];
    const body = autoTableCall.body;
    
    const hasConflictInPdf = body.some((row: string[]) => 
      row.some(cell => cell.includes('resolved_version_2') || cell.includes('original_offline_version_1'))
    );
    expect(hasConflictInPdf).toBe(true);
  });
});
