/**
 * Sprint 5.0 · Enterprise Architecture Engine (pure orchestrator).
 * Consolidates capability/domain/context analyses into one report.
 */
import { normalizeCapabilities, type CapabilityInput, type Capability } from './businessCapabilityEngine';
import { buildCapabilityMap, type CapabilityMap } from './capabilityMapEngine';
import { analyzeDependencies, type DependencyReport } from './capabilityDependencyEngine';
import { evaluateCapabilityHealth, type HealthSummary } from './capabilityHealthEngine';
import { evaluateMaturity, type MaturitySummary } from './capabilityMaturityEngine';
import { analyzeDomains, type DomainReport } from './domainEngine';
import { deriveBoundedContexts, type BoundedContext } from './boundedContextEngine';
import { assessCapabilityRisks, type CapabilityRisk } from './capabilityRiskEngine';
import { buildCapabilityRoadmap, type RoadmapItem } from './capabilityRoadmapEngine';
import { computeArchitectureScore, type ArchitectureScore } from './architectureScoreEngine';

export interface ArchitectureReport {
  capabilities: Capability[];
  map: CapabilityMap;
  dependencies: DependencyReport;
  health: HealthSummary;
  maturity: MaturitySummary;
  domains: DomainReport[];
  boundedContexts: BoundedContext[];
  risks: CapabilityRisk[];
  roadmap: RoadmapItem[];
  score: ArchitectureScore;
}

export function analyzeArchitecture(inputs: CapabilityInput[] = []): ArchitectureReport {
  const capabilities = normalizeCapabilities(inputs);
  return {
    capabilities,
    map: buildCapabilityMap(capabilities),
    dependencies: analyzeDependencies(capabilities),
    health: evaluateCapabilityHealth(capabilities),
    maturity: evaluateMaturity(capabilities),
    domains: analyzeDomains(capabilities),
    boundedContexts: deriveBoundedContexts(capabilities),
    risks: assessCapabilityRisks(capabilities),
    roadmap: buildCapabilityRoadmap(capabilities),
    score: computeArchitectureScore(capabilities),
  };
}
