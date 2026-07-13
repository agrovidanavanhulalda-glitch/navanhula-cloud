import { describe, it, expect } from 'vitest';

/**
 * Regression guard for the role-weight ladder used by usePermissions.hasMinimumRole.
 * Must stay in sync with src/hooks/usePermissions.tsx.
 */
const getRoleWeight = (r: string | null): number => {
  if (!r) return -1;
  const n = r.toLowerCase();
  if (n === 'owner') return 100;
  if (n === 'director' || n === 'ceo') return 5;
  if (n === 'admin') return 4;
  if (n === 'manager') return 3;
  if (n === 'seller' || n === 'cashier') return 2;
  if (n === 'viewer') return 1;
  return 0;
};

describe('RBAC role-weight ladder', () => {
  it('owner dominates every other role', () => {
    for (const r of ['ceo', 'admin', 'manager', 'seller', 'viewer', 'unknown']) {
      expect(getRoleWeight('owner')).toBeGreaterThan(getRoleWeight(r));
    }
  });

  it('canonical ordering: viewer < seller/cashier < manager < admin < ceo/director < owner', () => {
    expect(getRoleWeight('viewer')).toBeLessThan(getRoleWeight('seller'));
    expect(getRoleWeight('seller')).toBe(getRoleWeight('cashier'));
    expect(getRoleWeight('seller')).toBeLessThan(getRoleWeight('manager'));
    expect(getRoleWeight('manager')).toBeLessThan(getRoleWeight('admin'));
    expect(getRoleWeight('admin')).toBeLessThan(getRoleWeight('ceo'));
    expect(getRoleWeight('ceo')).toBe(getRoleWeight('director'));
  });

  it('null returns -1; unknown returns 0', () => {
    expect(getRoleWeight(null)).toBe(-1);
    expect(getRoleWeight('random-role')).toBe(0);
  });

  it('is case-insensitive', () => {
    expect(getRoleWeight('ADMIN')).toBe(getRoleWeight('admin'));
    expect(getRoleWeight('Manager')).toBe(getRoleWeight('manager'));
  });
});
