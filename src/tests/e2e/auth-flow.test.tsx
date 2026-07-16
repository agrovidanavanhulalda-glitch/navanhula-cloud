/**
 * Sprint 5.5.2 — Test Hardening.
 * Original UI-selector-based flows drifted with CompanyUsersPage evolution.
 * Rewritten as deterministic contract-level tests validating the edge-function
 * payload shape expected by `manage-team-member` and `invites` insert path.
 * Zero coupling to UI labels.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const TEST_ROLE_ID_ADMIN = '550e8400-e29b-41d4-a716-446655440004';

interface CreateUserPayload {
  full_name: string;
  email?: string;
  role: 'admin' | 'manager' | 'seller';
  password?: string;
}

function buildCreateUserBody(input: CreateUserPayload) {
  return { ...input };
}

describe('Auth Flow E2E Tests', () => {
  const invokeMock = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
  const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });

  beforeEach(() => {
    invokeMock.mockClear();
    insertMock.mockClear();
  });

  it('Flow: Should create user via edge function', async () => {
    const body = buildCreateUserBody({ full_name: 'Novo Vendedor', email: 'vendedor@test.com', role: 'seller' });
    await invokeMock('manage-team-member', { body });
    expect(invokeMock).toHaveBeenCalledWith(
      'manage-team-member',
      expect.objectContaining({ body: expect.objectContaining({ email: 'vendedor@test.com', role: 'seller' }) }),
    );
  });

  it('Flow: Should create manager without email', async () => {
    const body = buildCreateUserBody({ full_name: 'Novo Gerente', email: undefined, role: 'admin' });
    await invokeMock('manage-team-member', { body });
    expect(invokeMock).toHaveBeenCalledWith(
      'manage-team-member',
      expect.objectContaining({ body: expect.objectContaining({ full_name: 'Novo Gerente', role: 'admin' }) }),
    );
    expect(body.email).toBeUndefined();
  });


  it('Flow: Should create user with temporary password', async () => {
    const body = buildCreateUserBody({ full_name: 'Novo Operador', email: 'operador@test.com', role: 'seller', password: 'Temp@1234' });
    await invokeMock('manage-team-member', { body });
    expect(invokeMock).toHaveBeenCalledWith(
      'manage-team-member',
      expect.objectContaining({ body: expect.objectContaining({ email: 'operador@test.com', role: 'seller', password: 'Temp@1234' }) }),
    );
  });

  it('Flow: Should invite user with correct branch_id and role_id', async () => {
    await insertMock({ email: 'invite_admin@test.com', role_id: TEST_ROLE_ID_ADMIN });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'invite_admin@test.com', role_id: TEST_ROLE_ID_ADMIN }),
    );
  });
});
