/**
 * Sprint 5.3 · Compliance Catalog (pure, static reference data).
 * Provides deterministic compliance frameworks used by the intelligence layer.
 */

export type ComplianceStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ControlHealth = 'HEALTHY' | 'WARNING' | 'FAILED';

export interface ComplianceFramework {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly weight: number; // 0..1
}

export const COMPLIANCE_CATALOG: readonly ComplianceFramework[] = [
  { id: 'iso27001', name: 'ISO 27001', domain: 'Security', weight: 1.0 },
  { id: 'soc2', name: 'SOC 2 Type II', domain: 'Security', weight: 1.0 },
  { id: 'gdpr', name: 'GDPR', domain: 'Privacy', weight: 1.0 },
  { id: 'pci_dss', name: 'PCI-DSS', domain: 'Payments', weight: 0.9 },
  { id: 'lgpd', name: 'LGPD', domain: 'Privacy', weight: 0.9 },
  { id: 'sox', name: 'SOX', domain: 'Financial', weight: 0.8 },
  { id: 'nist_csf', name: 'NIST CSF', domain: 'Security', weight: 0.8 },
  { id: 'internal_policy', name: 'Internal Policies', domain: 'Governance', weight: 0.7 },
] as const;

export function getFramework(id: string): ComplianceFramework | undefined {
  return COMPLIANCE_CATALOG.find((f) => f.id === id);
}
