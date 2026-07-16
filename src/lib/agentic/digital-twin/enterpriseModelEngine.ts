/**
 * Sprint 5.5 · Enterprise Model Engine (pure).
 * Normalizes the raw twin input into a stable, defensive model.
 */
const clamp = (n: unknown, min = 0, max = 100): number => {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.min(max, x));
};
const nn = (n: unknown, def = 0): number =>
  typeof n === 'number' && Number.isFinite(n) ? n : def;

export interface TwinProcess {
  id: string;
  name: string;
  criticality?: number;   // 0-100
  load?: number;          // 0-100
  health?: number;        // 0-100
  revenueImpact?: number; // 0-100
  dependsOn?: string[];
}
export interface TwinResource {
  id: string;
  name: string;
  kind?: 'CPU' | 'MEMORY' | 'STORAGE' | 'NETWORK' | 'DB' | 'QUEUE' | 'OTHER';
  used?: number;    // 0-100
  capacity?: number; // 0-100
}
export interface TwinDependency {
  id: string;
  name: string;
  type?: 'INTERNAL' | 'EXTERNAL' | 'INFRA';
  reliability?: number; // 0-100
  criticality?: number; // 0-100
}
export interface TwinService {
  id: string;
  name: string;
  uptime?: number;   // 0-100
  slaTarget?: number; // 0-100
}

export interface EnterpriseModelInput {
  processes?: TwinProcess[];
  resources?: TwinResource[];
  dependencies?: TwinDependency[];
  services?: TwinService[];
  growthPerDay?: number; // % load growth per day
}

export interface EnterpriseModel {
  processes: Required<TwinProcess>[];
  resources: Required<TwinResource>[];
  dependencies: Required<TwinDependency>[];
  services: Required<TwinService>[];
  growthPerDay: number;
  size: number;
}

export function buildEnterpriseModel(input: EnterpriseModelInput = {}): EnterpriseModel {
  const processes = (Array.isArray(input.processes) ? input.processes : []).map((p) => ({
    id: String(p.id ?? ''),
    name: String(p.name ?? p.id ?? 'process'),
    criticality: clamp(p.criticality, 0, 100),
    load: clamp(p.load, 0, 100),
    health: clamp(p.health ?? 100, 0, 100),
    revenueImpact: clamp(p.revenueImpact, 0, 100),
    dependsOn: Array.isArray(p.dependsOn) ? p.dependsOn.map(String) : [],
  }));
  const resources = (Array.isArray(input.resources) ? input.resources : []).map((r) => ({
    id: String(r.id ?? ''),
    name: String(r.name ?? r.id ?? 'resource'),
    kind: (r.kind ?? 'OTHER') as Required<TwinResource>['kind'],
    used: clamp(r.used, 0, 100),
    capacity: clamp(r.capacity ?? 100, 0, 100),
  }));
  const dependencies = (Array.isArray(input.dependencies) ? input.dependencies : []).map((d) => ({
    id: String(d.id ?? ''),
    name: String(d.name ?? d.id ?? 'dep'),
    type: (d.type ?? 'INTERNAL') as Required<TwinDependency>['type'],
    reliability: clamp(d.reliability ?? 100, 0, 100),
    criticality: clamp(d.criticality, 0, 100),
  }));
  const services = (Array.isArray(input.services) ? input.services : []).map((s) => ({
    id: String(s.id ?? ''),
    name: String(s.name ?? s.id ?? 'svc'),
    uptime: clamp(s.uptime ?? 100, 0, 100),
    slaTarget: clamp(s.slaTarget ?? 99, 0, 100),
  }));
  return {
    processes, resources, dependencies, services,
    growthPerDay: clamp(nn(input.growthPerDay, 0), 0, 100),
    size: processes.length + resources.length + dependencies.length + services.length,
  };
}
