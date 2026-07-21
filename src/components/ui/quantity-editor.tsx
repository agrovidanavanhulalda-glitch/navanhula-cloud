import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuantityEditorProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
  className?: string;
  size?: 'md' | 'lg';
  disabled?: boolean;
}

/**
 * Enterprise quantity editor (Square POS style).
 * - Min 160×52, buttons 44×44 (touch AA).
 * - Number is fully editable: click → clear → type → Enter/blur to confirm.
 * - Mirrors the "Cotações" module behaviour for consistency.
 */
export const QuantityEditor: React.FC<QuantityEditorProps> = ({
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  ariaLabel = 'Quantidade',
  className,
  size = 'md',
  disabled,
}) => {
  const [draft, setDraft] = useState<string>(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external changes when the field isn't being edited.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDraft(String(value));
    }
  }, [value]);

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (isNaN(n)) {
      setDraft(String(value));
      return;
    }
    let next = n;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    if (next !== value) onChange(next);
    setDraft(String(next));
  };

  const dec = () => {
    if (disabled) return;
    const next = Math.max(min, value - step);
    if (next !== value) onChange(next);
    setDraft(String(next));
  };
  const inc = () => {
    if (disabled) return;
    const next = max !== undefined ? Math.min(max, value + step) : value + step;
    if (next !== value) onChange(next);
    setDraft(String(next));
  };

  const dims = size === 'lg'
    ? { wrap: 'min-w-[176px] h-[56px] p-1', btn: 'h-12 w-12', input: 'h-12 min-w-[64px] text-[18px]' }
    : { wrap: 'min-w-[160px] h-[52px] p-1', btn: 'h-11 w-11', input: 'h-11 min-w-[56px] text-[17px]' };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 bg-slate-100/80 rounded-xl border border-slate-200/70',
        dims.wrap,
        disabled && 'opacity-60',
        className,
      )}
    >
      <button
        type="button"
        aria-label="Diminuir quantidade"
        onClick={dec}
        disabled={disabled || value <= min}
        className={cn(
          'rounded-lg flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-sm hover:text-[#0B1F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F3A]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all',
          dims.btn,
        )}
      >
        <Minus className="w-4 h-4" strokeWidth={2.5} />
      </button>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d]/g, '');
          setDraft(v);
        }}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            setDraft(String(value));
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            inc();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            dec();
          }
        }}
        aria-label={ariaLabel}
        className={cn(
          'flex-1 bg-transparent text-center font-bold tabular-nums text-[#0B1F3A] border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F3A]/30 rounded-md px-1',
          dims.input,
        )}
      />
      <button
        type="button"
        aria-label="Aumentar quantidade"
        onClick={inc}
        disabled={disabled || (max !== undefined && value >= max)}
        className={cn(
          'rounded-lg flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-sm hover:text-[#0B1F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F3A]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all',
          dims.btn,
        )}
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default QuantityEditor;
