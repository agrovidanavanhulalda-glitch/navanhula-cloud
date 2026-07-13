# Sprint 2.4 — Enterprise Telemetry (Passive)

**Scope:** telemetry only. Zero functional changes. Nothing wired into existing call sites.

## Modules
- `buffer.ts` — in-memory event buffer with 60s / 100-event flush, aggregate() computes p50/p90/p95/p99, error/retry/timeout rates. Fire-and-forget.
- `rpcWithMetrics.ts` — optional wrapper around `supabase.rpc()`. Same return shape. Never throws, never blocks, records duration + success + payload/response sizes + timeout flag.

## Guarantees
- Passive: no import graph change to POS / Fiscal / Billing / CRM / Founder / Sync.
- Asynchronous: `queueMicrotask` flush; timer only in browser.
- Idempotent: buffer is bounded; duplicate events are harmless aggregates.
- Non-blocking: try/catch on every write; no throw path.
- No UX / API / RPC contract / RLS / migration change.

## Enterprise Health (audit findings)
- 20+ files use `supabase.rpc(...)` today. No breaker installed (Sprint 2.3 decision: reevaluate after real incident).
- Realtime channels: 100% teardown with `removeChannel` verified.
- Workers: 1 COMPLETED task, 0 DLQ; boot 30–333 ms in recent logs.
- Storage buckets active: fiscal-documents, company_assets, payment-proofs, comunidade_media, compliance_documents, founder-backups. Retention still undocumented (carry-over).

## Sprint 2.4 Decision
⚠️ **READY WITH OBSERVATIONS** — telemetry layer shipped as opt-in library only. Wiring into RPC call sites deferred to Sprint 2.5 (per Quality Gate: zero regression this sprint).

## Sprint 2.5 Plan
1. Opt-in migration: replace `supabase.rpc(...)` with `rpcWithMetrics(...)` in Founder read paths first (lowest risk).
2. Add Founder Observability widget consuming `aggregate()`.
3. Persist flushed batches to `api_request_logs` via service-role edge function (server-side sink).
4. Formalize per-bucket retention policy.
