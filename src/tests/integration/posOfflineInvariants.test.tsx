/**
 * Sprint 11.4 · Fases 4, 5 e 7 — LocalPOSContext state invariants.
 *  - Fase 4: completeSale offline → local state → syncManager → replay (P0-004)
 *  - Fase 5: Realtime stock protection while sync is pending (P0-005)
 *  - Fase 7: secure store selection, no silent first-store fallback (P0-007)
 * No real backend, no Realtime connection — everything is mocked in-process.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';

const U = '550e8400-e29b-41d4-a716-446655440001';
const CO = '550e8400-e29b-41d4-a716-446655440002';
const ST_A = '550e8400-e29b-41d4-a716-446655440003';
const ST_B = '550e8400-e29b-41d4-a716-44665544000b';
const CR = '550e8400-e29b-41d4-a716-446655440010';
const P1 = '550e8400-e29b-41d4-a716-446655440004';
const P2 = '550e8400-e29b-41d4-a716-446655440005';

const h = vi.hoisted(() => ({
  auth: { current: null as any },
  realtime: { handler: null as null | ((payload: any) => void) },
  data: { current: null as any },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => h.auth.current,
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    removeChannel: vi.fn(),
    channel: vi.fn(() => {
      const ch: any = {
        on: vi.fn((_evt: string, _filter: any, cb: (p: any) => void) => { h.realtime.handler = cb; return ch; }),
        subscribe: vi.fn(() => ch),
      };
      return ch;
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

import { LocalPOSProvider, useLocalPOS } from '@/contexts/LocalPOSContext';
import { supabase } from '@/integrations/supabase/client';
import { syncManager } from '@/lib/syncQueue';
import { toast } from 'sonner';

const baseAuth = (overrides: Partial<any> = {}) => ({
  user: { id: U, store_id: ST_A, company_id: CO, full_name: 'Operador Teste', email: 'op@t.mz' },
  company: { id: CO, name: 'Co', country: 'MZ' },
  store: { id: ST_A, name: 'Loja A', company_id: CO },
  role: 'seller', permissions: [], roles: ['seller'],
  branch: null, tenant: null, isMaster: false, isFounder: false,
  loading: false, appReady: true, isAuthenticated: true, onboardingCompleted: true,
  hasPerm: () => true,
  signIn: async () => {}, signUp: async () => {}, signOut: async () => {},
  completeOnboarding: async () => {}, refreshUserData: async () => {},
  ...overrides,
});

const baseData = () => ({
  stores: [
    { id: ST_A, name: 'Loja A', is_active: true, company_id: CO, address: '', phone: '' },
    { id: ST_B, name: 'Loja B', is_active: true, company_id: CO, address: '', phone: '' },
  ],
  products: [
    { id: P1, name: 'Arroz', sale_price: 100, cost_price: 80, is_active: true, company_id: CO },
    { id: P2, name: 'Óleo', sale_price: 50, cost_price: 30, is_active: true, company_id: CO },
  ],
  cash_registers: [{ id: CR, store_id: ST_A, user_id: U, status: 'open', opening_amount: 1000, opened_at: new Date().toISOString(), company_id: CO }],
  product_stock: [{ product_id: P1, quantity: 10 }, { product_id: P2, quantity: 5 }],
  profiles: [{ id: U, full_name: 'Operador Teste', email: 'op@t.mz', company_id: CO }],
  sales: [],
});

const buildFromMock = () => (table: string) => {
  const rows = () => h.data.current[table] ?? [];
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve({ data: rows(), error: null })),
    then: (cb: any) => Promise.resolve({ data: rows(), error: null }).then(cb),
  };
  return chain;
};

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  React.createElement(LocalPOSProvider, null, children);

const setOnline = (v: boolean) =>
  Object.defineProperty(navigator, 'onLine', { configurable: true, writable: true, value: v });

const waitLoaded = async (result: any) => {
  await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
};
const waitReady = async (result: any) => {
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.currentStore?.id).toBe(ST_A);
    expect(result.current.currentCashRegister?.status).toBe('open');
    expect(result.current.products.length).toBe(2);
  }, { timeout: 5000 });
};
const stockOf = (result: any, id: string) => result.current.products.find((p: any) => p.id === id)?.stock;
const emitRealtime = (product_id: string, quantity: number, store_id = ST_A) =>
  act(() => { h.realtime.handler?.({ eventType: 'UPDATE', new: { product_id, quantity, store_id, company_id: CO } }); });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  syncManager.clearQueue();
  syncManager.forceSetProcessing(false);
  h.auth.current = baseAuth();
  h.data.current = baseData();
  h.realtime.handler = null;
  (supabase.from as any).mockImplementation(buildFromMock());
  (supabase.rpc as any).mockResolvedValue({ data: { success: true, sale_id: 'srv-1', total: 250, profit: 60 }, error: null });
  setOnline(true);
});
afterEach(() => { vi.clearAllMocks(); setOnline(true); });

// ─────────────────────────────────────────────────────────────────────────────
// FASE 4 — Venda offline
// ─────────────────────────────────────────────────────────────────────────────
describe('Fase 4 — completeSale offline (P0-004)', () => {
  const sellOffline = async (result: any) => {
    const [arroz, oleo] = result.current.products;
    act(() => { result.current.addToCart(arroz); });
    act(() => { result.current.addToCart(arroz); });
    act(() => { result.current.addToCart(oleo); });
    let sale: any;
    await act(async () => {
      sale = await result.current.completeSale({ method: 'cash', amountReceived: 250, change: 0 });
    });
    return sale;
  };

  it('creates the sale locally with correct items, totals and offline flags', async () => {
    setOnline(false);
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitReady(result);
    const sale = await sellOffline(result);

    expect(sale).not.toBeNull();
    expect(sale.isOffline).toBe(true);
    expect(sale.synced).toBe(false);
    expect(sale.total).toBe(250);
    expect(sale.subtotal).toBe(250);
    expect(sale.items).toHaveLength(2);
    expect(sale.items.find((i: any) => i.product.id === P1).quantity).toBe(2);
    expect(sale.items.find((i: any) => i.product.id === P2).quantity).toBe(1);
    // state invariant: sale is the newest entry
    expect(result.current.sales[0].id).toBe(sale.id);
    expect(result.current.getLastSale()?.id).toBe(sale.id);
  });

  it('decrements optimistic stock per item quantity and clears the cart', async () => {
    setOnline(false);
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitReady(result);
    expect(stockOf(result, P1)).toBe(10);
    expect(stockOf(result, P2)).toBe(5);
    await sellOffline(result);
    expect(stockOf(result, P1)).toBe(8);
    expect(stockOf(result, P2)).toBe(4);
    expect(result.current.cart).toHaveLength(0);
    expect(result.current.getTotal()).toBe(0);
  });

  it('enqueues exactly one SALE task whose canonical payload mirrors the local sale', async () => {
    setOnline(false);
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitReady(result);
    const sale = await sellOffline(result);

    const tasks = syncManager.getTasksByType('SALE');
    expect(tasks).toHaveLength(1);
    const rp = tasks[0].payload.rpcPayload;
    expect(rp.p_client_sale_id).toBe(sale.id);
    expect(rp.p_store_id).toBe(ST_A);
    expect(rp.p_cash_register_id).toBe(CR);
    expect(rp.p_payment_method).toBe('cash');
    expect(rp.p_subtotal).toBe(250);
    expect(rp.p_total).toBe(250);
    expect(rp.p_discount_amount).toBe(0);
    expect(rp.p_items).toEqual([
      expect.objectContaining({ product_id: P1, product_name: 'Arroz', quantity: 2, unit_price: 100, cost_price: 80, total: 200 }),
      expect.objectContaining({ product_id: P2, product_name: 'Óleo', quantity: 1, unit_price: 50, cost_price: 30, total: 50 }),
    ]);
    expect(supabase.rpc).not.toHaveBeenCalledWith('pos_complete_sale', expect.anything());
  });

  it('sync failure keeps the sale, the task and the optimistic stock (nothing lost)', async () => {
    setOnline(false);
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitReady(result);
    const sale = await sellOffline(result);

    (supabase.rpc as any).mockResolvedValueOnce({ data: null, error: { message: 'NETWORK' } });
    setOnline(true);
    await act(async () => { await syncManager.processQueue(); });

    const tasks = syncManager.getTasksByType('SALE');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].retryCount).toBe(1);
    expect(tasks[0].payload.rpcPayload.p_client_sale_id).toBe(sale.id);
    expect(result.current.sales[0].id).toBe(sale.id);
    expect(stockOf(result, P1)).toBe(8);
  });

  it('retry replays with the SAME idempotency key (no duplicate sale) and drains on success', async () => {
    setOnline(false);
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitReady(result);
    const sale = await sellOffline(result);

    (supabase.rpc as any).mockResolvedValueOnce({ data: null, error: { message: 'NETWORK' } });
    setOnline(true);
    await act(async () => { await syncManager.processQueue(); });
    const [t] = syncManager.getTasksByType('SALE');
    await act(async () => { await syncManager.retryTask(t.id); });

    const keys = (supabase.rpc as any).mock.calls
      .filter((c: any[]) => c[0] === 'pos_complete_sale')
      .map((c: any[]) => c[1].p_client_sale_id);
    expect(keys).toEqual([sale.id, sale.id]);
    expect(syncManager.getTasksByType('SALE')).toHaveLength(0);
  });

  it('two consecutive offline sales produce two distinct tasks and cumulative stock decrement', async () => {
    setOnline(false);
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitReady(result);
    const s1 = await sellOffline(result);
    const s2 = await sellOffline(result);
    expect(s1.id).not.toBe(s2.id);
    expect(syncManager.getTasksByType('SALE')).toHaveLength(2);
    expect(stockOf(result, P1)).toBe(6);
    expect(stockOf(result, P2)).toBe(3);
    expect(result.current.sales.slice(0, 2).map((s: any) => s.id)).toEqual([s2.id, s1.id]);
  });

  it('refuses to sell with an empty store context (no task, no state mutation)', async () => {
    h.auth.current = baseAuth({ store: null, user: { id: U, store_id: null, company_id: CO } });
    setOnline(false);
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitLoaded(result);
    expect(result.current.currentStore).toBeNull();
    let sale: any;
    await act(async () => { sale = await result.current.completeSale({ method: 'cash', amountReceived: 0, change: 0 }); });
    expect(sale).toBeNull();
    expect(syncManager.getTasksByType('SALE')).toHaveLength(0);
    expect(toast.error).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FASE 5 — Stock + Realtime (P0-005)
// ─────────────────────────────────────────────────────────────────────────────
describe('Fase 5 — Realtime stock protection (P0-005)', () => {
  it('stock 10 → offline sale → 9; stale Realtime(10) does NOT overwrite while task pending', async () => {
    setOnline(false);
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitReady(result);
    expect(h.realtime.handler).toBeTypeOf('function');

    act(() => { result.current.addToCart(result.current.products[0]); });
    await act(async () => { await result.current.completeSale({ method: 'cash', amountReceived: 100, change: 0 }); });
    expect(stockOf(result, P1)).toBe(9);
    expect(syncManager.getTasksByType('SALE')).toHaveLength(1);

    emitRealtime(P1, 10); // stale server snapshot
    expect(stockOf(result, P1)).toBe(9);
  });

  it('Realtime events for OTHER products are also held while a sale is pending (protected window)', async () => {
    setOnline(false);
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitReady(result);
    act(() => { result.current.addToCart(result.current.products[0]); });
    await act(async () => { await result.current.completeSale({ method: 'cash', amountReceived: 100, change: 0 }); });
    emitRealtime(P2, 999);
    expect(stockOf(result, P2)).toBe(5);
  });

  it('multiple pending sales: protection holds until the LAST task is drained', async () => {
    setOnline(false);
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitReady(result);
    for (let i = 0; i < 3; i++) {
      act(() => { result.current.addToCart(result.current.products[0]); });
      await act(async () => { await result.current.completeSale({ method: 'cash', amountReceived: 100, change: 0 }); });
    }
    expect(stockOf(result, P1)).toBe(7);
    expect(syncManager.getTasksByType('SALE')).toHaveLength(3);

    // first replay fails for task #1 only, others succeed → 2 drained, 1 still pending
    (supabase.rpc as any)
      .mockResolvedValueOnce({ data: null, error: { message: 'NETWORK' } })
      .mockResolvedValue({ data: { success: true }, error: null });
    setOnline(true);
    await act(async () => { await syncManager.processQueue(); });
    expect(syncManager.getTasksByType('SALE')).toHaveLength(1);

    emitRealtime(P1, 10);
    expect(stockOf(result, P1)).toBe(7); // still protected

    await act(async () => { await syncManager.retryTask(syncManager.getTasksByType('SALE')[0].id); });
    expect(syncManager.getTasksByType('SALE')).toHaveLength(0);

    emitRealtime(P1, 7); // server confirms final state
    expect(stockOf(result, P1)).toBe(7);
  });

  it('after confirmed replay, a LATER Realtime event reconciles local stock with the server', async () => {
    setOnline(false);
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitReady(result);
    act(() => { result.current.addToCart(result.current.products[0]); });
    await act(async () => { await result.current.completeSale({ method: 'cash', amountReceived: 100, change: 0 }); });

    setOnline(true);
    await act(async () => { await syncManager.processQueue(); });
    expect(syncManager.getTasksByType('SALE')).toHaveLength(0);

    // server-side truth (e.g. another terminal also sold one unit)
    emitRealtime(P1, 8);
    expect(stockOf(result, P1)).toBe(8);
  });

  it('with no pending work, Realtime is applied immediately (online baseline)', async () => {
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitReady(result);
    emitRealtime(P1, 4);
    expect(stockOf(result, P1)).toBe(4);
  });

  it('Realtime events for a different store never touch the current store stock', async () => {
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitReady(result);
    emitRealtime(P1, 0, ST_B);
    expect(stockOf(result, P1)).toBe(10);
  });

  it('DOCUMENTED GAP: after replay, an out-of-order STALE event is applied (no version/ts guard)', async () => {
    // This test pins current behaviour so any future change is explicit.
    setOnline(false);
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitReady(result);
    act(() => { result.current.addToCart(result.current.products[0]); });
    await act(async () => { await result.current.completeSale({ method: 'cash', amountReceived: 100, change: 0 }); });
    setOnline(true);
    await act(async () => { await syncManager.processQueue(); });
    emitRealtime(P1, 10); // stale snapshot delivered late
    expect(stockOf(result, P1)).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FASE 7 — Multi-loja / store_id (P0-007)
// ─────────────────────────────────────────────────────────────────────────────
describe('Fase 7 — secure store selection (P0-007)', () => {
  it('explicit auth store wins and matches exactly among multiple stores', async () => {
    h.auth.current = baseAuth({ store: { id: ST_B, name: 'Loja B' }, user: { id: U, store_id: ST_A, company_id: CO } });
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitLoaded(result);
    expect(result.current.stores).toHaveLength(2);
    expect(result.current.currentStore?.id).toBe(ST_B);
  });

  it('falls back to user.store_id when no explicit auth store', async () => {
    h.auth.current = baseAuth({ store: null, user: { id: U, store_id: ST_B, company_id: CO } });
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitLoaded(result);
    expect(result.current.currentStore?.id).toBe(ST_B);
  });

  it('user WITHOUT store_id and no auth store → currentStore null (no silent first-store pick)', async () => {
    h.auth.current = baseAuth({ store: null, user: { id: U, store_id: null, company_id: CO } });
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitLoaded(result);
    expect(result.current.stores).toHaveLength(2);
    expect(result.current.currentStore).toBeNull();
    expect(result.current.store).toBeNull();
    expect(result.current.currentCashRegister).toBeNull();
    expect(result.current.cashRegisterOpen).toBe(false);
  });

  it('store_id pointing to a store that does not belong to the company → null', async () => {
    const GHOST = '550e8400-e29b-41d4-a716-4466554400ff';
    h.auth.current = baseAuth({ store: { id: GHOST, name: 'Ghost' }, user: { id: U, store_id: GHOST, company_id: CO } });
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitLoaded(result);
    expect(result.current.currentStore).toBeNull();
  });

  it('company with zero stores → null, no crash', async () => {
    h.data.current = { ...baseData(), stores: [], cash_registers: [] };
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitLoaded(result);
    expect(result.current.stores).toHaveLength(0);
    expect(result.current.currentStore).toBeNull();
  });

  it('open cash register from ANOTHER store is never adopted as current', async () => {
    h.data.current = {
      ...baseData(),
      cash_registers: [{ id: CR, store_id: ST_B, user_id: U, status: 'open', opening_amount: 1, opened_at: new Date().toISOString(), company_id: CO }],
    };
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitLoaded(result);
    expect(result.current.currentStore?.id).toBe(ST_A);
    expect(result.current.currentCashRegister).toBeNull();
  });

  it('setCurrentStore only switches to a known store; unknown ids are ignored', async () => {
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitReady(result);
    act(() => { result.current.setCurrentStore(ST_B); });
    expect(result.current.currentStore?.id).toBe(ST_B);
    act(() => { result.current.setCurrentStore('not-a-store'); });
    expect(result.current.currentStore?.id).toBe(ST_B);
  });

  it('without a valid company id nothing is loaded and state stays neutral', async () => {
    h.auth.current = baseAuth({ company: null });
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitLoaded(result);
    expect(result.current.stores).toHaveLength(0);
    expect(result.current.currentStore).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
