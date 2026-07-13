import { describe, it, expect } from 'vitest';
import { READINESS_MATRIX } from './disasterReadiness';

describe('disasterReadiness matrix', () => {
  it('declares every required capability with a valid status', () => {
    expect(READINESS_MATRIX.length).toBeGreaterThanOrEqual(8);
    for (const item of READINESS_MATRIX) {
      expect(item.capability).toBeTruthy();
      expect(item.target).toBeTruthy();
      expect(item.evidence).toBeTruthy();
      expect(['READY', 'PARTIAL', 'PENDING']).toContain(item.status);
    }
  });
  it('covers RPO and RTO explicitly', () => {
    const caps = READINESS_MATRIX.map(i => i.capability).join(' ');
    expect(caps).toContain('RPO');
    expect(caps).toContain('RTO');
  });
});
