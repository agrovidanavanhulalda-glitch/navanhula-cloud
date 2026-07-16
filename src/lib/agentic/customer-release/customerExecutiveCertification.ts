import type { CustomerEvidence } from './types';
import { decideCustomerGa } from './customerGaDecision';
import { certifyCustomerRelease } from './customerCertificationEngine';
import { computeCustomerReadiness } from './customerReadinessEngine';

export interface ExecutiveCertification {
  readonly headline: string;
  readonly status: ReturnType<typeof decideCustomerGa>['status'];
  readonly level: ReturnType<typeof certifyCustomerRelease>['level'];
  readonly production: number;
  readonly summary: string;
}

export function issueExecutiveCertification(
  input: CustomerEvidence = {},
): ExecutiveCertification {
  const decision = decideCustomerGa(input);
  const cert = certifyCustomerRelease(input);
  const readiness = computeCustomerReadiness(input);
  const headline =
    decision.status === 'GENERAL_AVAILABILITY'
      ? 'Fase 7 pronta para GA'
      : decision.status === 'RELEASE_CANDIDATE'
        ? 'Fase 7 em Release Candidate'
        : 'Fase 7 ainda não pronta';
  const summary = `Certificação ${cert.level} · Production ${readiness.production}/100`;
  return {
    headline,
    status: decision.status,
    level: cert.level,
    production: readiness.production,
    summary,
  };
}
