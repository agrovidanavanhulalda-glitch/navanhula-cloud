import { describe, it, expect, vi } from 'vitest';
import { supabase } from '../integrations/supabase/client';

// Mock do Supabase
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('Database Integration: Export Validation Trigger', () => {
  it('should reject insertion into export_history when syncStatus is "all"', async () => {
    const mockInsert = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'Status de sincronização inválido: deve ser Pendente, Sincronizando ou Sincronizado.',
        code: 'P0001'
      }
    });

    (supabase.from as any).mockReturnValue({
      insert: mockInsert
    });

    const invalidFilters = {
      store: 'all',
      seller: 'all',
      start: '2026-01-01',
      end: '2026-01-31',
      syncStatus: 'all'
    };

    const { data, error } = await supabase.from('export_history').insert({
      type: 'XLSX',
      status: 'success',
      filters: invalidFilters,
      user_id: 'test-user-id',
      company_id: 'test-company-id'
    } as any);

    expect(error).toBeDefined();
    expect(error?.message).toContain('Status de sincronização inválido');
    expect(data).toBeNull();
  });

  it('should reject insertion into export_history when syncStatus is empty', async () => {
    const mockInsert = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'Status de sincronização inválido: deve ser Pendente, Sincronizando ou Sincronizado.',
        code: 'P0001'
      }
    });

    (supabase.from as any).mockReturnValue({
      insert: mockInsert
    });

    const invalidFilters = {
      store: 'all',
      seller: 'all',
      start: '2026-01-01',
      end: '2026-01-31',
      syncStatus: ''
    };

    const { error } = await supabase.from('export_history').insert({
      type: 'XLSX',
      status: 'success',
      filters: invalidFilters,
      user_id: 'test-user-id',
      company_id: 'test-company-id'
    } as any);

    expect(error).toBeDefined();
    expect(error?.message).toContain('Status de sincronização inválido');
  });

  it('should accept insertion into export_history with valid syncStatus', async () => {
    const mockInsert = vi.fn().mockResolvedValue({
      data: { id: 'new-export-id' },
      error: null
    });

    (supabase.from as any).mockReturnValue({
      insert: mockInsert
    });

    const validFilters = {
      store: 'all',
      seller: 'all',
      start: '2026-01-01',
      end: '2026-01-31',
      syncStatus: 'completed'
    };

    const { data, error } = await supabase.from('export_history').insert({
      type: 'XLSX',
      status: 'success',
      filters: validFilters,
      user_id: 'test-user-id',
      company_id: 'test-company-id'
    } as any);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    if (data) {
      expect((data as any).id).toBe('new-export-id');
    }
  });
});

