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

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ 
            data: [
              {
                id: '1',
                action: 'UPDATE_STOCK',
                table_name: 'inventory',
                details: { item: 'Coca-Cola', conflict: 'resolved_version_2' },
                created_at: '2024-05-20T10:00:00Z',
                store_id: 'store-1',
                profiles: { full_name: 'Manager A', email: 'manager@store.com' }
              },
              {
                id: '1',
                action: 'UPDATE_STOCK',
                table_name: 'inventory',
                details: { item: 'Coca-Cola', conflict: 'original_offline_version_1' },
                created_at: '2024-05-20T10:00:00Z',
                store_id: 'store-1',
                profiles: { full_name: 'Manager B', email: 'manager-b@store.com' }
              }
            ], 
            error: null 
          })),
        })),
      })),
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
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
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

    await waitFor(() => {
      const actions = screen.getAllByText(/UPDATE_STOCK/);
      expect(actions.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    expect(screen.getByText(/manager@store.com/)).toBeInTheDocument();
  });

  it('should ensure consistency in Excel export when conflicts are resolved', async () => {
    renderComponent();

    await waitFor(() => screen.getByText(/Auditoria Enterprise/));

    const exportExcelBtn = screen.getByRole('button', { name: /Excel/i });
    fireEvent.click(exportExcelBtn);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
    const callData = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0] as any[];
    
    const hasConflictDetails = callData.some((row: any) => 
      row.details.includes('resolved_version_2') || row.details.includes('original_offline_version_1')
    );
    expect(hasConflictDetails).toBe(true);
  });

  it('should ensure consistency in PDF export when conflicts are resolved', async () => {
    renderComponent();

    await waitFor(() => screen.getByText(/Auditoria Enterprise/));

    const exportPdfBtn = screen.getByRole('button', { name: /PDF/i });
    fireEvent.click(exportPdfBtn);

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
