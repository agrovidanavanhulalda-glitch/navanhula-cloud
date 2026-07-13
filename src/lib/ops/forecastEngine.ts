/**
 * Sprint 3.4 · Forecast Engine (pure, read-only).
 * Linear projection from a current value and daily rate.
 * Never writes. No external dependencies.
 */

export type Horizon = 7 | 30 | 90 | 365;

export interface ForecastPoint {
  d7: number;
  d30: number;
  d90: number;
  d365: number;
}

export interface ForecastInput {
  current: number;
  perDay: number;
}

export interface PlatformForecast {
  companies: ForecastPoint;
  users: ForecastPoint;
  sales: ForecastPoint;
  revenue: ForecastPoint;
  fiscalDocs: ForecastPoint;
  storageGb: ForecastPoint;
  workers: ForecastPoint;
  telemetry: ForecastPoint;
}

export function project({ current, perDay }: ForecastInput): ForecastPoint {
  const rate = Math.max(0, perDay);
  return {
    d7: current + rate * 7,
    d30: current + rate * 30,
    d90: current + rate * 90,
    d365: current + rate * 365,
  };
}

export interface PlatformForecastInput {
  companies: ForecastInput;
  users: ForecastInput;
  sales: ForecastInput;
  revenue: ForecastInput;
  fiscalDocs: ForecastInput;
  storageGb: ForecastInput;
  workers: ForecastInput;
  telemetry: ForecastInput;
}

export function buildPlatformForecast(i: PlatformForecastInput): PlatformForecast {
  return {
    companies: project(i.companies),
    users: project(i.users),
    sales: project(i.sales),
    revenue: project(i.revenue),
    fiscalDocs: project(i.fiscalDocs),
    storageGb: project(i.storageGb),
    workers: project(i.workers),
    telemetry: project(i.telemetry),
  };
}
