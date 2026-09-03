/**
 * Sprint 11.4 · Fase 2 — releaseBodyLocks / withCleanup deterministic tests.
 * Asserts the FINAL state of document.body; requestAnimationFrame is stubbed to
 * run synchronously so no timing hack is needed to make assertions pass.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { releaseBodyLocks, withCleanup } from './dom-utils';

const body = () => document.body;

const applyRadixLocks = () => {
  body().style.pointerEvents = 'none';
  body().style.overflow = 'hidden';
  body().setAttribute('data-scroll-locked', '1');
};

const expectClean = () => {
  expect(body().style.pointerEvents).toBe('');
  expect(body().style.overflow).toBe('');
  expect(body().hasAttribute('data-scroll-locked')).toBe(false);
};

beforeEach(() => {
  body().removeAttribute('style');
  body().removeAttribute('data-scroll-locked');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('releaseBodyLocks', () => {
  it('removes pointer-events, overflow and data-scroll-locked', () => {
    applyRadixLocks();
    releaseBodyLocks();
    expectClean();
  });

  it('is idempotent across multiple calls', () => {
    applyRadixLocks();
    releaseBodyLocks();
    releaseBodyLocks();
    releaseBodyLocks();
    expectClean();
  });

  it('does not throw when no locks are present', () => {
    expect(() => releaseBodyLocks()).not.toThrow();
    expectClean();
  });

  it('leaves no residual inline style/attributes on body', () => {
    applyRadixLocks();
    releaseBodyLocks();
    expect(body().style.cssText).not.toMatch(/pointer-events|overflow/);
    expect(body().getAttributeNames()).not.toContain('data-scroll-locked');
  });

  it('does not touch unrelated body styles/attributes', () => {
    body().style.backgroundColor = 'red';
    body().setAttribute('data-theme', 'dark');
    applyRadixLocks();
    releaseBodyLocks();
    expect(body().style.backgroundColor).toBe('red');
    expect(body().getAttribute('data-theme')).toBe('dark');
    expectClean();
  });

  it('forces pointer-events back to auto if removeProperty is ineffective', () => {
    const style = body().style;
    style.pointerEvents = 'none';
    // Simulate a style engine where removeProperty is a no-op for pointer-events.
    const original = style.removeProperty.bind(style);
    vi.spyOn(style, 'removeProperty').mockImplementation((prop: string) => {
      if (prop === 'pointer-events') return 'none';
      return original(prop);
    });
    releaseBodyLocks();
    expect(style.pointerEvents).toBe('auto');
  });

  it('is safe when document is undefined (SSR guard)', () => {
    const doc = globalThis.document;
    // simulate non-DOM environment
    delete (globalThis as any).document;
    try {
      expect(() => releaseBodyLocks()).not.toThrow();
    } finally {
      (globalThis as any).document = doc;
    }
  });
});

describe('withCleanup', () => {
  beforeEach(() => {
    // Deterministic: run rAF callbacks synchronously.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 1; });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns the wrapped value and releases locks after success', async () => {
    applyRadixLocks();
    const result = await withCleanup(async () => 'ok');
    expect(result).toBe('ok');
    expectClean();
  });

  it('releases locks even when the wrapped fn rejects, and rethrows', async () => {
    applyRadixLocks();
    await expect(withCleanup(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expectClean();
  });

  it('releases locks applied DURING the async operation (dialog unmount race)', async () => {
    // Body is clean before; locks are (re)applied while awaiting, as Radix does
    // when a parent re-renders mid-animation.
    const result = await withCleanup(async () => {
      applyRadixLocks();
      await Promise.resolve();
      applyRadixLocks();
      return 42;
    });
    expect(result).toBe(42);
    expectClean();
  });

  it('final state is clean even without relying on rAF (rAF disabled)', async () => {
    vi.stubGlobal('requestAnimationFrame', () => 0); // never fires
    applyRadixLocks();
    await withCleanup(async () => undefined);
    expectClean();
  });

  it('concurrent withCleanup calls do not leave locks behind', async () => {
    await Promise.all([
      withCleanup(async () => { applyRadixLocks(); await Promise.resolve(); }),
      withCleanup(async () => { applyRadixLocks(); }),
      withCleanup(async () => { await Promise.resolve(); applyRadixLocks(); }),
    ]);
    expectClean();
  });
});
