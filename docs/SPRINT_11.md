# SPRINT 11.1.C — EXECUÇÃO DA AUDITORIA E RELATÓRIO FINAL DE EVIDÊNCIAS

## MISSÃO

Executar integralmente a auditoria técnica definida nas Sprints 11.1, 11.1.A e 11.1.B.

Nesta Sprint NÃO criar documentação adicional.

Nesta Sprint NÃO implementar correções.

O único objetivo é produzir um relatório técnico completo do estado atual do POS.

Todas as conclusões deverão ser comprovadas por evidências reais do código.

Não fazer suposições.

Não inventar causas.

Não mascarar problemas.

Se um problema não puder ser comprovado, informar explicitamente.

---

# PADRÃO OBRIGATÓRIO

🛡️ READ ONLY

🛡️ ROOT CAUSE FIRST

🛡️ EVIDENCE FIRST

🛡️ ZERO CODE CHANGES

🛡️ ZERO REGRESSION

---

# AUDITORIA P0 — FECHO DE CAIXA

Reconstruir todo o fluxo de execução.

Mapear:

Abrir Caixa

↓

Venda

↓

Pagamento

↓

Documento Fiscal

↓

Movimento Financeiro

↓

Atualização Dashboard

↓

Atualização Stock

↓

Fechar Caixa

↓

Persistência

↓

Atualização Final

Para cada etapa identificar:

• componente

• hook

• função

• contexto

• RPC

• query

• estado React

• efeitos colaterais

• dependências

---

# RESPONDER COM EVIDÊNCIAS

Existe:

□ race condition?

□ dupla atualização?

□ await interrompido?

□ estado órfão?

□ overlay persistente?

□ dialog preso?

□ pointer-events residual?

□ body lock residual?

□ scroll lock?

□ renderização duplicada?

□ sincronização parcial?

□ rollback?

□ tratamento de erro?

Cada resposta deve conter:

Arquivo

Função

Linha aproximada

Explicação

Impacto

---

# AUDITORIA P0 — STOCK

Reconstruir completamente a cadeia de atualização.

Verificar:

Venda POS

↓

Venda Loja Online

↓

Inventory

↓

Dashboard

↓

CRM

↓

Relatórios

↓

Histórico

Responder:

Quem reduz o stock?

Quem atualiza?

Quando atualiza?

Como atualiza?

Existe sincronização?

Existe atraso?

Existe duplicação?

Existe concorrência?

Existe inconsistência?

---

# AUDITORIA P0 — PERFORMANCE

Auditar:

useEffect

useMemo

useCallback

Context Providers

Suspense

Virtualização

Re-renderizações

Loops

Estados duplicados

Informar apenas problemas comprovados.

---

# AUDITORIA P0 — UX OPERACIONAL

Verificar:

Carrinho

Quantidade

Editor de Quantidade

Checkout

PaymentModal

ThermalReceipt

CashRegister Dialog

Dashboard

Responsividade

Centralização das telas

Espaçamento

Hierarquia visual

Touch targets

Navegação por teclado

Acessibilidade

---

# CLASSIFICAÇÃO DOS PROBLEMAS

Todos os problemas encontrados devem ser classificados:

🔴 P0 — Bloqueador absoluto

🟠 P1 — Crítico

🟡 P2 — Médio

🔵 P3 — Melhoria

---

# MÓDULOS PROTEGIDOS

É proibido modificar:

POS Engine

Fiscal

Billing

CRM

Auth

Supabase

RLS

RPC

Edge Functions

Workers

Inventário

Dashboard

---

# SUBAGENTES

🎨 UI Architect

🗄️ Supabase Engineer

🔍 Code Auditor

🧪 Testing Agent

🚀 Performance Engineer

🔌 POS Integration Engineer

Todos devem produzir evidências.

---

# RELATÓRIO FINAL OBRIGATÓRIO

1. Resumo Executivo

2. Fluxograma completo do Fecho de Caixa

3. Fluxograma completo da Venda

4. Fluxograma completo da Atualização de Stock

5. Fluxograma completo da Loja Online

6. Lista de Problemas

7. Causa Raiz

8. Evidências

9. Grau de risco

10. Ordem recomendada de correção

11. Esforço estimado por correção

12. Dependências entre correções

13. Quality Gate

14. Veredito Final

Responder obrigatoriamente:

🟢 PRODUCTION READY

ou

🟡 CONDITIONAL GO

ou

🔴 NOT READY

Caso o resultado seja NOT READY ou CONDITIONAL GO, listar exatamente quais bloqueadores impedem a certificação Production Ready.

IMPORTANTE:

Nenhuma correção deverá ser implementada nesta Sprint.

A Sprint 11.2 será exclusivamente dedicada à eliminação dos problemas P0 encontrados nesta auditoria.
