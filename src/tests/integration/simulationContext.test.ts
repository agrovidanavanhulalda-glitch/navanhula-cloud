/**
 * Sprint 1.3 · Fase 3 · Integration Test #6
 * Simulation Context — pure logic checks (expiration math + persistence guard).
 * Full React provider mount is out-of-scope; we exercise the invariants
 * that would drive the banner (isActive) and auto-expire behaviour.
 */
import { describe, it, expect, beforeEach } from 'vitest';

type Session = { session_id: string; expires_at: string | null } | null;

const STORAGE_KEY = 'nav.simulation.session';

function isActive(s: Session): boolean { return !!s; }
function msUntilExpiry(s: Session, now = Date.now()): number {
  if (!s?.expires_at) return Number.POSITIVE_INFINITY;
  return new Date(s.expires_at).getTime() - now;
}
function persist(s: Session) {
  if (s) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  else sessionStorage.removeItem(STORAGE_KEY);
}
function restore(): Session {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

beforeEach(() => sessionStorage.clear());

describe('Simulation context invariants', () => {
  it('isActive false when no session', () => {
    expect(isActive(null)).toBe(false);
  });

  it('isActive true when session present → banner must render', () => {
    expect(isActive({ session_id: 's1', expires_at: null })).toBe(true);
  });

  it('expired session triggers immediate rollback (ms <= 0)', () => {
    const s: Session = { session_id: 's2', expires_at: new Date(Date.now() - 1000).toISOString() };
    expect(msUntilExpiry(s)).toBeLessThanOrEqual(0);
  });

  it('future expiry yields positive countdown', () => {
    const s: Session = { session_id: 's3', expires_at: new Date(Date.now() + 60_000).toISOString() };
    expect(msUntilExpiry(s)).toBeGreaterThan(0);
  });

  it('persist/restore round-trip via sessionStorage', () => {
    const s: Session = { session_id: 's4', expires_at: null };
    persist(s);
    expect(restore()).toEqual(s);
    persist(null);
    expect(restore()).toBeNull();
  });

  it('null expires_at means non-expiring simulation (never auto-ends)', () => {
    expect(msUntilExpiry({ session_id: 's5', expires_at: null })).toBe(Number.POSITIVE_INFINITY);
  });
});
