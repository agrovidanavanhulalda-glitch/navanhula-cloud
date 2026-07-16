/**
 * Sprint 5.6 · Release Notes Engine — pure.
 */
export interface SprintEntry {
  readonly id: string;
  readonly title: string;
  readonly category: string;
}

export interface ReleaseNotes {
  readonly version: string;
  readonly generatedAt: string;
  readonly sprints: readonly SprintEntry[];
  readonly timelines: Record<string, readonly SprintEntry[]>;
  readonly summary: string;
}

const DEFAULT_SPRINTS: readonly SprintEntry[] = [
  { id: '3.0', title: 'Enterprise Score V2 · Ops foundations', category: 'Operations' },
  { id: '4.5', title: 'Simulation Engine', category: 'Simulation' },
  { id: '4.9', title: 'Decision Intelligence Engine', category: 'Decision' },
  { id: '5.0', title: 'Enterprise Architecture Engine', category: 'Architecture' },
  { id: '5.1', title: 'Transformation Center', category: 'Transformation' },
  { id: '5.2', title: 'Enterprise Risk Engine', category: 'Risk' },
  { id: '5.3', title: 'Compliance Intelligence', category: 'Compliance' },
  { id: '5.4', title: 'Business Continuity & Disaster Intelligence', category: 'Continuity' },
  { id: '5.5', title: 'Enterprise Digital Twin', category: 'DigitalTwin' },
  { id: '5.5.1', title: 'RC-1 Stabilization', category: 'Quality' },
  { id: '5.5.2', title: 'Test Suite Hardening', category: 'Quality' },
  { id: '5.6', title: 'Enterprise General Availability', category: 'Release' },
];

const CATEGORY_TO_TIMELINE: Record<string, string> = {
  Operations: 'operations',
  Simulation: 'simulation',
  Decision: 'decision',
  Architecture: 'architecture',
  Transformation: 'transformation',
  Risk: 'risk',
  Compliance: 'compliance',
  Continuity: 'businessContinuity',
  DigitalTwin: 'digitalTwin',
  Quality: 'agentic',
  Release: 'enterprise',
  AI: 'ai',
  Governance: 'governance',
  Knowledge: 'knowledge',
};

export function generateReleaseNotes(
  version = 'GA-1.0.0',
  now: number = Date.now(),
  sprints: readonly SprintEntry[] = DEFAULT_SPRINTS,
): ReleaseNotes {
  const timelines: Record<string, SprintEntry[]> = {
    enterprise: [], ai: [], operations: [], governance: [], compliance: [],
    businessContinuity: [], digitalTwin: [], agentic: [], transformation: [],
    risk: [], decision: [], knowledge: [], simulation: [], architecture: [],
  };
  sprints.forEach((s) => {
    const bucket = CATEGORY_TO_TIMELINE[s.category] ?? 'enterprise';
    (timelines[bucket] ??= []).push(s);
  });
  const generatedAt = new Date(Number.isFinite(now) ? now : 0).toISOString();
  const summary = `NAVANHULA CLOUD ${version} — ${sprints.length} sprints delivered across ${Object.keys(timelines).length} enterprise timelines.`;
  return { version, generatedAt, sprints, timelines, summary };
}
