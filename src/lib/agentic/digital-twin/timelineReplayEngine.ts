/**
 * Sprint 5.5 · Timeline Replay Engine (pure).
 */
export interface TimelineEvent {
  id: string;
  ts: string | number;
  kind: string;
  severity?: number; // 0-100
  message?: string;
}

export interface TimelineReplay {
  events: Array<Required<Omit<TimelineEvent, 'ts'>> & { ts: number }>;
  count: number;
  maxSeverity: number;
  span: { first: number | null; last: number | null };
}

export function replayTimeline(events: TimelineEvent[] = []): TimelineReplay {
  const list = (Array.isArray(events) ? events : [])
    .map((e) => {
      const ts = typeof e.ts === 'number' ? e.ts : Date.parse(String(e.ts ?? ''));
      return {
        id: String(e.id ?? ''),
        ts: Number.isFinite(ts) ? ts : 0,
        kind: String(e.kind ?? 'event'),
        severity: typeof e.severity === 'number' && Number.isFinite(e.severity) ? Math.max(0, Math.min(100, e.severity)) : 0,
        message: String(e.message ?? ''),
      };
    })
    .sort((a, b) => a.ts - b.ts);
  const maxSeverity = list.reduce((m, e) => Math.max(m, e.severity), 0);
  return {
    events: list,
    count: list.length,
    maxSeverity,
    span: { first: list.length ? list[0].ts : null, last: list.length ? list[list.length - 1].ts : null },
  };
}
