# SPRINT 11.2 — EXECUÇÃO REAL DA AUDITORIA TÉCNICA (SEM DOCUMENTAÇÃO)

MISSÃO

A partir desta Sprint é TERMINANTEMENTE PROIBIDO:

❌ Criar documentação.
❌ Atualizar docs/SPRINT_11.md.
❌ Criar novos protocolos.
❌ Gerar relatórios genéricos.
❌ Responder apenas com "documentação consolidada".

Toda a documentação necessária já existe.

Esta Sprint é exclusivamente para INSPECIONAR O CÓDIGO REAL.

==================================================

MODO OBRIGATÓRIO

🛡 READ ONLY

🛡 EVIDENCE FIRST

🛡 ROOT CAUSE FIRST

🛡 ZERO REGRESSION

🛡 NÃO MODIFICAR CÓDIGO

==================================================

OBJETIVO

Abrir os arquivos reais do projeto.

Ler todo o fluxo.

Produzir um relatório técnico baseado exclusivamente em evidências encontradas no código.

Não assumir.

Não inferir.

Não inventar.

Somente fatos encontrados.

==================================================

AUDITAR COMPLETAMENTE

1.
src/pages/LocalCashRegisterPage.tsx

2.
src/contexts/CashRegisterContext.tsx

3.
src/pages/LocalPOSPage.tsx

4.
src/contexts/LocalPOSContext.tsx

5.
src/components/pos/PaymentModal.tsx

6.
src/components/reports/ThermalReceipt.tsx

7.
Pipeline de Venda

8.
Pipeline Fiscal

9.
Pipeline de Stock

10.
Pipeline Loja Online

11.
Pipeline Dashboard

12.
RPCs relacionadas

13.
Hooks

14.
Contexts

15.
Dialogs

16.
Overlays

17.
Body Lock

18.
Scroll Lock

19.
Pointer Events

20.
QuantityEditor

==================================================

PARA CADA ARQUIVO RESPONDER

Arquivo:

Função:

Linha aproximada:

Responsabilidade:

Fluxo executado:

Dependências:

Quem chama:

Quem consome:

Possíveis efeitos colaterais:

==================================================

PROCURAR

✓ Race Conditions

✓ Stale State

✓ Renderizações duplicadas

✓ Loops

✓ Deadlocks

✓ Body Lock

✓ Overlay preso

✓ Scroll Lock

✓ Pointer Events presos

✓ RPC duplicada

✓ Atualizações perdidas

✓ Transações incompletas

✓ Rollback incompleto

✓ Stock inconsistente

✓ Venda inconsistente

✓ Caixa inconsistente

✓ Dashboard inconsistente

✓ Loja Online inconsistente

==================================================

PARA CADA PROBLEMA ENCONTRADO

Gerar exatamente neste formato:

--------------------------------------------------

ID:

P0-001

Arquivo:

Função:

Linha aproximada:

Problema encontrado:

Evidência:

Causa raiz:

Impacto:

Risco:

Prioridade:

Sugestão técnica:

Tempo estimado:

--------------------------------------------------

Não agrupar problemas.

Cada problema deve possuir seu próprio bloco.

==================================================

NO FINAL GERAR

1.
Mapa completo do fluxo POS

↓

2.
Mapa do fluxo Caixa

↓

3.
Mapa do fluxo Fiscal

↓

4.
Mapa do fluxo Estoque

↓

5.
Mapa Loja Online

↓

6.
Mapa Dashboard

↓

7.
Mapa RPC

↓

8.
Mapa Contextos

↓

9.
Lista completa dos problemas encontrados

↓

10.
Matriz de risco

↓

11.
Dependências

↓

12.
Ordem correta de correção

==================================================

CLASSIFICAR

🔴 P0

🟠 P1

🟡 P2

🔵 P3

==================================================

PROIBIDO

❌ Alterar qualquer arquivo

❌ Criar migrations

❌ Alterar RPC

❌ Alterar RLS

❌ Alterar Hooks

❌ Alterar Contexts

❌ Alterar POS

❌ Alterar Billing

❌ Alterar Fiscal

❌ Alterar CRM

❌ Alterar Inventário

❌ Alterar Loja Online

❌ Alterar Dashboard

==================================================

RESULTADO ESPERADO

Não quero documentação.

Não quero protocolo.

Não quero planejamento.

Quero apenas evidências reais encontradas no código.

A Sprint somente será considerada concluída quando existir uma lista completa de todos os problemas P0, P1, P2 e P3 encontrados, cada um contendo:

• Arquivo
• Função
• Linha aproximada
• Evidência
• Causa raiz
• Impacto
• Prioridade
• Sugestão técnica

Somente após essa auditoria completa será autorizada a Sprint 11.3 para implementação das correções.