# FISCAL SPRINT 1.1 — Plano de Execução

Escopo enorme (10 fases). Para preservar a estabilidade das Sprints 0.1/0.2 e permitir revisão incremental, proponho executar em **4 entregas sequenciais**, cada uma com aprovação sua entre elas. Nenhuma tocará em `pos_complete_sale`, triggers financeiras, syncManager, Billing, Founder Mode ou Multi-Tenant.

---

## Entrega A — Fundação (Fases 1 + 3 + 9 parcial)
**Auditoria Fiscal + Integridade + RLS**

Nova tabela `fiscal_audit_log`:
- `job_id, sale_id, company_id, store_id, fiscal_document_id, document_number, worker, started_at, finished_at, duration_ms, retry_count, status, result, error_code, error_stack, checksum, hash, actor_id, source`
- RLS: `company_id` isolation + Founder full access
- GRANTs completos (authenticated + service_role)
- Índices: `(company_id, started_at DESC)`, `(status)`, `(sale_id)`, `(fiscal_document_id)`

Colunas em `fiscal_documents`: `content_hash TEXT`, `checksum TEXT`, `integrity_status TEXT DEFAULT 'unverified'`, `integrity_checked_at TIMESTAMPTZ`.

Worker `process-task-queue` estendido:
- Gera SHA-256 do payload fiscal ao emitir
- Escreve linha em `fiscal_audit_log` em cada tentativa (sucesso/erro/retry)
- Preenche `content_hash`/`checksum` em `fiscal_documents`

RPC `verify_fiscal_document_integrity(p_document_id)` — recalcula hash e atualiza `integrity_status` (`valid` | `corrupted`); em corrupção, cria alerta em `system_alerts` para Founder.

---

## Entrega B — Storage Fiscal (Fase 2)
Bucket privado `fiscal-documents` (via tool), path `{company_id}/{yyyy}/{mm}/{document_id}/{pdf|xml|json|qr}.ext`.

- RLS em `storage.objects`: apenas membros da company + Founder
- Coluna `storage_paths JSONB` em `fiscal_documents` guardando `{pdf, xml, json, qr, version}`
- Signed URLs (60s) via RPC `get_fiscal_document_url(p_document_id, p_kind)`
- Worker faz upload do PDF/QR já gerados; XML/JSON como stubs versionáveis

Retenção: coluna `retention_until` (default `now() + interval '10 years'` — Moçambique fiscal).

---

## Entrega C — Dashboard + Dead Letter Center (Fases 4 + 5 + 7)

RPC `founder_fiscal_metrics(p_hours int)` retornando JSON com todos os KPIs (emitidos, pendentes, retries, failed/DLQ, p50/p95/p99, throughput, backlog, storage bytes, success/failure/retry rate).

Novas páginas Founder (usando tokens semânticos, dark-mode-safe):
- `src/pages/founder/FounderFiscalDashboardPage.tsx` — KPIs + charts (recharts)
- `src/pages/founder/FounderFiscalDLQPage.tsx` — tabela de `background_tasks` com `task_type='ISSUE_FISCAL_DOCUMENT'` e `status='FAILED'`; ações: reprocessar (RPC `fiscal_requeue_job`), cancelar, arquivar, ver stack, download logs — tudo escreve em `fiscal_audit_log`.

Rotas adicionadas em `FounderLayout` + `App.tsx` sob `FounderGate`.

---

## Entrega D — Notificações + Resiliência + Perf (Fases 6 + 8 + 10)

Fase 6: após sucesso, enfileirar `SEND_FISCAL_NOTIFICATION` (email/whatsapp/portal). Falha fiscal → `system_alerts` para Founder/Admin. **Sem bloquear a venda.**

Fase 8: suíte `src/tests/e2e/fiscal-resilience.test.tsx` cobrindo worker off, timeout, storage down, PDF/QR fail, retry, DLQ, reprocessamento, duplicação (idempotência por `sale_id`).

Fase 10: coletar métricas via `pg_stat_statements` + timing no worker, expor em `founder_fiscal_metrics`.

---

## Detalhes técnicos-chave

- Toda emissão fiscal permanece **assíncrona** e desacoplada de `pos_complete_sale` (mantido de Sprint 1.0)
- Idempotência: `background_tasks.payload->>'sale_id'` + índice único parcial evita duplicação
- Hash: `encode(digest(canonical_json, 'sha256'), 'hex')` via `pgcrypto`
- Sem alteração em `sales`, `sale_items`, triggers `trg_financial_tx_*`, `syncQueue`

## Recomendação

Começar por **Entrega A** (menor risco, fundação obrigatória para B/C/D). Peça aprovação antes de cada próxima entrega.

Confirma que devo iniciar pela **Entrega A**?
