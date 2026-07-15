/**
 * Sprint 5.3 · Finding Engine (pure).
 */
import type { FindingSeverity } from './complianceCatalog';

export interface AuditFindingInput {
  readonly id: string;
  readonly title: string;
  readonly severity?: FindingSeverity | null;
  readonly openedAt?: string | null;
  readonly resolvedAt?: string | null;
}

export interface NormalizedFinding {
  readonly id: string;
  readonly title: string;
  readonly severity: FindingSeverity;
  readonly open: boolean;
}

const VALID: readonly FindingSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const RANK: Record<FindingSeverity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export function normalizeFindings(list: readonly AuditFindingInput[]): NormalizedFinding[] {
  const src = list ?? [];
  return src
    .filter((f) => f && typeof f.id === 'string')
    .map((f) => ({
      id: f.id,
      title: f.title ?? 'Unnamed finding',
      severity: VALID.includes(f.severity as FindingSeverity) ? (f.severity as FindingSeverity) : 'LOW',
      open: !f.resolvedAt,
    }))
    .sort((a, b) => (RANK[b.severity] - RANK[a.severity]) || a.id.localeCompare(b.id));
}

export interface FindingBreakdown {
  readonly critical: number;
  readonly high: number;
  readonly medium: number;
  readonly low: number;
  readonly open: number;
  readonly total: number;
}

export function summarizeFindings(findings: readonly NormalizedFinding[]): FindingBreakdown {
  const list = findings ?? [];
  let critical = 0, high = 0, medium = 0, low = 0, open = 0;
  for (const f of list) {
    if (f.severity === 'CRITICAL') critical++;
    else if (f.severity === 'HIGH') high++;
    else if (f.severity === 'MEDIUM') medium++;
    else low++;
    if (f.open) open++;
  }
  return { critical, high, medium, low, open, total: list.length };
}
