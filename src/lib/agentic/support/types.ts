/**
 * Sprint 7.4 · Support Intelligence — shared types.
 */
export type TicketPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketBand = 'CRITICAL' | 'AT_RISK' | 'STABLE' | 'HEALTHY' | 'CHAMPION';

export interface SupportTicket {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly subject: string;
  readonly priority: TicketPriority;
  readonly status: TicketStatus;
  readonly createdAt: string; // ISO
  readonly firstResponseAt: string | null; // ISO
  readonly resolvedAt: string | null; // ISO
  readonly slaResponseMinutes: number; // target
  readonly slaResolutionMinutes: number; // target
  readonly escalations: number;
  readonly reopenCount: number;
  readonly satisfactionScore: number | null; // 1..5 or null
}

export interface SupportAgent {
  readonly id: string;
  readonly name: string;
  readonly capacityHoursPerWeek: number;
  readonly activeTickets: number;
}
