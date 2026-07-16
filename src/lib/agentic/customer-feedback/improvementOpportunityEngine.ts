/**
 * Identifies improvement opportunities per category based on low avg rating + volume.
 */
import { FeedbackEntry } from './types';
import { breakdownByCategory, type CategoryBreakdown } from './feedbackCategoryEngine';
import { priorityFor, type Priority } from './feedbackPriorityEngine';

export interface Opportunity {
  readonly category: CategoryBreakdown['category'];
  readonly count: number;
  readonly avgRating: number;
  readonly priority: Priority;
  readonly rationale: string;
}

export function identifyOpportunities(entries: readonly FeedbackEntry[]): Opportunity[] {
  return breakdownByCategory(entries)
    .filter((b) => b.avgRating < 8 && b.count > 0)
    .map<Opportunity>((b) => ({
      category: b.category,
      count: b.count,
      avgRating: b.avgRating,
      priority: priorityFor(b.count, b.avgRating),
      rationale: `Categoria "${b.category}" com ${b.count} feedback(s) e média ${b.avgRating}/10`,
    }))
    .sort((a, b) => {
      const rank: Record<Priority, number> = { P1: 3, P2: 2, P3: 1 };
      return rank[b.priority] - rank[a.priority] || a.avgRating - b.avgRating;
    });
}
