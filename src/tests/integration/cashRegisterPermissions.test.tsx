/**
 * Sprint 11.4 · Fase 6 — Cash Register permissions (P0-003).
 * Renders the real LocalCashRegisterPage against mocked contexts and asserts
 * the OPEN / CLOSE gating rules for operator, supervisor, admin, cash.close_any.
 * No real accounts, no backend.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const OWNER = 'user-owner';
const OTHER = 'user-other';
const ST = 'store-A';
const CR = 'cr-1';

const h = vi.hoisted(() => ({
  auth: { current: null as any },
  pos: { current: null as any },
  team: { current: { activeMembers: [] as any[] } },
  teamOpts: { last: null as any },
  navigate: vi.fn(),
  closeCashRegister: vi.fn(),
  openCashRegister: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => h.auth.current }));
vi.mock('@/contexts/LocalPOSContext', () => ({ useLocalPOS: () => h.pos.current }));
vi.mock('@/hooks/useTeamMembers', () => ({
  useTeamMembers: (opts: any) => { h.teamOpts.last = opts; return h.team.current; },
}));
vi.mock('@/hooks/useOnboarding', () => ({ useOnboarding: () => ({ updateStep: vi.fn() }) }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, useNavigate: () => h.navigate };
});
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

import LocalCashRegisterPage from '@/pages/LocalCashRegisterPage';
import { toast } from 'sonner';

type Actor = { id: string; role: string; perms: string[] };
const OPERATOR_OWNER: Actor = { id: OWNER, role: 'seller', perms: ['cash.open'] };
const OPERATOR_OTHER: Actor = { id: OTHER, role: 'seller', perms: ['cash.open'] };
const SUPERVISOR_CLOSE_ANY: Actor = { id: OTHER, role: 'seller', perms: ['cash.open', 'cash.close_any'] };
const SUPERVISOR_NO_CLOSE_ANY: Actor = { id: OTHER, role: 'seller', perms: ['cash.open', 'cash.view'] };
const ADMIN_OTHER: Actor = { id: OTHER, role: 'admin', perms: [] };
const MANAGER_OTHER: Actor = { id: OTHER, role: 'manager', perms: [] };
const NO_PERMS_OTHER: Actor = { id: OTHER, role: 'viewer', perms: [] };

const setActor = (a: Actor) => {
  h.auth.current = {
    user: { id: a.id, full_name: 'X', email: 'x@t.mz' },
    role: a.role,
    roles: [a.role],
    company: { id: 'co-1', name: 'Co' },
    branch: { id: 'br-1', name: 'Filial' },
    appReady: true,
    hasPerm: (k: string) => a.perms.includes(k),
  };
};

const setRegister = (open: boolean, sellerId = OWNER) => {
  h.pos.current = {
    currentStore: { id: ST, name: 'Loja A' },
    currentCashRegister: open
      ? { id: CR, storeId: ST, sellerId, sellerName: 'Dono', openingAmount: 1000, status: 'open', openedAt: new Date(), expectedAmount: 1000 }
      : null,
    cashRegisters: [],
    openCashRegister: h.openCashRegister,
    closeCashRegister: h.closeCashRegister,
  };
};

const attemptClose = async (amount = '1500') => {
  render(<LocalCashRegisterPage />);
  fireEvent.click(screen.getByRole('button', { name: /Fechar Caixa/i }));
  const input = await screen.findByLabelText(/valor/i).catch(() => document.getElementById('closingAmount') as HTMLElement);
  fireEvent.change(input as HTMLElement, { target: { value: amount } });
  const buttons = screen.getAllByRole('button', { name: /Fechar Caixa/i });
  await act(async () => { fireEvent.click(buttons[buttons.length - 1]); });
};

beforeEach(() => {
  vi.clearAllMocks();
  h.closeCashRegister.mockResolvedValue(undefined);
  h.openCashRegister.mockResolvedValue({ id: CR });
  h.team.current = { activeMembers: [] };
  document.body.removeAttribute('style');
  document.body.removeAttribute('data-scroll-locked');
});

describe('Fase 6 — CLOSE gating (P0-003)', () => {
  it('owner operator (cash.open only) CAN close own register', async () => {
    setActor(OPERATOR_OWNER); setRegister(true, OWNER);
    await attemptClose('1500');
    await waitFor(() => expect(h.closeCashRegister).toHaveBeenCalledWith(1500));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('non-owner operator without cash.close_any is BLOCKED', async () => {
    setActor(OPERATOR_OTHER); setRegister(true, OWNER);
    await attemptClose();
    expect(h.closeCashRegister).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Apenas o operador que abriu o caixa/i));
  });

  it('supervisor WITH cash.close_any CAN close another operator register', async () => {
    setActor(SUPERVISOR_CLOSE_ANY); setRegister(true, OWNER);
    await attemptClose('1200');
    await waitFor(() => expect(h.closeCashRegister).toHaveBeenCalledWith(1200));
  });

  it('supervisor WITHOUT cash.close_any (only cash.open/cash.view) is BLOCKED', async () => {
    setActor(SUPERVISOR_NO_CLOSE_ANY); setRegister(true, OWNER);
    await attemptClose();
    expect(h.closeCashRegister).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('admin role bypasses ownership even with no granular perms', async () => {
    setActor(ADMIN_OTHER); setRegister(true, OWNER);
    await attemptClose('900');
    await waitFor(() => expect(h.closeCashRegister).toHaveBeenCalledWith(900));
  });

  it('manager role bypasses ownership (role-based admin set)', async () => {
    setActor(MANAGER_OTHER); setRegister(true, OWNER);
    await attemptClose('900');
    await waitFor(() => expect(h.closeCashRegister).toHaveBeenCalledWith(900));
  });

  it('user with no perms and non-admin role is BLOCKED', async () => {
    setActor(NO_PERMS_OTHER); setRegister(true, OWNER);
    await attemptClose();
    expect(h.closeCashRegister).not.toHaveBeenCalled();
  });

  it('invalid closing amount is rejected before any permission/close logic', async () => {
    setActor(ADMIN_OTHER); setRegister(true, OWNER);
    await attemptClose('');
    expect(h.closeCashRegister).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/valor de fechamento/i));
  });

  it('after a successful close, body has no residual pointer-events/scroll locks (P0-001/002)', async () => {
    setActor(OPERATOR_OWNER); setRegister(true, OWNER);
    await attemptClose('1500');
    await waitFor(() => expect(h.closeCashRegister).toHaveBeenCalled());
    await waitFor(() => {
      expect(document.body.style.pointerEvents).not.toBe('none');
      expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
    });
  });

  it('close failure surfaces an error toast and still clears body locks', async () => {
    setActor(OPERATOR_OWNER); setRegister(true, OWNER);
    h.closeCashRegister.mockRejectedValueOnce(new Error('offline-db'));
    await attemptClose('1500');
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Falha ao fechar caixa'));
    expect(document.body.style.pointerEvents).not.toBe('none');
  });
});

describe('Fase 6 — OPEN gating (cash.open)', () => {
  it('operator list is sourced strictly from members holding cash.open', () => {
    setActor(OPERATOR_OWNER); setRegister(false);
    render(<LocalCashRegisterPage />);
    expect(h.teamOpts.last).toEqual(expect.objectContaining({ permission: 'cash.open', branchId: 'br-1' }));
  });

  it('with no cash.open operators the dialog explains it and OPEN is refused', async () => {
    setActor(ADMIN_OTHER); setRegister(false);
    render(<LocalCashRegisterPage />);
    fireEvent.click(screen.getByRole('button', { name: /Abrir Caixa/i }));
    expect(await screen.findByText(/Nenhum operador com permissão "cash.open"/i)).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: /Abrir Caixa/i });
    const submit = buttons[buttons.length - 1];
    expect(submit).toBeDisabled(); // UI-level gate
    await act(async () => { fireEvent.click(submit); });
    expect(h.openCashRegister).not.toHaveBeenCalled();
  });

  it('OPEN cannot be submitted without selecting an authorised operator even when members exist', async () => {
    setActor(OPERATOR_OWNER); setRegister(false);
    h.team.current = { activeMembers: [{ id: OWNER, name: 'Dono', email: null, role: 'seller', branchId: 'br-1', branchName: null, isActive: true, hasPermission: true }] };
    render(<LocalCashRegisterPage />);
    fireEvent.click(screen.getByRole('button', { name: /Abrir Caixa/i }));
    const buttons = await screen.findAllByRole('button', { name: /Abrir Caixa/i });
    const submit = buttons[buttons.length - 1];
    expect(submit).toBeDisabled(); // no operator selected → cannot submit
    await act(async () => { fireEvent.click(submit); });
    expect(h.openCashRegister).not.toHaveBeenCalled();
  });
});

describe('Fase 6 — OPEN/CLOSE rule consistency', () => {
  it('an operator authorised to OPEN (cash.open) is always able to CLOSE the session they own', async () => {
    // Consistency invariant: cash.open ⇒ can close OWN session (no extra perm needed).
    setActor({ id: OWNER, role: 'seller', perms: ['cash.open'] });
    setRegister(true, OWNER);
    await attemptClose('1000');
    await waitFor(() => expect(h.closeCashRegister).toHaveBeenCalledWith(1000));
  });

  it('cash.open alone never grants CLOSE over someone else\'s session', async () => {
    setActor({ id: OTHER, role: 'seller', perms: ['cash.open'] });
    setRegister(true, OWNER);
    await attemptClose('1000');
    expect(h.closeCashRegister).not.toHaveBeenCalled();
  });

  it('missing store context renders the safe empty state (no dialogs, no actions)', () => {
    setActor(OPERATOR_OWNER); setRegister(true);
    h.pos.current = { ...h.pos.current, currentStore: null };
    render(<LocalCashRegisterPage />);
    expect(screen.getByText(/Caixa indisponível/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Fechar Caixa/i })).toBeNull();
  });
});
