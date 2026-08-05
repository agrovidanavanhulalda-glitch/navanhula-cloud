# SPRINT 11.1.A — AUDITORIA TÉCNICA P0 DO POS (ROOT CAUSE ANALYSIS)

## MISSÃO

NÃO implementar correções nesta Sprint.

O objetivo desta fase é exclusivamente identificar, documentar e comprovar a causa raiz dos problemas críticos do módulo POS antes de qualquer alteração de código.

Toda conclusão deverá ser baseada em evidências reais do código.

É proibido assumir causas sem comprovação.

---

# PADRÃO OBRIGATÓRIO

🛡️ ROOT CAUSE FIRST

🛡️ EVIDENCE FIRST

🛡️ READ ONLY

🛡️ ZERO CODE CHANGES

🛡️ ZERO REGRESSION

---

# ESCOPO DA AUDITORIA

Auditar completamente:

- LocalCashRegisterPage.tsx
- LocalPOSPage.tsx
- CashRegisterContext
- POS Context
- Sales Context
- Inventory Context
- PaymentModal
- ThermalReceipt
- Dashboard
- Loja Online
- Fluxo de Inventário

---

# PROBLEMA P0 — FECHO DE CAIXA

Responder com evidências:

1. Qual função inicia o fecho do caixa?

2. Qual função confirma o fecho?

3. Existe transação?

4. Existe rollback?

5. Existe await pendente?

6. Existe race condition?

7. Existe dupla atualização de estado?

8. Existe estado órfão?

9. Existe overlay que permanece ativo?

10. Existe Dialog que não desmonta?

11. Existe bloqueio de scroll?

12. Existe pointer-events residual?

13. Existe problema de renderização?

Para cada resposta informar:

- arquivo;
- função;
- linha;
- evidência.

---

# PROBLEMA P0 — STOCK

Mapear completamente o fluxo.

Responder:

Quando ocorre uma venda:

Quem reduz o stock?

Como reduz?

Em que arquivo?

Em qual função?

Quem sincroniza:

POS

↓

Inventário

↓

Loja Online

↓

Dashboard

↓

Relatórios

↓

CRM

Existe uma única fonte de verdade?

Ou existem múltiplos fluxos?

Caso exista divergência:

mostrar exatamente onde.

---

# PROBLEMA P0 — VENDA

Auditar:

Venda

↓

Pagamento

↓

Documento

↓

Stock

↓

Dashboard

↓

Caixa

↓

Histórico

Identificar:

- possíveis duplicações;
- falhas de sincronização;
- inconsistências;
- estados intermediários.

---

# AUDITORIA DE COMPONENTES

Verificar:

PaymentModal

ThermalReceipt

Dialogs

Drawers

Sheets

Dropdowns

Tooltips

Popover

Radix

Confirmar:

- montagem;
- desmontagem;
- gerenciamento de foco;
- limpeza de estados.

---

# AUDITORIA DE PERFORMANCE

Analisar:

- useEffect
- useMemo
- useCallback
- Context Providers
- Re-renderizações
- Loops
- Dependências

Informar:

quais renderizações podem causar comportamento inesperado.

---

# AUDITORIA DE DADOS

Verificar:

- integridade das vendas;
- integridade do caixa;
- integridade do stock;
- integridade dos documentos;
- integridade financeira.

---

# CLASSIFICAÇÃO

Todos os problemas encontrados deverão ser classificados:

🔴 P0

🟠 P1

🟡 P2

🔵 P3

---

# É PROIBIDO

- alterar código;
- alterar layout;
- alterar Supabase;
- alterar RPC;
- alterar RLS;
- alterar Edge Functions;
- alterar lógica de negócio.

Esta Sprint é exclusivamente investigativa.

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

# RELATÓRIO FINAL

Apresentar obrigatoriamente:

## 1. Resumo Executivo

Estado atual do POS.

## 2. Problemas Encontrados

Lista completa.

## 3. Evidências

Arquivo

Função

Linha

Descrição

Impacto

## 4. Causa Raiz

Explicar claramente a origem de cada problema.

## 5. Plano de Correção

Para cada problema informar:

- prioridade;
- risco;
- esforço estimado;
- impacto esperado.

## 6. Veredito

O módulo POS está apto para produção?

Responder apenas:

✅ SIM

ou

❌ NÃO

Caso a resposta seja NÃO, listar exatamente os bloqueadores restantes.
