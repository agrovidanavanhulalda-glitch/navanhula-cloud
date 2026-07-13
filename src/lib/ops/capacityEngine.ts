/**
 * Sprint 3.0 · Capacity Engine (read-only, pure functions).
 * Linear projections from current growth rates. Never writes.
 */

export interface GrowthInput {
  /** Current cumulative value (e.g. bytes, rows). */
  current: number;
  /** Growth measured over the last N days. */
  deltaLastNDays: number;
  daysWindow: number;
}

export interface CapacityForecast {
  current: number;
  perDay: number;
  d30: number;
  d90: number;
  d180: number;
  d365: number;
}

export function forecast({ current, deltaLastNDays, daysWindow }: GrowthInput): CapacityForecast {
  const perDay = daysWindow > 0 ? Math.max(0, deltaLastNDays / daysWindow) : 0;
  return {
    current,
    perDay,
    d30: current + perDay * 30,
    d90: current + perDay * 90,
    d180: current + perDay * 180,
    d365: current + perDay * 365,
  };
}

export interface CapacityMatrix {
  database: CapacityForecast;
  storage: CapacityForecast;
  logs: CapacityForecast;
  fiscalArtifacts: CapacityForecast;
  backgroundTasks: CapacityForecast;
  realtimeChannels: CapacityForecast;
}
