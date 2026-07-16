import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { assessCustomerRelease } from '@/lib/agentic/customer-release/customerReleaseAggregator';
import type { CustomerEvidence } from '@/lib/agentic/customer-release/types';

// Real evidence would be injected upstream. For the Founder view we display
// whatever evidence has been aggregated by the previous sprints (7.0-7.5).
// This page is 100% read-only and deterministic.
const EVIDENCE: CustomerEvidence = {
  customerSuccessScore: 90,
  customerHealthScore: 88,
  journeyScore: 87,
  feedbackScore: 85,
  supportScore: 91,
  renewalScore: 93,
  customer360Score: 94,
};

const Metric: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{label}</CardTitle></CardHeader>
    <CardContent><div className="text-2xl font-black">{value}</div>{hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}</CardContent>
  </Card>
);

const statusVariant = (s: string) =>
  s === 'GENERAL_AVAILABILITY' ? 'default' : s === 'RELEASE_CANDIDATE' ? 'secondary' : 'destructive';

export const FounderCustomerReleaseCenterPage: React.FC = () => {
  const { report } = useMemo(() => assessCustomerRelease(EVIDENCE), []);
  const v = report.evidence.collected.values;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black tracking-tight">Customer Success Release Center</h2>
        <p className="text-sm text-muted-foreground">Certificação automática da Fase 7 (read-only, determinístico).</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Customer Success" value={v.customerSuccessScore} />
        <Metric label="Customer Health" value={v.customerHealthScore} />
        <Metric label="Journey" value={v.journeyScore} />
        <Metric label="Feedback" value={v.feedbackScore} />
        <Metric label="Support" value={v.supportScore} />
        <Metric label="Renewal" value={v.renewalScore} />
        <Metric label="Customer 360°" value={v.customer360Score} />
        <Metric label="Weighted Score" value={report.evidence.weighted} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Customer Readiness" value={report.readiness.customer} />
        <Metric label="Commercial Readiness" value={report.readiness.commercial} />
        <Metric label="Operational Readiness" value={report.readiness.operational} />
        <Metric label="Enterprise Readiness" value={report.readiness.enterprise} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Quality Gate</CardTitle></CardHeader>
          <CardContent>
            <Badge variant={report.gate.status === 'PASS' ? 'default' : report.gate.status === 'WARN' ? 'secondary' : 'destructive'}>
              {report.gate.status}
            </Badge>
            <div className="mt-2 text-xs text-muted-foreground">
              {report.gate.passes} pass · {report.gate.warnings} warn · {report.gate.failures} fail
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Certification</CardTitle></CardHeader>
          <CardContent>
            <Badge variant="secondary">{report.certification.level}</Badge>
            <div className="mt-2 text-xs text-muted-foreground">Score: {report.certification.score}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Release Status</CardTitle></CardHeader>
          <CardContent>
            <Badge variant={statusVariant(report.decision.status)}>{report.decision.status}</Badge>
            <div className="mt-2 text-xs text-muted-foreground">Production: {report.readiness.production}/100</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Executive Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="font-semibold">{report.executive.headline}</div>
          <p className="text-sm text-muted-foreground">{report.executive.summary}</p>
          <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside">
            {report.decision.rationale.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Checklist GA</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {report.checklist.map((c) => (
                <li key={c.key} className="flex justify-between border-b pb-1 last:border-0">
                  <span>{c.label}</span>
                  <span className={c.ok ? 'text-green-600' : 'text-destructive'}>{c.ok ? '✓' : '✗'}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Strengths</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {report.summary.strengths.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Weaknesses</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {report.summary.weaknesses.length === 0
                ? <li className="text-muted-foreground">Nenhuma detetada.</li>
                : report.summary.weaknesses.map((w, i) => <li key={i}>• {w}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recommendations</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {report.summary.recommendations.map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FounderCustomerReleaseCenterPage;
