# Unificação Operacional POS + Equipa — Fase Final

A base já está feita: `view_team_members()` RPC, hook `useTeamMembers`, bus `teamEvents`, dropdown do POS (`sales.create`), caixa filtrada por `cash.open` e validação de fecho. Falta remover a fonte local (`LocalSellers`) e migrar os call-sites restantes que ainda leem `useLocalPOS().sellers` ou fazem query própria.

## 1. Purga da fonte local em `LocalPOSContext`

`src/contexts/LocalPOSContext.tsx`:

- Remover do state: `sellers`, `LocalSeller` interface exposta, initial `sellers: []`.
- Remover do contract: `sellers`, `addSeller`, `updateSeller`, `deleteSeller`.
- Remover implementações e o mapeamento em `loadData` (`profilesRes → sellers`).
- Manter apenas: cart, products, stores, sales, cash registers, sync.

Isto é a "fonte removida" pedida no brief. Nenhum outro módulo pode continuar a ler `useLocalPOS().sellers`.

## 2. Migrar call-sites restantes para `useTeamMembers`

Todos passam a consumir a mesma origem oficial:

- `src/pages/LocalSellersPage.tsx` — listagem passa a `useTeamMembers()` (sem filtro de permissão, mostra equipa toda com estado). Criar/editar continua via edge function `manage-team-member`; após sucesso emite `USER_CREATED` / `USER_UPDATED`.
- `src/pages/LocalReportsPage.tsx` — filtro "Vendedor" alimentado por `useTeamMembers({ permission: 'sales.create' })`.
- `src/pages/BIDashboardPage.tsx` — agregação de top-sellers continua sobre `sales`, mas o mapa id→nome vem de `useTeamMembers()` (evita depender de `sales.seller_name` colado).
- `src/pages/StockTransferPage.tsx` — a query `['sellers-for-transfer']` cai; passa a `useTeamMembers({ permission: 'sales.create' })` (transferências são para vendedores).
- `src/components/hr/SellerRanking.tsx` — o cálculo do ranking mantém-se sobre `sales`, mas a lista base de vendedores usa `useTeamMembers({ permission: 'sales.create' })`.
- `src/components/monetization/LimitWarning.tsx` — quando `resource === 'sellers'`, contagem vem de `useTeamMembers().members.length` (não do state local).
- `src/pages/LocalSettingsPage.tsx` — só usa labels de `t('sellers.*')`, sem dependência de dados; nada a mudar.

`ResellersNetworkPage.tsx` é domínio de afiliados, fora do escopo.

## 3. Dropdown do POS — exibição rica

Já implementado. Confirmar que mostra `nome • cargo • filial` e esconde inativos (o hook já expõe `activeMembers`). Adicionar tooltip "Sem permissão sales.create" no empty state, já ligado a `/app/equipa`.

## 4. Cache — eventos que já invalidam

O hook já ouve `team:ANY`. Garantir que os pontos de mutação emitem os 4 eventos do brief:

- `USER_CREATED` — em `manage-team-member` success handlers de `LocalSellersPage`, `CompanyUsersPage`, `IAMPage` (já emitido).
- `USER_UPDATED` — idem em updates.
- `ROLE_CHANGED` — em `IAMPage` ao alterar role/permissão.
- `BRANCH_CHANGED` — quando `company_users.branch_id` muda em qualquer página de gestão.

Auditar os 3 ficheiros e adicionar `emitTeamEvent('ROLE_CHANGED')` / `'BRANCH_CHANGED'` onde faltar.

## 5. Testes

Novo `src/tests/e2e/team-pos-unification.test.tsx`:

1. Criar utilizador com role `seller` via `manage-team-member` → aparece em Equipa **e** no dropdown do POS **e** no dropdown de abertura de Caixa.
2. Criar utilizador com role `viewer` (sem `sales.create`) → aparece em Equipa mas **não** aparece no POS nem na Caixa.
3. Fluxo completo: abrir caixa (operador X) → registar venda (mesmo X selecionado no POS) → fechar caixa validando que `cash_registers.user_id = X` e a venda ficou com `sales.user_id = X`.
4. Após emitir `ROLE_CHANGED`, cache do POS é invalidada e o utilizador aparece/desaparece do dropdown sem reload.

Atualizar `workflow.test.tsx` e `report-generation.test.tsx` para não mockar `sellers` locais — passam a mockar `supabase.rpc('view_team_members')`.

## 6. Métrica de tempo de carregamento

Instrumentar `LocalPOSPage`:

```ts
useEffect(() => {
  const t0 = performance.now();
  return () => console.log('[POS] mount duration ms', performance.now() - t0);
}, []);
```

Reportar antes/depois no entregável.

## Entregáveis

- `sellers` removido de `LocalPOSContext` (fonte única eliminada).
- 6 call-sites migrados para `useTeamMembers`.
- Emissão dos 4 eventos de invalidação nos pontos de mutação.
- 4 novos testes E2E + 2 atualizados.
- Nota de performance: tempo de mount do POS antes vs depois.

## Riscos

- Utilizadores que só existiam em `LocalSellers` (sem `auth.users`) desaparecem — expected. Mostrar toast único "N vendedores locais migrados: recriar em /app/equipa" com base num check de `localStorage`.
- Sessões de caixa antigas com `user_id` de seller local ficam intactas (histórico preservado); apenas novas operações exigem `auth.uid`.
- Nenhuma tabela é dropada; nenhum dado é apagado.
