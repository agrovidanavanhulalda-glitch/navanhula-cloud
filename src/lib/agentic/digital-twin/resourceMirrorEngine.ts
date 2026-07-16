/**
 * Sprint 5.5 · Resource Mirror Engine (pure).
 */
import type { EnterpriseModel } from './enterpriseModelEngine';

export interface ResourceMirrorRow {
  id: string;
  name: string;
  kind: string;
  used: number;
  capacity: number;
  utilization: number;
  status: 'IDLE' | 'HEALTHY' | 'TIGHT' | 'SATURATED';
}

export interface ResourceMirror {
  rows: ResourceMirrorRow[];
  averageUtilization: number;
  saturatedCount: number;
}

export function mirrorResources(model: EnterpriseModel): ResourceMirror {
  const rows: ResourceMirrorRow[] = model.resources.map((r) => {
    const utilization = r.capacity === 0 ? 100 : Math.round((r.used / r.capacity) * 100);
    const status: ResourceMirrorRow['status'] =
      utilization >= 90 ? 'SATURATED' :
      utilization >= 70 ? 'TIGHT' :
      utilization >= 25 ? 'HEALTHY' : 'IDLE';
    return { id: r.id, name: r.name, kind: r.kind, used: r.used, capacity: r.capacity, utilization, status };
  }).sort((a, b) => b.utilization - a.utilization);
  const averageUtilization = rows.length ? Math.round(rows.reduce((s, r) => s + r.utilization, 0) / rows.length) : 0;
  const saturatedCount = rows.filter((r) => r.status === 'SATURATED').length;
  return { rows, averageUtilization, saturatedCount };
}
