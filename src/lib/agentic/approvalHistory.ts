/**
 * Sprint 4.3 · Approval History (pure).
 * Aggregates versions + comments into a timeline.
 */
import { listVersions, type PlanVersion } from './versionEngine';
import { listComments, type ApprovalComment } from './commentEngine';

export interface HistoryEvent {
  at: string;
  kind: 'VERSION' | 'COMMENT';
  title: string;
  detail: string;
}

export function buildTimeline(workflowId: string): HistoryEvent[] {
  const versions: PlanVersion[] = listVersions(workflowId);
  const comments: ApprovalComment[] = listComments(workflowId);
  const events: HistoryEvent[] = [];
  for (const v of versions) {
    events.push({
      at: v.createdAt,
      kind: 'VERSION',
      title: `Versão v${v.version} registrada`,
      detail: `${v.snapshot.problemTitle} — ${v.snapshot.readiness} · risco ${v.snapshot.riskLevel}`,
    });
  }
  for (const c of comments) {
    events.push({
      at: c.createdAt,
      kind: 'COMMENT',
      title: `${c.author} · ${c.action}`,
      detail: c.message,
    });
  }
  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
