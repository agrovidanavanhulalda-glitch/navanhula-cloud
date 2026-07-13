/**
 * Sprint 3.2 · Growth Analytics (pure).
 */
import type { HistoricalSlice, Window } from './historicalEngine';

export interface GrowthMetrics {
  daily: number;
  weekly: number;
  monthly: number;
  quarterly: number;
  yearly: number;
  compound: number;
  movingAvg7d: number;
  trend: 'up' | 'down' | 'flat';
  momentum: number;
  acceleration: number;
}

export function computeGrowth(s: HistoricalSlice): GrowthMetrics {
  const daily = s.byWindow['24h'];
  const weekly = s.byWindow['7d'];
  const monthly = s.byWindow['30d'];
  const quarterly = s.byWindow['90d'];
  const yearly = s.byWindow['365d'];
  const perDay = monthly / 30;
  const movingAvg7d = weekly / 7;
  const prevWeek = Math.max(0, monthly - weekly);
  const prevAvg = prevWeek / 23;
  const momentum = movingAvg7d - prevAvg;
  const acceleration = daily - movingAvg7d;
  const trend: GrowthMetrics['trend'] =
    momentum > 0.1 ? 'up' : momentum < -0.1 ? 'down' : 'flat';
  const compound = yearly > 0 ? Math.pow(1 + perDay / Math.max(1, s.total), 365) - 1 : 0;
  return { daily, weekly, monthly, quarterly, yearly, compound, movingAvg7d, trend, momentum, acceleration };
}

export function projectPerCompanyScale(currentPerDay: number, currentCompanies: number, targetCompanies: number) {
  if (currentCompanies <= 0) return 0;
  return (currentPerDay / currentCompanies) * targetCompanies;
}

export const CAPACITY_TARGETS = [100, 1_000, 10_000, 50_000, 100_000];

export function computeCapacityMatrix(perDay: number, companies: number) {
  return CAPACITY_TARGETS.map((t) => ({
    companies: t,
    perDay: projectPerCompanyScale(perDay, companies, t),
    perMonth: projectPerCompanyScale(perDay, companies, t) * 30,
    perYear: projectPerCompanyScale(perDay, companies, t) * 365,
  }));
}

export type WindowLabel = Record<Window, string>;
