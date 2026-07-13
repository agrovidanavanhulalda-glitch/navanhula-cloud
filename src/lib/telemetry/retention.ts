/**
 * Sprint 2.6 · Formal retention constants per storage bucket.
 * Non-destructive: no code deletes files based on these values.
 * Central source of truth for future lifecycle jobs and Founder UI.
 */
export interface BucketRetention {
  bucket: string;
  minRetentionDays: number | null; // null = no formal expiry
  archiveAfterDays: number | null;
  sensitivity: 'low' | 'medium' | 'high';
  notes: string;
}

export const BUCKET_RETENTION: readonly BucketRetention[] = [
  { bucket: 'fiscal-documents',     minRetentionDays: 10 * 365, archiveAfterDays: 24 * 30, sensitivity: 'high',   notes: 'Retenção legal MZ' },
  { bucket: 'compliance_documents', minRetentionDays: 10 * 365, archiveAfterDays: 24 * 30, sensitivity: 'high',   notes: 'INSS/IRPC/IVA' },
  { bucket: 'payment-proofs',       minRetentionDays:  5 * 365, archiveAfterDays: 12 * 30, sensitivity: 'high',   notes: 'Anti-fraude' },
  { bucket: 'founder-backups',      minRetentionDays:      365, archiveAfterDays: null,     sensitivity: 'high',   notes: 'Rotação semanal' },
  { bucket: 'company_assets',       minRetentionDays: null,     archiveAfterDays: null,     sensitivity: 'low',    notes: 'Branding' },
  { bucket: 'comunidade_media',     minRetentionDays: 24 * 30,  archiveAfterDays: null,     sensitivity: 'medium', notes: 'Signed URLs' },
] as const;
