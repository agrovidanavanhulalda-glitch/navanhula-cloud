/**
 * Sprint 5.3 · Audit Trail Engine (pure).
 */
export interface AuditTrailInput {
  readonly id: string;
  readonly at?: string | null;
  readonly actor?: string | null;
  readonly action?: string | null;
  readonly target?: string | null;
}

export interface AuditTrailEntry {
  readonly id: string;
  readonly at: string;
  readonly actor: string;
  readonly action: string;
  readonly target: string;
  readonly ts: number;
}

function toTs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export function buildAuditTrail(list: readonly AuditTrailInput[]): AuditTrailEntry[] {
  const src = list ?? [];
  return src
    .filter((e) => e && typeof e.id === 'string')
    .map((e) => ({
      id: e.id,
      at: e.at ?? '',
      actor: e.actor ?? 'system',
      action: e.action ?? 'unknown',
      target: e.target ?? '-',
      ts: toTs(e.at),
    }))
    .sort((a, b) => (b.ts - a.ts) || a.id.localeCompare(b.id));
}
