/**
 * Sprint 1.3 · Fase 3 · Integration Test #5
 * Billing — subscription status derivation (active/warning/blocked/cancelled)
 * plus MRR/ARR aggregation math. Pure derivations from subscription rows,
 * no UI mounts; mirrors useSubscription's date logic.
 */
import { describe, it, expect } from 'vitest';

type Sub = {
  status: 'active' | 'cancelled';
  current_period_end: string;
  grace_period_days: number;
  price_monthly: number;
};

function deriveStatus(sub: Sub, now = new Date()): 'active' | 'warning' | 'blocked' | 'cancelled' {
  if (sub.status === 'cancelled') return 'cancelled';
  const end = new Date(sub.current_period_end);
  const graceEnd = new Date(end);
  graceEnd.setDate(graceEnd.getDate() + sub.grace_period_days);
  if (now <= end) return 'active';
  if (now <= graceEnd) return 'warning';
  return 'blocked';
}

function mrr(subs: Sub[]) {
  return subs
    .filter(s => s.status !== 'cancelled')
    .reduce((acc, s) => acc + s.price_monthly, 0);
}

function churnRate(activeStart: number, cancelledDuringPeriod: number) {
  if (activeStart === 0) return 0;
  return (cancelledDuringPeriod / activeStart) * 100;
}

describe('Billing lifecycle & metrics', () => {
  const base = { grace_period_days: 7, price_monthly: 1500, status: 'active' as const };

  it('active while inside period', () => {
    const s = { ...base, current_period_end: new Date(Date.now() + 5 * 86400_000).toISOString() };
    expect(deriveStatus(s)).toBe('active');
  });

  it('warning inside grace window after period end', () => {
    const s = { ...base, current_period_end: new Date(Date.now() - 2 * 86400_000).toISOString() };
    expect(deriveStatus(s)).toBe('warning');
  });

  it('blocked after grace expires', () => {
    const s = { ...base, current_period_end: new Date(Date.now() - 30 * 86400_000).toISOString() };
    expect(deriveStatus(s)).toBe('blocked');
  });

  it('cancelled overrides date math', () => {
    const s: Sub = { ...base, status: 'cancelled', current_period_end: new Date(Date.now() + 86400_000).toISOString() };
    expect(deriveStatus(s)).toBe('cancelled');
  });

  it('MRR sums active + warning + blocked (non-cancelled) subscriptions', () => {
    const now = Date.now();
    const subs: Sub[] = [
      { ...base, price_monthly: 750, current_period_end: new Date(now + 86400_000).toISOString() },
      { ...base, price_monthly: 1500, current_period_end: new Date(now - 30 * 86400_000).toISOString() }, // blocked
      { ...base, status: 'cancelled', price_monthly: 3500, current_period_end: new Date(now + 86400_000).toISOString() },
    ];
    expect(mrr(subs)).toBe(2250);
  });

  it('ARR = MRR × 12', () => {
    const subs: Sub[] = [{ ...base, price_monthly: 1500, current_period_end: new Date(Date.now() + 86400_000).toISOString() }];
    expect(mrr(subs) * 12).toBe(18000);
  });

  it('churn rate = cancelled / active_start × 100', () => {
    expect(churnRate(100, 5)).toBe(5);
    expect(churnRate(0, 3)).toBe(0);
  });
});
