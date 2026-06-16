
# Fase 1 — Arquitetura Enterprise RBAC + Multiempresa

Objetivo: introduzir um modelo organizacional escalável (Tenant → Empresa → Filial → Departamento → Equipa → Utilizador) com permissões granulares `modulo.acao` e escopos (GLOBAL/EMPRESA/FILIAL/DEPARTAMENTO), **sem quebrar dados existentes** e sem novas features de UI.

## 1. Diagrama organizacional

```text
tenants (NEW)
  └── companies (EXISTENTE — ganha tenant_id)
        └── branches (EXISTENTE)
              └── departments (NEW)
                    └── teams (NEW)
                          └── users (auth.users)

roles (EXISTENTE)──┐
                   ├── role_permissions (EXISTENTE, expandido com scope)
permissions (EXIST)┘

user_roles (EXISTENTE — expandido: company_id, branch_id, department_id, scope)
user_permissions (NEW — overrides por utilizador)
```

## 2. Tabelas

**Novas**
- `tenants` — agrupa empresas de um mesmo cliente raiz (id, name, slug, owner_user_id, is_active).
- `departments` — (id, company_id, branch_id NULL, name, code, parent_department_id, manager_id).
- `teams` — (id, department_id, name, lead_user_id).
- `user_permissions` — overrides finos (id, user_id, permission_id, scope, company_id, branch_id, department_id, granted/revoked).

**Existentes alteradas (aditivo, nunca destrutivo)**
- `companies` + `tenant_id uuid REFERENCES tenants(id)` (nullable; backfill 1 tenant default por owner).
- `roles` + `is_system boolean default false`, `scope_default text`, `level int`.
- `permissions` + `module text`, `action text` (derivados da `key`).
- `role_permissions` + `scope text default 'COMPANY'` (GLOBAL/COMPANY/BRANCH/DEPARTMENT).
- `user_roles` + `branch_id uuid`, `department_id uuid`, `scope text default 'COMPANY'`.

**Enum novo**: `permission_scope` (`GLOBAL`,`COMPANY`,`BRANCH`,`DEPARTMENT`).

## 3. Permissões padrão (seed)

Formato `modulo.acao`. Inseridas via `INSERT ... ON CONFLICT (key) DO NOTHING`:

- `users.create|edit|delete|view`
- `sales.view|create|cancel`
- `cash.open|close|view`
- `finance.view|approve|export`
- `hr.payroll|attendance|view`
- `reports.view|export`
- `settings.manage`
- `inventory.view|adjust`
- `branches.manage`
- `roles.manage`

## 4. Papéis padrão (seed em `roles`)

OWNER, CEO, COO, CFO, CHRO, CTO, ADMIN_MASTER, ADMIN_RH, ADMIN_CONTABILIDADE, ADMIN_COMERCIAL, GERENTE, SUPERVISOR, CONTABILISTA, RH, CAIXA, VENDEDOR, VISITANTE — com `level` e `scope_default`:

- OWNER → GLOBAL, level 100
- CEO → COMPANY, level 90
- CxO / ADMIN_MASTER → COMPANY, level 80
- ADMIN_* → COMPANY, level 70
- GERENTE → BRANCH, level 50
- SUPERVISOR → DEPARTMENT, level 40
- CONTABILISTA/RH → COMPANY, level 30
- CAIXA/VENDEDOR → BRANCH, level 20
- VISITANTE → COMPANY, level 0

Mapeamento de `role_permissions` semeado para cada papel (somente system roles; cargos custom continuam configuráveis).

## 5. Middleware de autorização

Funções SECURITY DEFINER (substituem checagens espalhadas; mantêm `has_role` para compat):

- `current_tenant_id()`, `current_company_id()` (já existe), `current_branch_ids()`, `current_department_ids()`.
- `user_has_permission(_user uuid, _key text, _company uuid DEFAULT NULL, _branch uuid DEFAULT NULL, _department uuid DEFAULT NULL) returns boolean` — resolve: OWNER → true; senão união de `role_permissions` (via `user_roles`) + `user_permissions` (overrides), respeitando escopo.
- `require_permission(_key text, …)` — usado em RLS/edge functions.

Frontend: hook `usePermission('sales.create', { branch_id })` que chama a RPC e cacheia. Componentes existentes que usam `has_role` continuam funcionando (compat).

## 6. Compatibilidade

- Toda alteração é aditiva (nenhuma coluna existente removida/renomeada).
- `app_role` enum mantém-se; é mapeado para os novos `roles.key` via tabela `roles` (já existe coluna `key`).
- Trigger `handle_new_auth_user` ajustado para também popular `user_roles.branch_id`/`department_id` quando presentes em metadata.
- Migração de backfill: cria 1 `tenant` por `companies.owner_user_id` distinto e preenche `companies.tenant_id`.

## 7. Migrações (ordem)

1. `tenants`, `departments`, `teams`, `user_permissions` + GRANTs + RLS + policies por `current_company_id()`.
2. ALTERs aditivos em `companies`, `roles`, `permissions`, `role_permissions`, `user_roles`.
3. Funções `user_has_permission`, `require_permission`, helpers de escopo.
4. Seed de `permissions` e `roles` (idempotente).
5. Backfill `tenant_id` e `permissions.module/action` derivados de `key`.

## 8. Impacto

- **Banco**: 4 tabelas novas, 5 alteradas (aditivo). Sem perda de dados.
- **Edge functions**: `manage-team-member` aceita `branch_id`/`department_id` opcionais (já parcialmente suporta); valida via `user_has_permission('users.create', …)`.
- **Frontend**: nenhum redesign. Apenas:
  - novo hook `usePermission`;
  - `CompanyUsersPage`/`IAMPage` passam a listar permissões/escopos (mesma UI, novas colunas opcionais — fora do escopo desta fase salvo necessidade).
- **RLS**: tabelas críticas ganham policies adicionais usando `user_has_permission`, mantendo as atuais como fallback.

## 9. Testes

- Unit (pg): `user_has_permission` para OWNER, CEO multi-empresa, GERENTE com escopo BRANCH, VENDEDOR sem `sales.cancel`.
- Integration: criar utilizador com papel GERENTE + branch → consegue `sales.create` só nessa filial.
- E2E (vitest existentes): `auth-flow`, `role-enforcement` estendidos com cenário de escopo BRANCH e override via `user_permissions`.
- Regressão: rodar suite atual; checar que `has_role`/`get_user_company_ids` continuam respondendo igual.

## 10. Fora desta fase
- UI de gestão de departamentos/equipas/permissões granulares.
- Migração dos call-sites legados de `has_role` → `user_has_permission` (gradual em fase 2).
- Billing/limites por tenant.

Após aprovação, começo pelas migrações na ordem acima (uma migration por bloco) e só depois ajusto edge function + hook `usePermission`.
