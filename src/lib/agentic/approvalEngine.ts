/**
 * Sprint 4.0 · Approval Engine (pure, in-memory only).
 * Manages plan lifecycle without executing any action.
 */
import type { AgenticPlan } from './plannerEngine';

export type ApprovalState =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXECUTED'
  | 'EXPIRED';

export interface ApprovalRecord {
  planId: string;
  state: ApprovalState;
  updatedAt: string;
  actor?: string;
  reason?: string;
}

export function initialApproval(plan: AgenticPlan): ApprovalRecord {
  return { planId: plan.id, state: 'DRAFT', updatedAt: new Date().toISOString() };
}

const VALID_TRANSITIONS: Record<ApprovalState, ApprovalState[]> = {
  DRAFT: ['PENDING', 'CANCELLED'],
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
  APPROVED: ['EXECUTED', 'CANCELLED', 'EXPIRED'],
  REJECTED: [],
  CANCELLED: [],
  EXECUTED: [],
  EXPIRED: [],
};

export function transition(
  current: ApprovalRecord,
  next: ApprovalState,
  actor?: string,
  reason?: string,
): ApprovalRecord {
  if (!VALID_TRANSITIONS[current.state].includes(next)) {
    throw new Error(`Transição inválida: ${current.state} → ${next}`);
  }
  return { ...current, state: next, actor, reason, updatedAt: new Date().toISOString() };
}
