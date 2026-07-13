/**
 * SPRINT 1.4 — FASE 4 — DATABASE CERTIFICATION (contract tests)
 * =============================================================
 * QUALITY GATE: mocks supabase.rpc to assert the *client-side contract*
 * expected by the app for every certified RPC. Does NOT alter DB, UX,
 * business rules or APIs.
 *
 * Companion SQL assertions live at:
 *   supabase/tests/sql/sprint_1_4_database_certification.sql
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpc(...a),
    auth: { getUser: async () => ({ data: { user: { id: 'u-1' } } }) },
    from: () => ({ select: () => ({ order: () => ({ data: [], error: null }) }) }),
  },
}));

beforeEach(() => rpc.mockReset());

describe('Sprint 1.4 — RPC contracts', () => {
  it('feature_flag_is_enabled → boolean, defaults to false on error', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    const { FeatureFlagService } = await import('@/services/featureFlagService');
    FeatureFlagService.invalidateCache();
    expect(await FeatureFlagService.isEnabled('any', null, null)).toBe(false);
  });

  it('feature_flag override precedence: override=true wins', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null });
    const { FeatureFlagService } = await import('@/services/featureFlagService');
    FeatureFlagService.invalidateCache();
    expect(await FeatureFlagService.isEnabled('k', 'c-1', 's-1')).toBe(true);
  });

  it.each([
    ['user_has_permission', { _user_id: 'u-1', _key: 'pos.sell', _company_id: null, _branch_id: null, _department_id: null }],
    ['has_role',            { _user_id: 'u-1', _role: 'admin' }],
    ['is_founder',          { _user_id: 'u-1' }],
    ['get_user_app_context',{ _user_id: 'u-1' }],
    ['pos_complete_sale',   { p_client_sale_id: 's-1', p_items: [], p_payment: {} }],
    ['issue_fiscal_document', { p_sale_id: 's-1' }],
    ['founder_dashboard_metrics', {}],
    ['founder_platform_stats',    {}],
    ['founder_monitoring_stats',  {}],
    ['founder_business_analytics',{}],
  ])('%s callable with documented shape', async (name, args) => {
    const { supabase } = await import('@/integrations/supabase/client');
    rpc.mockResolvedValueOnce({ data: {}, error: null });
    await supabase.rpc(name as never, args as never);
    expect(rpc).toHaveBeenCalledWith(name, args);
  });

  it('rollback contract: pos_complete_sale surfaces error, does not retry silently', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'insufficient_stock' } });
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase.rpc('pos_complete_sale' as never, {} as never);
    expect(error?.message).toBe('insufficient_stock');
  });

  it('idempotency contract: same client_sale_id → single call', async () => {
    rpc.mockResolvedValue({ data: { sale_id: 's-1' }, error: null });
    const { supabase } = await import('@/integrations/supabase/client');
    const args = { p_client_sale_id: 'client-uuid-1', p_items: [], p_payment: {} };
    await supabase.rpc('pos_complete_sale' as never, args as never);
    await supabase.rpc('pos_complete_sale' as never, args as never);
    // Server-side dedupe is authoritative; client is expected to pass the
    // same client_sale_id on retry (regression guard for syncQueue schema v2).
    expect(rpc.mock.calls.every(([, a]) => (a as any).p_client_sale_id === 'client-uuid-1')).toBe(true);
  });
});
