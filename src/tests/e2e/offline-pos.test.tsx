/**
 * offline-pos.test.tsx — Stabilization Sprint 0.2, Etapa 3.1
 * Modernizado para RPC `pos_complete_sale`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { LocalPOSProvider, useLocalPOS } from '@/contexts/LocalPOSContext';
import { supabase } from '@/integrations/supabase/client';
import { syncManager } from '@/lib/syncQueue';

vi.mock('@/contexts/AuthContext', () => {
  const U = '550e8400-e29b-41d4-a716-446655440001';
  const CO = '550e8400-e29b-41d4-a716-446655440002';
  const ST = '550e8400-e29b-41d4-a716-446655440003';
  return {
    useAuth: () => ({
      user: { id: U, store_id: ST, company_id: CO, full_name: 'Test User', email: 't@t.mz' },
      company: { id: CO, name: 'Test Co', country: 'MZ' },
      store: { id: ST, name: 'Test Store', company_id: CO },
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

const buildFromMock = () => (table: string) => {
  const dataFor: Record<string, any[]> = {
    stores: [{ id: ST, name: 'Test Store', is_active: true, company_id: CO, address: '', phone: '' }],
    products: [{ id: P1, name: 'Arroz', sale_price: 100, cost_price: 80, is_active: true, company_id: CO }],
    cash_registers: [{ id: CR, store_id: ST, user_id: U, status: 'open', opening_amount: 1000, opened_at: new Date().toISOString(), company_id: CO }],
    product_stock: [{ product_id: P1, quantity: 100 }],
    profiles: [{ id: U, full_name: 'Test User', email: 't@t.mz', company_id: CO }],
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

const waitForReady = async (result: any) => {
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.currentStore?.id).toBe(ST);
    expect(result.current.currentCashRegister?.status).toBe('open');
    expect(result.current.products.length).toBeGreaterThan(0);
  }, { timeout: 5000 });
};

describe('POS — pos_complete_sale RPC integration (Sprint 0.2 Etapa 3.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    syncManager.clearQueue();
    syncManager.forceSetProcessing(false);
    (supabase.from as any).mockImplementation(buildFromMock());
    (supabase.rpc as any).mockResolvedValue({
      data: { success: true, sale_id: 'sale-new-1', total: 100, profit: 20, voucher_redeemed: false },
      error: null,
    });
    Object.defineProperty(navigator, 'onLine', { configurable: true, writable: true, value: true });
  });

  afterEach(() => { vi.clearAllMocks(); });

  it('online: calls pos_complete_sale RPC with correct payload for cash sale', async () => {
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitForReady(result);
    act(() => { result.current.addToCart(result.current.products[0]); });
    await act(async () => {
      await result.current.completeSale({ method: 'cash', amountReceived: 100, change: 0 });
    });
    expect(supabase.rpc).toHaveBeenCalledWith('pos_complete_sale', expect.objectContaining({
      p_store_id: ST,
      p_cash_register_id: CR,
      p_payment_method: 'cash',
      p_subtotal: 100,
      p_total: 100,
      p_items: expect.arrayContaining([
        expect.objectContaining({ product_id: P1, quantity: 1, unit_price: 100 }),
      ]),
    }));
  });

  it('offline: enqueues sale in syncManager and does NOT call RPC', async () => {
    (navigator as any).onLine = false;
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitForReady(result);
    act(() => { result.current.addToCart(result.current.products[0]); });
    await act(async () => {
      await result.current.completeSale({ method: 'cash', amountReceived: 100, change: 0 });
    });
    expect(supabase.rpc).not.toHaveBeenCalledWith('pos_complete_sale', expect.anything());
    expect(syncManager.getQueueStatus().pending).toBe(1);
  });

  it('rejects sale when RPC returns STOCK_INSUFFICIENT (rollback contract)', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: { message: 'STOCK_INSUFFICIENT: stock insuficiente para produto' },
    });
    const { result } = renderHook(() => useLocalPOS(), { wrapper });
    await waitForReady(result);
    act(() => { result.current.addToCart(result.current.products[0]); });
    let sale: any;
    await act(async () => {
      sale = await result.current.completeSale({ method: 'cash', amountReceived: 100, change: 0 });
    });
    expect(sale).toBeNull();
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });
});
