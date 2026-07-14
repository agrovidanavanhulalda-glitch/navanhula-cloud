/**
 * Sprint 4.0 · Policy Engine (pure, read-only).
 * Validates whether an agentic plan is eligible for approval/execution.
 * Never mutates state. No I/O.
 */

export type Criticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PolicyContext {
  isFounder: boolean;
  isSuperAdmin: boolean;
  companyId?: string | null;
  permissions?: string[];
  /** ISO string; if inside maintenance window, HIGH/CRITICAL allowed */
  now?: Date;
  maintenanceWindow?: { start: Date; end: Date } | null;
}

export interface PolicyInput {
  criticality: Criticality;
  impact: number; // 0..100
  risk: number;   // 0..100
  requiresFounder?: boolean;
}

export interface PolicyDecision {
  allowed: boolean;
  reasons: string[];
  warnings: string[];
}

export function evaluatePolicy(ctx: PolicyContext, input: PolicyInput): PolicyDecision {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!ctx.isFounder && !ctx.isSuperAdmin) {
    reasons.push('Somente Founder ou Super Admin podem aprovar planos agentic.');
  }
  if (input.requiresFounder && !ctx.isFounder) {
    reasons.push('Este plano exige aprovação explícita do Founder.');
  }

  const now = ctx.now ?? new Date();
  const inWindow = ctx.maintenanceWindow
    ? now >= ctx.maintenanceWindow.start && now <= ctx.maintenanceWindow.end
    : false;

  if ((input.criticality === 'CRITICAL' || input.criticality === 'HIGH') && !inWindow) {
    warnings.push('Plano de alta criticidade fora de janela de manutenção.');
  }
  if (input.risk >= 70) warnings.push(`Risco elevado (${input.risk}/100).`);
  if (input.impact >= 80) warnings.push(`Impacto elevado (${input.impact}/100).`);

  return { allowed: reasons.length === 0, reasons, warnings };
}
