# Unificação Operacional — POS, Caixa e Equipa

Hoje existem duas fontes de utilizadores em paralelo: `LocalSellers` (no `LocalPOSContext`, persistido em IndexedDB/localStorage) e o sistema oficial (`company_users` + `profiles` + `user_roles`). Isso causa divergências entre POS, Caixa, Equipa e dropdowns. Este sprint elimina a fonte local e centraliza tudo numa única origem auditável via RBAC (`user_has_permission('sales.create')`).

## 1. Backend — fonte única de operadores

Migração nova (`..._team_members_view.sql`):

- `CREATE OR REPLACE FUNCTION public.view_team_members(p_company_id uuid, p_branch_id uuid DEFAULT NULL, p_permission text DEFAULT NULL)` — `SECURITY DEFINER`, `SET search_path = public`.
  - Retorna: `user_id, full_name, email, role_label, branch_id, branch_name, is_active, has_permission`.
  - Faz `JOIN` em `company_users → profiles → user_roles → roles`, filtrando por `is_active = true`, empresa e filial actuais.
  - Quando `p_permission` é passada, usa `public.user_has_permission(user_id, p_permission)` para filtrar (POS → `sales.create`, Caixa → `cash.open`).
- `GRANT EXECUTE ON FUNCTION public.view_team_members(...) TO authenticated, service_role;`
- Index helper se faltar: `(company_users.company_id, company_users.is_active)`.

Sem `CREATE TABLE` novo; nenhuma tabela é alterada — só uma RPC de leitura, totalmente compatível com dados existentes.

## 2. Hook único `useTeamMembers`

`src/hooks/useTeamMembers.ts` (novo):

- `useTeamMembers({ permission?, branchId? })` → React Query com `queryKey = ['team-members', companyId, branchId, permission]`.
- `staleTime: 60s`; `enabled` apenas quando `appReady`.
- Retorna `{ members, isLoading, refetch }`. Cada `member` traz `{ id, name, role, branchName, isActive, hasPermission }`.
- Centraliza a única chamada a `supabase.rpc('view_team_members', ...)`.

Realtime/eventos para invalidação (`src/lib/teamEvents.ts`):

- Pequeno `EventTarget` global emitindo `USER_CREATED | USER_UPDATED | ROLE_CHANGED | BRANCH_CHANGED`.
- `useTeamMembers` faz `queryClient.invalidateQueries(['team-members'])` ao receber qualquer um.
- `manage-team-member` (edge) e páginas de edição passam a disparar esses eventos após sucesso.

## 3. Remover fonte local de vendedores

`src/contexts/LocalPOSContext.tsx`:

- Apagar estado `sellers`, `addSeller`, `updateSeller`, `deleteSeller`, persistência IndexedDB de sellers.
- Manter cart, stores, products, sales, cash registers (não tocar lógica POS).
- Adicionar atalho `getActiveSellers()` que delega a `useTeamMembers({ permission: 'sales.create' })` — mas a forma preferida é o hook directo.

`src/pages/LocalSellersPage.tsx`:

- Substituir listagem local por `useTeamMembers()` (sem filtro de permissão — mostra equipa toda).
- Criação/edição continua via `supabase.functions.invoke('manage-team-member', ...)` (já existente). Após sucesso → `emit('USER_CREATED')`.
- Toggle activo/desactivo passa a actualizar `company_users.is_active` via RPC dedicada (ou `update`), não estado local.
- Manter a UI; mudar apenas a fonte de dados e os handlers.

`src/contexts/LocalSellerAuthContext.tsx`:

- Marcar deprecated; ponto de login do vendedor passa a usar Supabase Auth normal (já é o padrão na app). Se ainda for usado em rota, mapear para `useAuth`.

## 4. POS — dropdown de vendedor

`src/pages/LocalPOSPage.tsx` (e qualquer `SellerSelect` interno):

- Substituir `useLocalPOS().sellers` por `useTeamMembers({ permission: 'sales.create', branchId: currentBranchId })`.
- Item da lista mostra `nome • cargo • filial • estado`. Inactivos são escondidos.
- Se a lista estiver vazia → mostrar empty state com link para `/app/equipa`.

## 5. Caixa

`src/pages/LocalCashRegisterPage.tsx`:

- Ao abrir caixa: dropdown de operador usa `useTeamMembers({ permission: 'cash.open' })`.
- Ao fechar caixa: validar `session.user_id === currentAuthUserId || hasPerm('cash.close_any')`. Caso contrário, bloquear com toast e logar em `audit_logs`.
- Manter o fix do sprint anterior (status único por loja via `get_cash_status`).

## 6. Outros call-sites a migrar

Trocar leitura local por `useTeamMembers`:

- `src/components/hr/SellerRanking.tsx`
- `src/pages/StockTransferPage.tsx` (selector de operador)
- `src/pages/LocalReportsPage.tsx` (filtro por vendedor)
- `src/pages/BIDashboardPage.tsx` (filtro por vendedor)
- `src/components/monetization/LimitWarning.tsx` (contagem de utilizadores)
- `src/pages/LocalSettingsPage.tsx` (qualquer secção “Vendedores”)

`ResellersNetworkPage.tsx` é domínio diferente (afiliados) — fora do escopo.

## 7. Testes

E2E em `src/tests/e2e/team-pos-unification.test.tsx` (novo):

1. Criar utilizador via `manage-team-member` com role `seller` → aparece em Equipa, POS e dropdown de Caixa.
2. Criar utilizador com role `viewer` (sem `sales.create`) → aparece em Equipa mas **não** no POS nem na Caixa.
3. Fluxo: abrir caixa → fazer venda → fechar caixa, validando que `cash_registers.user_id` bate com o operador escolhido.
4. Após `ROLE_CHANGED`, cache do POS é invalidada e o utilizador aparece/desaparece sem reload.

Actualizar `workflow.test.tsx` e `report-generation.test.tsx` para deixar de usar mocks de `sellers` locais.

## 8. Entregáveis

- Migração: `view_team_members` RPC + GRANTs.
- Novo hook: `useTeamMembers`, novo bus: `teamEvents`.
- `LocalPOSContext` sem sellers; `LocalSellersPage` migrada.
- POS, Caixa, Ranking, Transfers, Reports, BI a consumir a RPC.
- 4 testes E2E novos + 2 actualizados.
- Métrica: medir tempo de carregamento do POS antes/depois (`performance.now()` no `LocalPOSPage` mount) e anexar ao relatório de sprint.

## 9. Riscos & compatibilidade

- Utilizadores que só existiam localmente (sem `auth.users`) deixam de aparecer. Mitigação: script de migração one-shot que detecta `localStorage.sellers`, mostra um modal listando-os e instrui o admin a recriá-los via Equipa. Não importamos automaticamente para evitar criar `auth.users` órfãos.
- Sessões de caixa antigas com `user_id` apontando para um seller local ficam intactas (histórico preservado); apenas novas operações exigem `auth.uid`.
- Nenhuma tabela é dropada; nenhum dado existente é apagado.
