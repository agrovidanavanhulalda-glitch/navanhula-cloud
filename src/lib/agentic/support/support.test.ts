/**
 * Sprint 7.4 · Support Intelligence — unit tests.
 */
import { describe, it, expect } from 'vitest';
import type { SupportAgent, SupportTicket } from './types';
import { evaluateTicket } from './ticketEngine';
import { derivedPriority } from './ticketPriorityEngine';
import { analyzeTicketTrend } from './ticketTrendEngine';
import { evaluateSlaCompliance } from './slaEngine';
import { evaluateResponseTime } from './responseTimeEngine';
import { evaluateResolutionTime } from './resolutionTimeEngine';
import { evaluateBacklog } from './backlogEngine';
import { evaluateEscalations } from './escalationEngine';
import { selectCriticalTickets } from './criticalTicketEngine';
import { evaluateSupportCapacity } from './supportCapacityEngine';
import { evaluateQueueHealth } from './queueHealthEngine';
import { computeSupportScore } from './supportScoreEngine';
import { assessSupportPortfolio } from './supportAggregator';

const NOW = new Date('2026-07-16T12:00:00Z');
const iso = (offsetMin: number) => new Date(NOW.getTime() + offsetMin * 60_000).toISOString();

const t = (over: Partial<SupportTicket> = {}): SupportTicket => ({
  id: 't1', customerId: 'c1', customerName: 'Acme', subject: 'Issue',
  priority: 'P3', status: 'open',
  createdAt: iso(-120), firstResponseAt: iso(-90), resolvedAt: null,
  slaResponseMinutes: 60, slaResolutionMinutes: 480,
  escalations: 0, reopenCount: 0, satisfactionScore: null,
  ...over,
});

describe('ticketEngine', () => {
  it('computes ageMinutes for open ticket', () => {
    expect(evaluateTicket(t(), NOW).ageMinutes).toBe(120);
  });
  it('handles invalid dates defensively', () => {
    const m = evaluateTicket(t({ createdAt: '', firstResponseAt: null, resolvedAt: null }), NOW);
    expect(Number.isFinite(m.ageMinutes)).toBe(true);
  });
});

describe('priority', () => {
  it('escalates to P1 on repeated escalations', () => {
    expect(derivedPriority(t({ priority: 'P3', escalations: 3 }))).toBe('P1');
  });
  it('preserves P1', () => {
    expect(derivedPriority(t({ priority: 'P1' }))).toBe('P1');
  });
});

describe('trend', () => {
  it('empty dataset returns FLAT', () => {
    expect(analyzeTicketTrend([]).direction).toBe('FLAT');
  });
  it('detects UP trend', () => {
    const tickets: SupportTicket[] = [
      t({ id: 'a', createdAt: '2026-05-10T00:00:00Z' }),
      t({ id: 'b', createdAt: '2026-06-10T00:00:00Z' }),
      t({ id: 'c', createdAt: '2026-07-10T00:00:00Z' }),
      t({ id: 'd', createdAt: '2026-07-11T00:00:00Z' }),
      t({ id: 'e', createdAt: '2026-07-12T00:00:00Z' }),
    ];
    expect(analyzeTicketTrend(tickets).direction).toBe('UP');
  });
});

describe('sla', () => {
  it('100% compliance on empty set', () => {
    expect(evaluateSlaCompliance([], NOW).overallCompliancePct).toBe(100);
  });
  it('detects SLA compliance', () => {
    const s = evaluateSlaCompliance([
      t({ firstResponseAt: iso(-90), slaResponseMinutes: 60 }), // met (resp 30m)
    ], NOW);
    expect(s.responseCompliancePct).toBe(100);
  });
  it('detects SLA violation', () => {
    const s = evaluateSlaCompliance([
      t({ createdAt: iso(-300), firstResponseAt: iso(-100), slaResponseMinutes: 60 }),
    ], NOW);
    expect(s.responseCompliancePct).toBe(0);
    expect(s.violations).toBeGreaterThan(0);
  });
});

describe('response & resolution time', () => {
  it('returns zeros on empty', () => {
    expect(evaluateResponseTime([], NOW).avgMinutes).toBe(0);
    expect(evaluateResolutionTime([], NOW).avgMinutes).toBe(0);
  });
  it('averages and counts unanswered', () => {
    const r = evaluateResponseTime([
      t({ firstResponseAt: null }),
      t({ createdAt: iso(-60), firstResponseAt: iso(-30) }),
    ], NOW);
    expect(r.unanswered).toBe(1);
    expect(r.answered).toBe(1);
  });
});

