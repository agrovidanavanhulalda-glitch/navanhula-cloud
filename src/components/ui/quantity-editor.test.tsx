/**
 * Sprint 11.4 · Fase 1 — QuantityEditor deterministic coverage (JSDOM).
 * Validates state invariants and emitted values, not just call counts.
 * Uses fireEvent only (no extra deps).
 */
import { describe, it, expect, vi } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QuantityEditor, QuantityEditorProps } from './quantity-editor';

const setup = (props: Partial<QuantityEditorProps> = {}) => {
  const onChange = vi.fn();
  const utils = render(<QuantityEditor value={3} onChange={onChange} {...props} />);
  const input = screen.getByRole('textbox', { name: props.ariaLabel ?? 'Quantidade' }) as HTMLInputElement;
  const dec = screen.getByRole('button', { name: 'Diminuir quantidade' }) as HTMLButtonElement;
  const inc = screen.getByRole('button', { name: 'Aumentar quantidade' }) as HTMLButtonElement;
  return { ...utils, onChange, input, dec, inc };
};

/** Simulates a user editing the field: focus, type text, then optional key. */
const typeInto = (input: HTMLInputElement, text: string) => {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
};
const pressKey = (input: HTMLInputElement, key: string) => fireEvent.keyDown(input, { key });

/** Controlled harness — mirrors real usage where the parent owns the value. */
const Controlled: React.FC<Partial<QuantityEditorProps> & { initial?: number; spy?: (n: number) => void }> = ({
  initial = 3,
  spy,
  ...rest
}) => {
  const [v, setV] = useState(initial);
  return (
    <>
      <QuantityEditor value={v} onChange={(n) => { spy?.(n); setV(n); }} {...rest} />
      <button onClick={() => setV(42)}>external</button>
      <span data-testid="parent-value">{v}</span>
    </>
  );
};

