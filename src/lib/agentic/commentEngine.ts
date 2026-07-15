/**
 * Sprint 4.3 · Comment Engine (pure).
 * Internal Founder comments attached to an approval workflow.
 */
export type CommentAction = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED' | 'COMMENT' | 'REVIEW_REQUESTED';

export interface ApprovalComment {
  id: string;
  workflowId: string;
  createdAt: string;
  author: string;
  action: CommentAction;
  message: string;
}

const COMMENTS = new Map<string, ApprovalComment[]>();

export function addComment(
  workflowId: string,
  entry: Omit<ApprovalComment, 'id' | 'workflowId' | 'createdAt'>,
): ApprovalComment {
  const list = COMMENTS.get(workflowId) ?? [];
  const comment: ApprovalComment = {
    id: `cm-${workflowId}-${list.length + 1}-${Date.now().toString(36)}`,
    workflowId,
    createdAt: new Date().toISOString(),
    author: entry.author || 'founder',
    action: entry.action,
    message: entry.message || '',
  };
  list.push(comment);
  COMMENTS.set(workflowId, list);
  return comment;
}

export function listComments(workflowId: string): ApprovalComment[] {
  return (COMMENTS.get(workflowId) ?? []).slice();
}

export function resetCommentRegistry(): void {
  COMMENTS.clear();
}
