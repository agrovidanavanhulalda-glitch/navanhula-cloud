# 👑 FASE 2 — FOUNDER CONTROL CENTER

Painel exclusivo acima do Dashboard CEO, visível **apenas** para contas com `is_founder = true` ou `account_type = 'FOUNDER'`. Construído sobre a Fase 1 (já entregou `profiles.is_founder`, `is_founder()`, gates bypass, `useAuth().isFounder`).

Dado o escopo (13 subseções + backend), proponho entregar em 4 marcos incrementais. Cada marco fecha 100% funcional (nada de placeholders vazios). Confirme antes de começarmos, ou diga "vai" para eu executar os 4 marcos em sequência.

---

## Marco 1 — Fundação, Rota e Guarda

**Backend (1 migration)**
- View `founder_platform_stats` — counts globais (empresas, lojas, users, clientes, subs ativas, trials, bloqueadas, MRR/receita total).
- View `founder_infrastructure_stats` — count de tables/views/functions/policies/buckets/triggers/cron via `information_schema` + `pg_catalog`.
- RPCs `SECURITY DEFINER` que retornam essas views **apenas se `is_founder(auth.uid())`** — caso contrário `RAISE EXCEPTION 'forbidden'`. Grants para `authenticated`.
- Tabela `feature_flags` (key, enabled, description, updated_by, updated_at) + RLS: SELECT authenticated, WRITE só founder. Seed: `pos, erp, crm, hr, finance, fiscal, ecommerce, marketplace, ai, public_api`.
- Tabela `founder_audit_log` (actor_id, action, target_type, target_id, metadata jsonb, created_at) + RLS founder-only.

**Frontend**
- `src/components/auth/FounderGate.tsx` — redireciona não-founders para `/app`.
- Rota `/app/founder/*` em `App.tsx` protegida por `FounderGate`.
- `src/pages/founder/FounderLayout.tsx` — sub-nav (Dashboard, Empresas, Utilizadores, Assinaturas, Infra, Feature Flags, Simulação, Auditoria, Configurações).
- Item de menu 👑 **Founder** no `Sidebar.tsx` — renderizado **antes** do "Dashboard CEO" e **só quando `isFounder`**.
- Badge dourado permanente no header do `MainLayout` quando `isFounder`: `👑 FOUNDER · MAX ENTERPRISE · LIFETIME` (gradient dourado semântico via token `--founder`).

---

## Marco 2 — Dashboard Global (4 abas)

Página `FounderDashboardPage.tsx` com Tabs:

1. **Plataforma** — cards com KPIs de `founder_platform_stats` (Empresas, Lojas, Users, Clientes, Assinaturas, MRR, Receita Total, Trial Ativos/Expirados, Bloqueadas, Ativas).
2. **Infraestrutura** — DB size (`pg_database_size`), tables/views/rpcs/policies/buckets/triggers/cron, edge functions (lista estática do repo + status via RPC).
3. **Sistema** — Versão (`package.json`), Build (`import.meta.env`), Ambiente, Deploy time (build timestamp), Status/Uptime/Latência (ping ao Supabase mede RTT).
4. **Monitorização** — Sessões ativas (contagem em `user_sessions` últimos 5min), Users online, Empresas online, API calls (agrega `api_request_logs` últimos 60min). CPU/RAM/Storage marcados como "n/d em serverless" com explicação — não inventamos números.

Realtime: `useQuery` com `refetchInterval: 10s`.

---

## Marco 3 — Gestão (Empresas, Utilizadores, Assinaturas, Feature Flags)

- **`FounderCompaniesPage`** — DataTable de `companies`: ver/editar/suspender (`status`)/ativar/excluir (soft delete)/**Entrar como** (impersonation via `impersonation_sessions` já existente).
- **`FounderUsersPage`** — DataTable global de `profiles`+`user_roles`: editar, reset password (edge function `admin-reset-password`), alterar plano/role, **Tornar/Remover Founder** (chama RPC que respeita o trigger `trg_protect_founder_flag` da Fase 1), bloquear/desbloquear.
- **`FounderSubscriptionsPage`** — CRUD sobre `subscriptions`: criar/alterar plano, renovar, cancelar, **Licença Vitalícia** (`expires_at = null, plan = 'MAX_ENTERPRISE'`), liberar/estender trial.
- **`FounderFeatureFlagsPage`** — toggles sobre `feature_flags` + hook `useFeatureFlag(key)` para consumo global. Inclui toggle **Developer Mode**.

Toda mutação escreve em `founder_audit_log`.

**Edge functions novas**
- `founder-admin` — endpoint único, valida `is_founder`, roteia ações sensíveis (reset password via `auth.admin`, impersonation, delete empresa em cascata).

---

## Marco 4 — Simulação, Auditoria, Backup, Configurações, APIs

- **`FounderSimulationPage`** — dropdown "Simular como" (Cliente/Loja/Empresa/Caixa/Supervisor/CEO). Usa `impersonation_sessions` + banner persistente "🎭 Modo Simulação — sair". Read-only enforcement por flag na sessão (writes bloqueados em edge functions quando `x-simulation: true`).
- **`FounderAuditPage`** — consolidação de `audit_logs`, `auth_event_logs`, `payment_logs`, `founder_audit_log`, `system_errors`. Filtros por tipo/data/usuário.
- **`FounderBackupPage`** — Backup manual (edge function → `pg_dump` via RPC lógico export por tabelas, salva em bucket `founder-backups`), listagem, restaurar (com dupla confirmação). Backup automático: cron `pg_cron` diário.
- **`FounderEdgeFunctionsPage`** — lista funções do repo + status (health-check) + link para logs.
- **`FounderApisPage`** — agrega `api_request_logs`: total, latência média, falhas, top endpoints.
- **`FounderSettingsPage`** — edita config global (nova tabela `platform_settings` singleton: nome, logo, cores, idioma default, timezone, IVA, moeda, planos disponíveis, duração trial). Founder-only RW.

---

## Segurança (transversal)

- Toda RPC/edge usada pelo painel valida `public.is_founder(auth.uid())` no primeiro statement. Falha = `403 forbidden`.
- Todas as tabelas novas: RLS ON + policies founder-only + GRANTs corretos (`authenticated` SELECT quando aplicável, `service_role` ALL).
- Rotas `/app/founder/*` duplamente protegidas: `FounderGate` no frontend + validação no backend (defense in depth).

---

## Critérios de aceitação mapeados

| Requisito | Marco |
|---|---|
| Menu 👑 Founder antes do CEO | 1 |
| Badge dourado permanente | 1 |
| Dashboard exclusivo (4 abas) | 2 |
| Controle Global / Empresas / Assinaturas | 3 |
| Feature Flags + Developer Mode | 3 |
| Infraestrutura / Monitorização | 2 |
| Simulação de utilizadores | 4 |
| Auditoria / Logs | 4 |
| Backup manual/automático | 4 |
| Segurança `is_founder` obrigatória | Todos |

---

## Detalhes técnicos

- Design tokens novos em `index.css`: `--founder-gold`, `--founder-gold-glow` (HSL). Nada de `bg-yellow-500` hard-coded.
- Query keys namespacadas: `['founder', 'stats']`, `['founder', 'companies']`, etc.
- Todas as páginas com `ErrorBoundary` local e skeleton loaders.
- i18n: strings em `pt` (default do projeto) — não bloqueia demais idiomas nesta fase.

**Confirma para eu executar? Posso ir marco a marco (aguardando validação entre eles) ou executar tudo em sequência — diga a preferência.**