describe('QuantityEditor — rendering & a11y', () => {
  it('renders initial value and aria-labels (group + input + buttons)', () => {
    const { input } = setup({ value: 7 });
    expect(input.value).toBe('7');
    expect(screen.getByRole('group', { name: 'Quantidade' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Diminuir quantidade' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aumentar quantidade' })).toBeInTheDocument();
  });

  it('propagates a custom ariaLabel to group and input', () => {
    setup({ ariaLabel: 'Qtd Arroz' });
    expect(screen.getByRole('group', { name: 'Qtd Arroz' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Qtd Arroz' })).toBeInTheDocument();
  });

  it('exposes visible focus styles (focus-visible ring) on input and buttons', () => {
    const { input, dec, inc } = setup();
    for (const el of [input, dec, inc]) {
      expect(el.className).toMatch(/focus-visible:ring-2/);
    }
  });

  it('input is numeric-only (inputMode numeric, pattern digits)', () => {
    const { input } = setup();
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('pattern', '[0-9]*');
  });

  it('input is focusable and receives focus on click', () => {
    const { input } = setup();
    input.focus();
    expect(document.activeElement).toBe(input);
  });
});

describe('QuantityEditor — manual editing', () => {
  it('selects the current value on focus (click → select all)', () => {
    const { input } = setup({ value: 12 });
    const selectSpy = vi.spyOn(input, 'select');
    fireEvent.focus(input);
    expect(selectSpy).toHaveBeenCalled();
  });

  it('Enter confirms the typed value, blurs, and only ever emits the committed value', () => {
    const { input, onChange } = setup({ value: 3 });
    input.focus();
    typeInto(input, '9');
    pressKey(input, 'Enter');
    // DOCUMENTED: Enter → commit() then blur() → onBlur commits again before the
    // parent re-renders, so onChange may fire twice with the SAME value. The
    // invariant that matters: every emission equals 9 (idempotent, no drift).
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.every(c => c[0] === 9)).toBe(true);
    expect(input.value).toBe('9');
    expect(document.activeElement).not.toBe(input);
  });

  it('Blur confirms the typed value', () => {
    const { input, onChange } = setup({ value: 3 });
    typeInto(input, '5');
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(5);
    expect(input.value).toBe('5');
  });

  it('Escape cancels the draft and restores the committed value without emitting', () => {
    const { input, onChange } = setup({ value: 3 });
    typeInto(input, '77');
    expect(input.value).toBe('77');
    pressKey(input, 'Escape');
    expect(input.value).toBe('3');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('strips non-numeric characters while typing', () => {
    const { input } = setup({ value: 3 });
    typeInto(input, '1a2b.3');
    expect(input.value).toBe('123');
  });

  it('empty / invalid draft on commit restores previous value and emits nothing', () => {
    const { input, onChange } = setup({ value: 4 });
    typeInto(input, '');
    pressKey(input, 'Enter');
    expect(input.value).toBe('4');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not emit onChange when committed value equals current value', () => {
    const { input, onChange } = setup({ value: 4 });
    typeInto(input, '4');
    pressKey(input, 'Enter');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('QuantityEditor — bounds', () => {
  it('clamps typed value to min (default 1)', () => {
    const { input, onChange } = setup({ value: 5 });
    typeInto(input, '0');
    pressKey(input, 'Enter');
    expect(onChange).toHaveBeenCalledWith(1);
    expect(input.value).toBe('1');
  });

  it('clamps typed value to custom min', () => {
    const { input, onChange } = setup({ value: 5, min: 2 });
    typeInto(input, '1');
    pressKey(input, 'Enter');
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('clamps typed value to max when defined', () => {
    const { input, onChange } = setup({ value: 5, max: 10 });
    typeInto(input, '999');
    pressKey(input, 'Enter');
    expect(onChange).toHaveBeenCalledWith(10);
    expect(input.value).toBe('10');
  });

  it('has no upper bound when max is undefined', () => {
    const { input, onChange } = setup({ value: 5 });
    typeInto(input, '5000');
    pressKey(input, 'Enter');
    expect(onChange).toHaveBeenCalledWith(5000);
  });

  it('decrement button is disabled at min; increment disabled at max', () => {
    const { dec, inc } = setup({ value: 1, min: 1, max: 1 });
    expect(dec).toBeDisabled();
    expect(inc).toBeDisabled();
  });

  it('never emits values below min or above max via buttons', () => {
    const onChange = vi.fn();
    const { rerender } = render(<QuantityEditor value={1} onChange={onChange} min={1} max={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Diminuir quantidade' }));
    expect(onChange).not.toHaveBeenCalled();
    rerender(<QuantityEditor value={2} onChange={onChange} min={1} max={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar quantidade' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('QuantityEditor — buttons & keyboard steps', () => {
  it('increment button emits value + step', () => {
    const { inc, onChange } = setup({ value: 3 });
    fireEvent.click(inc);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('decrement button emits value - step', () => {
    const { dec, onChange } = setup({ value: 3 });
    fireEvent.click(dec);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('respects custom step', () => {
    const { inc, dec, onChange } = setup({ value: 10, step: 5 });
    fireEvent.click(inc);
    fireEvent.click(dec);
    expect(onChange.mock.calls.map(c => c[0])).toEqual([15, 5]);
  });

  it('ArrowUp increments and ArrowDown decrements from the input', () => {
    const { input, onChange } = setup({ value: 3 });
    pressKey(input, 'ArrowUp');
    expect(onChange).toHaveBeenLastCalledWith(4);
    pressKey(input, 'ArrowDown');
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('ArrowDown at min and ArrowUp at max are no-ops', () => {
    const { input, onChange } = setup({ value: 1, min: 1, max: 1 });
    pressKey(input, 'ArrowDown');
    pressKey(input, 'ArrowUp');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disabled: buttons and input are inert, no onChange emitted', () => {
    const { inc, dec, input, onChange } = setup({ value: 3, disabled: true });
    expect(inc).toBeDisabled();
    expect(dec).toBeDisabled();
    expect(input).toBeDisabled();
    fireEvent.click(inc);
    fireEvent.click(dec);
    pressKey(input, 'ArrowUp');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('QuantityEditor — controlled behaviour & external changes', () => {
  it('reflects an external value change when not being edited', () => {
    render(<Controlled initial={3} />);
    const input = screen.getByRole('textbox', { name: 'Quantidade' }) as HTMLInputElement;
    expect(input.value).toBe('3');
    fireEvent.click(screen.getByText('external'));
    expect(input.value).toBe('42');
  });

  it('does NOT clobber an in-progress draft when the value changes externally', async () => {
    render(<Controlled initial={3} />);
    const input = screen.getByRole('textbox', { name: 'Quantidade' }) as HTMLInputElement;
    input.focus();
    typeInto(input, '8');
    // parent updates while input is focused
    await act(async () => { fireEvent.click(screen.getByText('external')); });
    expect(input.value).toBe('8');
    expect(document.activeElement).toBe(input);
  });

  it('full controlled round-trip: type → Enter → parent state updated → input in sync', () => {
    const spy = vi.fn();
    render(<Controlled initial={3} spy={spy} />);
    const input = screen.getByRole('textbox', { name: 'Quantidade' }) as HTMLInputElement;
    typeInto(input, '6');
    pressKey(input, 'Enter');
    expect(spy).toHaveBeenCalledWith(6);
    expect(screen.getByTestId('parent-value').textContent).toBe('6');
    expect(input.value).toBe('6');
  });

  it('sequential button clicks in controlled mode produce monotonic values', () => {
    const spy = vi.fn();
    render(<Controlled initial={1} spy={spy} />);
    const inc = screen.getByRole('button', { name: 'Aumentar quantidade' });
    fireEvent.click(inc);
    fireEvent.click(inc);
    fireEvent.click(inc);
    expect(spy.mock.calls.map(c => c[0])).toEqual([2, 3, 4]);
    expect(screen.getByTestId('parent-value').textContent).toBe('4');
  });
});
