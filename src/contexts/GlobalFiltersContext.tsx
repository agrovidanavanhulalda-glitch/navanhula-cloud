import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

export type PeriodKey = '7d' | '30d' | '90d' | '365d' | 'all' | 'custom';

export interface GlobalFilters {
  period: PeriodKey;
  from: Date | null;
  to: Date | null;
  seller: string | 'all';
  stage: string | 'all';
}

interface Ctx {
  filters: GlobalFilters;
  setPeriod: (p: PeriodKey) => void;
  setRange: (from: Date | null, to: Date | null) => void;
  setSeller: (s: string) => void;
  setStage: (s: string) => void;
  reset: () => void;
  range: { from: Date | null; to: Date | null };
}

const initial: GlobalFilters = { period: '30d', from: null, to: null, seller: 'all', stage: 'all' };

const GlobalFiltersContext = createContext<Ctx | undefined>(undefined);

function computeRange(period: PeriodKey, from: Date | null, to: Date | null) {
  if (period === 'custom') return { from, to };
  if (period === 'all') return { from: null, to: null };
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: start, to: now };
}

export const GlobalFiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<GlobalFilters>(initial);

  const setPeriod = useCallback((period: PeriodKey) => setFilters(f => ({ ...f, period })), []);
  const setRange = useCallback((from: Date | null, to: Date | null) =>
    setFilters(f => ({ ...f, period: 'custom', from, to })), []);
  const setSeller = useCallback((seller: string) => setFilters(f => ({ ...f, seller })), []);
  const setStage = useCallback((stage: string) => setFilters(f => ({ ...f, stage })), []);
  const reset = useCallback(() => setFilters(initial), []);

  const range = useMemo(() => computeRange(filters.period, filters.from, filters.to), [filters]);

  return (
    <GlobalFiltersContext.Provider value={{ filters, setPeriod, setRange, setSeller, setStage, reset, range }}>
      {children}
    </GlobalFiltersContext.Provider>
  );
};

export function useGlobalFilters() {
  const ctx = useContext(GlobalFiltersContext);
  if (!ctx) throw new Error('useGlobalFilters must be used within GlobalFiltersProvider');
  return ctx;
}
