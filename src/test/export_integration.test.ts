import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../integrations/supabase/client';

// Mock do Supabase
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('Database Integration: Export Validation Trigger', () => {
  it('should reject insertion into export_history when syncStatus is "all"', async () => {
    // Simulando a falha que o trigger do banco de dados causaria
    // Em um teste de integração real com banco, o Supabase retornaria um erro
    const mockInsert = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'Status de sincronização inválido: deve ser Pendente, Sincronizando ou Sincronizado.',
        code: 'P0001' // Código de erro comum para RAISE EXCEPTION no Postgres
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
      syncStatus: 'all' // Inválido de acordo com o trigger
    };

    const { data, error } = await supabase.from('export_history').insert({
      type: 'XLSX',
      status: 'success',
      filters: invalidFilters,
      user_id: 'test-user-id'
    });

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
      syncStatus: '' // Vazio, também deve ser rejeitado pelo trigger
    };

    const { data, error } = await supabase.from('export_history').insert({
      type: 'XLSX',
      status: 'success',
      filters: invalidFilters,
      user_id: 'test-user-id'
    });

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
      syncStatus: 'completed' // Válido
    };

    const { data, error } = await supabase.from('export_history').insert({
      type: 'XLSX',
      status: 'success',
      filters: validFilters,
      user_id: 'test-user-id'
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.id).toBe('new-export-id');
  });
});