describe('backlog', () => {
  it('empty backlog', () => {
    expect(evaluateBacklog([t({ status: 'resolved', resolvedAt: iso(-10) })], NOW).openCount).toBe(0);
  });
  it('high backlog with aged tickets', () => {
    const b = evaluateBacklog([
      t({ id: 'a', createdAt: iso(-60 * 24 * 10) }),
      t({ id: 'b', createdAt: iso(-60 * 24 * 8) }),
      t({ id: 'c', createdAt: iso(-60) }),
    ], NOW);
    expect(b.openCount).toBe(3);
    expect(b.agedOverDays).toBe(2);
  });
});

describe('escalations & critical', () => {
  it('empty escalation stats', () => {
    expect(evaluateEscalations([]).totalEscalations).toBe(0);
  });
  it('selects critical tickets', () => {
    const c = selectCriticalTickets([
      t({ id: 'p1', priority: 'P1', status: 'open' }),
      t({ id: 'p3', priority: 'P3', status: 'open' }),
    ], NOW);
    expect(c.length).toBe(1);
    expect(c[0].id).toBe('p1');
  });
});

describe('capacity', () => {
  it('overload when few agents for many open tickets', () => {
    const agents: SupportAgent[] = [{ id: 'a1', name: 'A', capacityHoursPerWeek: 10, activeTickets: 5 }];
    const tickets: SupportTicket[] = Array.from({ length: 20 }, (_, i) => t({ id: `x${i}` }));
    const cap = evaluateSupportCapacity(agents, tickets);
    expect(cap.band).toBe('OVERLOAD');
  });
  it('under-utilized when abundant capacity', () => {
    const agents: SupportAgent[] = [{ id: 'a1', name: 'A', capacityHoursPerWeek: 200, activeTickets: 0 }];
    expect(evaluateSupportCapacity(agents, [t()]).band).toBe('UNDER');
  });
});

describe('queue & score', () => {
  it('queue health CHAMPION on clean set', () => {
    const q = evaluateQueueHealth([
      t({ status: 'resolved', createdAt: iso(-200), firstResponseAt: iso(-190), resolvedAt: iso(-100), slaResponseMinutes: 60, slaResolutionMinutes: 480 }),
    ], NOW);
    expect(q.band === 'CHAMPION' || q.band === 'HEALTHY').toBe(true);
  });
  it('score bounded 0..100', () => {
    const s = computeSupportScore([t()], [], NOW);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
  });
  it('handles NaN/Infinity/undefined/null defensively', () => {
    const bad = t({
      slaResponseMinutes: NaN, slaResolutionMinutes: Infinity,
      escalations: undefined as unknown as number,
      reopenCount: null as unknown as number,
    });
    const s = computeSupportScore([bad], [], NOW);
    expect(Number.isFinite(s.score)).toBe(true);
  });
});

describe('aggregator', () => {
  it('empty portfolio', () => {
    const p = assessSupportPortfolio([], [], NOW);
    expect(p.totalTickets).toBe(0);
    expect(p.sla.overallCompliancePct).toBe(100);
    expect(p.summary.highlights).toEqual([]);
  });
  it('single ticket', () => {
    const p = assessSupportPortfolio([t()], [], NOW);
    expect(p.totalTickets).toBe(1);
  });
  it('is deterministic across runs', () => {
    const tickets = [t({ id: 'a', escalations: 2 }), t({ id: 'b' }), t({ id: 'c', priority: 'P1' })];
    const p1 = assessSupportPortfolio(tickets, [], NOW);
    const p2 = assessSupportPortfolio(tickets, [], NOW);
    expect(p1.score.score).toBe(p2.score.score);
    expect(p1.critical.map((x) => x.id)).toEqual(p2.critical.map((x) => x.id));
  });
  it('sorts critical by age descending', () => {
    const tickets: SupportTicket[] = [
      t({ id: 'young', priority: 'P1', createdAt: iso(-30) }),
      t({ id: 'old',   priority: 'P1', createdAt: iso(-600) }),
    ];
    const p = assessSupportPortfolio(tickets, [], NOW);
    expect(p.critical[0].id).toBe('old');
  });
});
