/**
 * Sprint 5.4 · Backup Validation Engine — pure.
 */
import { clamp } from './businessImpactAnalysis';

export interface BackupInput {
  id?: unknown;
  name?: unknown;
  lastBackupHoursAgo?: unknown;
  lastRestoreTestDaysAgo?: unknown;
  successRate?: unknown; // 0-100
  encrypted?: unknown;   // boolean
  offsite?: unknown;     // boolean
}

export interface BackupRow {
  id: string;
  name: string;
  lastBackupHoursAgo: number;
  lastRestoreTestDaysAgo: number;
  successRate: number;
  encrypted: boolean;
  offsite: boolean;
  health: number; // 0-100
}

export interface BackupReport {
  rows: BackupRow[];
  score: number;
  staleCount: number;
}

export function validateBackups(
  list: readonly BackupInput[] | null | undefined,
): BackupReport {
  if (!Array.isArray(list) || list.length === 0) {
    return { rows: [], score: 0, staleCount: 0 };
  }
  const rows: BackupRow[] = list
    .filter((b): b is BackupInput => b != null && typeof b === 'object')
    .map((b, i) => {
      const id = typeof b.id === 'string' && b.id ? b.id : `B${i + 1}`;
      const name = typeof b.name === 'string' && b.name ? b.name : id;
      const lastBackup = clamp(b.lastBackupHoursAgo, 0, 24 * 30);
      const lastRestore = clamp(b.lastRestoreTestDaysAgo, 0, 365);
      const successRate = clamp(b.successRate, 0, 100);
      const encrypted = b.encrypted === true;
      const offsite = b.offsite === true;
      let health = successRate * 0.5;
      health += (1 - lastBackup / (24 * 30)) * 20;
      health += (1 - lastRestore / 365) * 15;
      if (encrypted) health += 8;
      if (offsite) health += 7;
      health = Math.max(0, Math.min(100, Math.round(health)));
      return {
        id, name,
        lastBackupHoursAgo: lastBackup,
        lastRestoreTestDaysAgo: lastRestore,
        successRate, encrypted, offsite, health,
      };
    })
    .sort((a, b) => (b.health - a.health) || a.id.localeCompare(b.id));
  const score = Math.round(rows.reduce((s, r) => s + r.health, 0) / rows.length);
  const staleCount = rows.filter((r) => r.lastBackupHoursAgo > 48).length;
  return { rows, score, staleCount };
}
