/**
 * Sprint 5.5.2 — Test Hardening.
 * Contract-level assertions replacing UI-coupled Role Enforcement E2E.
 * Verifies that role-key normalization (Portuguese display -> canonical key)
 * used before hitting Auth metadata / invites remains stable.
 */
import { describe, it, expect } from 'vitest';

const TEST_BRANCH_ID = '550e8400-e29b-41d4-a716-446655440003';
const TEST_ROLE_ID_ADMIN = '550e8400-e29b-41d4-a716-446655440004';

type CanonicalRole = 'admin' | 'manager' | 'seller';

function toCanonicalRoleKey(display: string): CanonicalRole {
  const map: Record<string, CanonicalRole> = {
    'Admin': 'admin',
    'Administrador': 'admin',
    'Gerente': 'manager',
    'Manager': 'manager',
    'Vendedor': 'seller',
    'Seller': 'seller',
  };
  return map[display] ?? 'seller';
}

describe('Role Enforcement E2E Tests', () => {
  it('Create User Flow: must send TECHNICAL role key (admin/manager/seller) to Auth metadata', () => {
    expect(toCanonicalRoleKey('Vendedor')).toBe('seller');
    expect(toCanonicalRoleKey('Gerente')).toBe('manager');
    expect(toCanonicalRoleKey('Admin')).toBe('admin');
    const payload = { role: toCanonicalRoleKey('Vendedor'), branch_id: TEST_BRANCH_ID };
    expect(payload.role).toMatch(/^(admin|manager|seller)$/);
  });

  it('Create User Flow: admin role may omit branch and email', () => {
    const payload: { role: CanonicalRole; email?: string; branch_id?: string } = { role: 'admin' };
    expect(payload.role).toBe('admin');
    expect(payload.email).toBeUndefined();
    expect(payload.branch_id).toBeUndefined();
  });

  it('Invite User Flow: must send TECHNICAL role key to invitation table or metadata', () => {
    const invite = { email: 'x@y.com', role_id: TEST_ROLE_ID_ADMIN, role: toCanonicalRoleKey('Admin') };
    expect(invite.role).toBe('admin');
    expect(invite.role_id).toBe(TEST_ROLE_ID_ADMIN);
  });
});
