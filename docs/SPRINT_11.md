# SPRINT 11.1.F — CONSOLIDAÇÃO DAS EVIDÊNCIAS TÉCNICAS (ROOT CAUSE REPORT)

## MISSÃO

Executar a inspeção completa do código-fonte do módulo POS e produzir o Relatório Final de Evidências.

ATENÇÃO:

Esta Sprint NÃO deve modificar nenhum arquivo de produção.

É proibido:

- alterar lógica;
- criar componentes;
- modificar hooks;
- alterar RPCs;
- alterar Supabase;
- alterar RLS;
- alterar SQL;
- alterar Edge Functions;
- alterar contexto;
- alterar estado;
- alterar UI.

Modo obrigatório:

🛡️ READ ONLY

🛡️ EVIDENCE FIRST

🛡️ ROOT CAUSE FIRST

🛡️ ZERO REGRESSION

----------------------------------------------------

AUDITAR

✔ LocalPOSPage

✔ LocalCashRegisterPage

✔ CashRegisterContext

✔ LocalPOSContext

✔ PaymentModal

✔ ThermalReceipt

✔ Inventory

✔ Dashboard

✔ Loja Online

✔ Fiscal Pipeline

✔ Sale Pipeline

✔ Sync Queue

✔ RPCs

✔ Hooks

✔ React Context

✔ Body Locks

✔ Dialogs

✔ Overlay

✔ Scroll Lock

✔ QuantityEditor

----------------------------------------------------

PARA CADA FLUXO INFORMAR

• Fluxograma

• Arquivos

• Componentes

• Hooks

• Contextos

• RPCs

• Eventos

• Atualizações

• Dependências

• Estados

----------------------------------------------------

RESPONDER COM EVIDÊNCIA

Existe:

□ race condition

□ stale state

□ duplicate render

□ duplicate request

□ duplicate sale

□ duplicate stock update

□ rollback incompleto

□ optimistic update

□ cache inconsistente

□ overlay preso

□ dialog preso

□ pointer-events residual

□ scroll lock

□ stock divergente

□ venda sem sincronização

□ dashboard desatualizado

□ erro silencioso

□ await interrompido

□ memory leak

□ loop

□ re-render desnecessário

□ inconsistência entre POS e Loja Online

Para cada item encontrado informar:

• Arquivo

• Função

• Linha aproximada

• Evidência

• Causa raiz

• Impacto

• Prioridade

----------------------------------------------------

CLASSIFICAÇÃO

🔴 P0

🟠 P1

🟡 P2

🔵 P3

----------------------------------------------------

ENTREGAR

1. Executive Summary

2. Fluxo do POS

3. Fluxo do Caixa

4. Fluxo do Stock

5. Fluxo Loja Online

6. Fluxo Fiscal

7. Fluxo Dashboard

8. Lista completa dos problemas confirmados

9. Lista das causas raiz

10. Matriz de risco

11. Ordem recomendada de correção

12. Esforço estimado

13. Dependências

14. Parecer Executivo

Responder obrigatoriamente:

🟢 PRODUCTION READY

🟡 CONDITIONAL GO

🔴 NOT READY

Caso NÃO esteja pronto:

listar TODOS os bloqueadores P0 que deverão ser corrigidos na Sprint 11.2.

IMPORTANTE:

A Sprint 11.2 somente poderá iniciar após este relatório estar concluído e baseado em evidências reais do código.