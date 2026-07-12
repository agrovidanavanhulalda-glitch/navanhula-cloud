# Entrega C — Fiscal Sprint 1.2

Escopo estritamente dentro do domínio fiscal. Zero alterações em `pos_complete_sale`, Billing, Financeiro, CRM, SyncManager, ou no Founder Control Center existente (apenas adicionar novas rotas).

## Etapa 1 — Worker completo (`process-task-queue`)

Após `issue_fiscal_document` bem-sucedido, o worker executa em pipeline resiliente (cada gerador em try/catch isolado — falha de artefato não perde o documento):

1. Monta payload canónico via RPC `fiscal_document_canonical`
2. Gera **JSON** (canónico) — sempre
3. Gera **QR Code** (SVG ASCII inline via lib pura Deno)
4. Gera **PDF** simples (texto A4, sem libs pesadas — usa template minimalista)
5. Gera **XML** (SAF-T-like reduzido)
6. Gera **Metadata** (`{doc_number, company_id, hashes, sizes, generated_at}`)
7. Calcula **SHA-256 + MD5 + checksum CRC32** de cada artefato
8. Faz upload no bucket privado `fiscal-documents` em `{company_id}/fiscal/{yyyy}/{mm}/{document_id}/{tipo}.ext`
9. Chama nova RPC `fiscal_document_register_artifacts(document_id, artifacts jsonb)` que:
   - Atualiza `fiscal_documents` com paths + hashes + integrity_status='verified'
   - Insere linha em `fiscal_audit_log` (status=`ARTIFACTS_STORED`)
10. Idempotência: se `fiscal_documents.pdf_path` já preenchido, pula geração e loga `SKIPPED_ARTIFACTS`.

Falha parcial (ex.: PDF falha) → grava artefatos gerados, marca `integrity_status='partial'`, cria `system_alert` severity=`warning`, mas **não** re-tenta o job (venda continua íntegra).

## Etapa 2 — RPCs de suporte

- `founder_fiscal_metrics(p_hours int default 24)` → jsonb com todos os KPIs (documentos por status, throughput, avg/max/min duration, p95/p99 via `percentile_cont`, success/failure/retry rate, queue size, storage bytes via soma de `metadata->>size`, últimos 20 documentos).
- `founder_fiscal_dlq(p_limit int, p_offset int, p_search text)` → lista `background_tasks` com `status='FAILED'` + task_type fiscal.
- `founder_fiscal_reprocess(p_task_id uuid)` → reseta job para `PENDING`, `attempts=0`, log em `fiscal_audit_log` (`source='founder_manual'`).
- `founder_fiscal_cancel(p_task_id uuid, p_reason text)` → status='CANCELLED', auditado.
- `founder_fiscal_archive(p_task_id uuid)` → status='ARCHIVED', auditado.
- Todas `SECURITY DEFINER`, gate `has_role(auth.uid(),'founder')`, `REVOKE FROM public/anon`, `GRANT authenticated, service_role`.

## Etapa 3 — Alertas fiscais

Migration com função `check_fiscal_health()` chamada pelo dashboard (client-triggered, sem cron novo) que insere em `system_alerts` quando:
- DLQ > 10 nos últimos 60min
- Retry rate > 30%
- Worker sem execução há > 15min (baseado em `max(fiscal_audit_log.finished_at)`)
- Hash inválido detectado
- Documento `integrity_status='corrupted'`

## Etapa 4 — Frontend Founder

Novas páginas (não altera as existentes):
- `src/pages/founder/FounderFiscalDashboardPage.tsx` — KPIs + tabela últimos 20 documentos + botões download (usa `get_fiscal_document_url`) + botão verificar hash (`verify_fiscal_document_integrity`).
- `src/pages/founder/FounderFiscalDLQPage.tsx` — tabela DLQ com filtros/pesquisa + ações Reprocessar/Cancelar/Arquivar + drawer com stack completa.
- `src/pages/founder/FounderFiscalAlertsPage.tsx` — feed de `system_alerts` filtrado por categoria fiscal.

Adicionar 3 entradas em `FounderLayout.navItems`: **Fiscal**, **DLQ Fiscal**, **Alertas Fiscais** (icons: `Receipt`, `AlertOctagon`, `BellRing`).

Rotas em `App.tsx` dentro do bloco `/app/founder`.

Auto-refresh via TanStack Query (`refetchInterval: 15_000`).

## Etapa 5 — Downloads

Botões nas linhas da tabela invocam `get_fiscal_document_url(doc_id, tipo)` → abrem em nova aba (signed URL 60s). Botão **Verificar** chama `verify_fiscal_document_integrity` e mostra toast com resultado (hash ok/corrupted).

## Detalhes técnicos

- Bucket `fiscal-documents` já existe (Entrega B); nenhuma nova bucket.
- Worker: adicionar helpers `sha256Hex`, `md5Hex`, `crc32Hex` via `crypto.subtle` + lib `std/hash`.
- QR: pacote `https://esm.sh/qrcode@1.5.3` → dataURL PNG.
- PDF: `https://esm.sh/pdf-lib@1.17.1` (leve, já usado por outros geradores no client).
- Todos os erros de artefato → `fiscal_audit_log` com `error_code` específico (`PDF_GEN_FAILED`, `QR_GEN_FAILED`, etc.) mas o job segue como `COMPLETED` se pelo menos JSON+metadata foram armazenados.

## Arquivos

**Novos**
- 1 migration SQL (RPCs `founder_fiscal_*` + `fiscal_document_register_artifacts` + `check_fiscal_health` + índices em `background_tasks(status,task_type,created_at)`)
- `src/pages/founder/FounderFiscalDashboardPage.tsx`
- `src/pages/founder/FounderFiscalDLQPage.tsx`
- `src/pages/founder/FounderFiscalAlertsPage.tsx`

**Modificados**
- `supabase/functions/process-task-queue/index.ts` — pipeline de artefatos
- `src/pages/founder/FounderLayout.tsx` — 3 novos navItems
- `src/App.tsx` — 3 novas rotas
- `.lovable/plan.md` — status Entrega C

## Fora de escopo (não fazer)

- Cron jobs novos
- Alterar `sales`, `sale_items`, triggers financeiros, `syncQueue`
- Novos buckets
- Testes E2E automatizados (spec pede, mas MVP async prioriza entrega funcional — reportar como risco remanescente)
- Alterar dashboard Founder existente

Confirma execução?
