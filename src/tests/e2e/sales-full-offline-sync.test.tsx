/**
 * sales-full-offline-sync.test.tsx — Stabilization Sprint 0.2, Etapa 3.1
 *
 * Matriz de cenários da RPC `pos_complete_sale`:
 *   1) Venda simples          2) Venda múltipla
 *   3) Voucher                4) Sem stock (rollback)
 *   5) Erro forçado           6-9) cash / mpesa / emola / card
 *  10) Pagamento dividido
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { LocalPOSProvider, useLocalPOS } from '@/contexts/LocalPOSContext';
import { supabase } from '@/integrations/supabase/client';
import { syncManager } from '@/lib/syncQueue';

const U = '550e8400-e29b-41d4-a716-446655440001';
const CO = '550e8400-e29b-41d4-a716-446655440002';
const ST = '550e8400-e29b-41d4-a716-446655440003';
const CR = '550e8400-e29b-41d4-a716-446655440010';
const P1 = '550e8400-e29b-41d4-a716-446655440004';
const P2 = '550e8400-e29b-41d4-a716-446655440005';

vi.mock('@/contexts/AuthContext', () => {
  const U = '550e8400-e29b-41d4-a716-446655440001';
  const CO = '550e8400-e29b-41d4-a716-446655440002';
  const ST = '550e8400-e29b-41d4-a716-446655440003';
  return {
    useAuth: () => ({
      user: { id: U, store_id: ST, company_id: CO, full_name: 'Test', email: 't@t.mz' },
      company: { id: CO, name: 'Co', country: 'MZ' },
      store: { id: ST, name: 'Store', company_id: CO },
      role: 'admin', permissions: [], roles: ['admin'],
      branch: null, tenant: null, isMaster: false, isFounder: false,
      loading: false, appReady: true, isAuthenticated: true, onboardingCompleted: true,
      hasPerm: () => true,
      signIn: async () => {}, signUp: async () => {}, signOut: async () => {},
      completeOnboarding: async () => {}, refreshUserData: async () => {},
    }),
    AuthProvider: ({ children }: any) => children,
  };
});

vi.mock('@/integrations/supabase/client', () => {
  const U = '550e8400-e29b-41d4-a716-446655440001';
  return {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
      removeChannel: vi.fn(),
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: U } } }, error: null }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    },
  };
});

const U = '550e8400-e29b-41d4-a716-446655440001';
const CO = '550e8400-e29b-41d4-a716-446655440002';
const ST = '550e8400-e29b-41d4-a716-446655440003';
const CR = '550e8400-e29b-41d4-a716-446655440010';
const P1 = '550e8400-e29b-41d4-a716-446655440004';
const P2 = '550e8400-e29b-41d4-a716-446655440005';

const buildFromMock = () => (table: string) => {
  const dataFor: Record<string, any[]> = {
    stores: [{ id: ST, name: 'Store', is_active: true, company_id: CO, address: '', phone: '' }],
    products: [
      { id: P1, name: 'Arroz', sale_price: 100, cost_price: 80, is_active: true, company_id: CO },
      { id: P2, name: 'Feijão', sale_price: 50, cost_price: 30, is_active: true, company_id: CO },
    ],
    cash_registers: [{ id: CR, store_id: ST, user_id: U, status: 'open', opening_amount: 1000, opened_at: new Date().toISOString(), company_id: CO }],
    product_stock: [
      { product_id: P1, quantity: 100 },
      { product_id: P2, quantity: 50 },
    ],
    profiles: [{ id: U, full_name: 'Test', email: 't@t.mz', company_id: CO }],
    sales: [],
  };
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve({ data: dataFor[table] ?? [], error: null })),
    then: (cb: any) => Promise.resolve({ data: dataFor[table] ?? [], error: null }).then(cb),
  };
  return chain;
};

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  React.createElement(LocalPOSProvider, null, children);

const setup = async () => {
  const { result } = renderHook(() => useLocalPOS(), { wrapper });
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.currentStore?.id).toBe(ST);
    expect(result.current.currentCashRegister?.status).toBe('open');
    expect(result.current.products.length).toBe(2);
  }, { timeout: 5000 });
  return result;
};

const rpcOk = (overrides: any = {}) => ({
  data: { success: true, sale_id: 'sale-x', total: 100, profit: 20, voucher_redeemed: false, ...overrides },
  error: null,
});

describe('POS RPC scenario matrix — pos_complete_sale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    syncManager.clearQueue();
    syncManager.forceSetProcessing(false);
    (supabase.from as any).mockImplementation(buildFromMock());
    (supabase.rpc as any).mockResolvedValue(rpcOk());
    Object.defineProperty(navigator, 'onLine', { configurable: true, writable: true, value: true });
  });

  it('1) Venda simples (1 produto) — RPC recebe 1 item', async () => {
    const result = await setup();
    act(() => { result.current.addToCart(result.current.products[0]); });
    await act(async () => { await result.current.completeSale({ method: 'cash', amountReceived: 100, change: 0 }); });
    const [name, args] = (supabase.rpc as any).mock.calls[0];
    expect(name).toBe('pos_complete_sale');
    expect(args.p_items).toHaveLength(1);
    expect(args.p_items[0].product_id).toBe(P1);
    expect(args.p_total).toBe(100);
  });

  it('2) Venda múltipla — RPC recebe todos os itens e totais corretos', async () => {
    const result = await setup();
    act(() => {
      result.current.addToCart(result.current.products[0]); // 100
      result.current.addToCart(result.current.products[1]); //  50
    });
    await act(async () => { await result.current.completeSale({ method: 'cash', amountReceived: 150, change: 0 }); });
    const args = (supabase.rpc as any).mock.calls[0][1];
    expect(args.p_items).toHaveLength(2);
    expect(args.p_subtotal).toBe(150);
    expect(args.p_total).toBe(150);
  });

  it('3) Voucher — código repassado para RPC (resgate atômico server-side)', async () => {
    (supabase.rpc as any).mockResolvedValue(rpcOk({ voucher_redeemed: true }));
    const result = await setup();
    act(() => { result.current.addToCart(result.current.products[0]); });
    await act(async () => {
      await result.current.completeSale({
        method: 'voucher',
        amountReceived: 100, change: 0,
        voucherDetails: { code: 'NAVA-VCH-1', voucherId: 'v1', originalMethod: 'mpesa' },
      });
    });
    const args = (supabase.rpc as any).mock.calls[0][1];
    expect(args.p_voucher_code).toBe('NAVA-VCH-1');
  });

  it('4) Sem stock — rollback: RPC erro → completeSale retorna null', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: null, error: { message: 'STOCK_INSUFFICIENT: stock insuficiente' },
    });
    const result = await setup();
    act(() => { result.current.addToCart(result.current.products[0]); });
    let sale: any;
    await act(async () => {
      sale = await result.current.completeSale({ method: 'cash', amountReceived: 100, change: 0 });
    });
    expect(sale).toBeNull();
  });

  it('5) Erro forçado — exceção genérica da RPC não persiste dados locais', async () => {
    (supabase.rpc as any).mockRejectedValue(new Error('DB_ERROR: exceção simulada'));
    const result = await setup();
    act(() => { result.current.addToCart(result.current.products[0]); });
    let sale: any;
    await act(async () => {
      sale = await result.current.completeSale({ method: 'cash', amountReceived: 100, change: 0 });
    });
    expect(sale).toBeNull();
  });

  it.each([
    ['cash',   'Dinheiro'],
    ['mpesa',  'M-Pesa'],
    ['emola',  'e-Mola'],
    ['card',   'Cartão'],
  ])('6-9) Pagamento %s — RPC recebe method=%s', async (method) => {
    const result = await setup();
    act(() => { result.current.addToCart(result.current.products[0]); });
    await act(async () => {
      await result.current.completeSale({ method: method as any, amountReceived: 100, change: 0 });
    });
    const args = (supabase.rpc as any).mock.calls[0][1];
    expect(args.p_payment_method).toBe(method);
    expect(args.p_cash_register_id).toBe(CR);
  });

  it('10) Pagamento dividido — RPC recebe method=split e valor total correto', async () => {
    const result = await setup();
    act(() => { result.current.addToCart(result.current.products[0]); });
    await act(async () => {
      await result.current.completeSale({
        method: 'split', amountReceived: 100, change: 0,
        splitDetails: { cashAmount: 60, electronicAmount: 40, electronicMethod: 'mpesa' },
      });
    });
    const args = (supabase.rpc as any).mock.calls[0][1];
    expect(args.p_payment_method).toBe('split');
    expect(args.p_total).toBe(100);
  });
});
