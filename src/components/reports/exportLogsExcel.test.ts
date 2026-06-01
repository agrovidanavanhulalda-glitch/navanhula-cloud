import { describe, it, expect, vi } from 'vitest';
import { exportLogsExcel, exportLogsPDF } from './PDFReport';

// Mocking dependencies to avoid browser/external calls during unit tests
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    setLineWidth: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
  })),
}));

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(),
    book_new: vi.fn(),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe('Export Validation (Excel & PDF)', () => {
  const mockHistory = [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      type: 'XLSX',
      status: 'success',
      syncStatus: 'completed',
      filters: { store: 'all', seller: 'all', start: '2023-01-01', end: '2023-12-31' }
    }
  ];

  const mockStores = [{ id: 'all', name: 'Todas' }] as any;

  describe('exportLogsExcel', () => {
    it('deve lançar erro quando o syncStatus é "all"', async () => {
      const filters = {
        store: 'all',
        seller: 'all',
        start: '2023-01-01',
        end: '2023-12-31',
        syncStatus: 'all'
      };

      await expect(exportLogsExcel({ 
        history: mockHistory, 
        stores: mockStores, 
        filters 
      })).rejects.toThrow("Selecione um status válido para exportação XLSX");
    });

    it('deve lançar erro quando o syncStatus é vazio/undefined', async () => {
      const filters = {
        store: 'all',
        seller: 'all',
        start: '2023-01-01',
        end: '2023-12-31',
        syncStatus: undefined as any
      };

      await expect(exportLogsExcel({ 
        history: mockHistory, 
        stores: mockStores, 
        filters 
      })).rejects.toThrow("Selecione um status válido para exportação XLSX");
    });

    it('não deve lançar erro quando o syncStatus é válido (completed)', async () => {
      const filters = {
        store: 'all',
        seller: 'all',
        start: '2023-01-01',
        end: '2023-12-31',
        syncStatus: 'completed'
      };

      await expect(exportLogsExcel({ 
        history: mockHistory, 
        stores: mockStores, 
        filters 
      })).resolves.not.toThrow();
    });
  });

  describe('exportLogsPDF', () => {
    it('deve lançar erro quando o syncStatus é "all"', async () => {
      const filters = {
        store: 'all',
        seller: 'all',
        start: '2023-01-01',
        end: '2023-12-31',
        syncStatus: 'all'
      };

      await expect(exportLogsPDF({ 
        history: mockHistory, 
        stores: mockStores, 
        filters 
      })).rejects.toThrow("Selecione um status válido: Pendente, Sincronizando, Sincronizado");
    });

    it('deve lançar erro quando o syncStatus é inválido', async () => {
      const filters = {
        store: 'all',
        seller: 'all',
        start: '2023-01-01',
        end: '2023-12-31',
        syncStatus: 'invalid' as any
      };

      await expect(exportLogsPDF({ 
        history: mockHistory, 
        stores: mockStores, 
        filters 
      })).rejects.toThrow("Selecione um status válido: Pendente, Sincronizando, Sincronizado");
    });

    it('não deve lançar erro quando o syncStatus é válido (syncing)', async () => {
      const filters = {
        store: 'all',
        seller: 'all',
        start: '2023-01-01',
        end: '2023-12-31',
        syncStatus: 'syncing' as any
      };

      await expect(exportLogsPDF({ 
        history: mockHistory, 
        stores: mockStores, 
        filters 
      })).resolves.not.toThrow();
    });
  });
});

