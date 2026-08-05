# SPRINT 11.1 — POS STABILITY & CASH REGISTER AUDIT (PRIORIDADE CRÍTICA)

## MISSÃO

Nesta Sprint está PROIBIDO desenvolver novas funcionalidades ou alterar o design visual do sistema.

O objetivo é realizar uma auditoria técnica completa do módulo POS e eliminar definitivamente todos os problemas operacionais relacionados ao Caixa (Cash Register), sincronização e fluxo de venda.

Toda correção deverá ser baseada em evidências reais, identificando e resolvendo a causa raiz de cada problema.

---

# PADRÃO OBRIGATÓRIO

🛡️ ROOT CAUSE FIRST

🛡️ EVIDENCE FIRST

🛡️ ZERO REGRESSION

🛡️ PRODUCTION SAFE

🛡️ ENTERPRISE GRADE

---

# ESCOPO

Auditar completamente os seguintes módulos:

- LocalCashRegisterPage
- LocalPOSPage
- PaymentModal
- ThermalReceipt
- CashRegisterContext
- POS Context
- Inventory Integration
- Sales Pipeline
- Fiscal Pipeline
- Dashboard Updates
- Online Store Integration

---

# P0 — AUDITORIA COMPLETA DO CAIXA

Realizar um mapeamento completo do fluxo:

Abrir Caixa

↓

Registrar Venda

↓

Receber Pagamento

↓

Emitir Documento Fiscal

↓

Atualizar Stock

↓

Atualizar Dashboard

↓

Atualizar Caixa

↓

Fechar Caixa

↓

Persistir Estado

↓

Atualizar Relatórios

Para cada etapa identificar:

- estado React;
- hooks utilizados;
- chamadas RPC;
- queries Supabase;
- transações;
- locks;
- overlays;
- dialogs;
- sincronizações;
- possíveis condições de corrida (race conditions).

---

# CORRIGIR DEFINITIVAMENTE

Investigar qualquer situação onde:

- o caixa permanece aberto;
- o fechamento não conclui;
- existe overlay residual;
- existe bloqueio de scroll;
- existe perda de foco;
- existe estado inconsistente.

Eliminar definitivamente:

- race conditions;
- estados órfãos;
- dialogs presos;
- overlays persistentes;
- pointer-events residuais;
- overflow bloqueado;
- inconsistências de renderização.

Não aplicar soluções paliativas.

Corrigir apenas a causa raiz.

---

# AUDITORIA DE STOCK

Validar completamente a arquitetura do stock.

Responder através de evidências:

Existe apenas uma fonte de verdade?

OU

Existem fluxos independentes?

Auditar:

POS

↓

Loja Online

↓

Inventário

↓

Dashboard

↓

CRM

↓

Relatórios

↓

Histórico

Toda venda realizada em qualquer canal deverá refletir imediatamente no stock geral.

Caso existam divergências:

identificar exatamente:

- arquivo;
- função;
- hook;
- query;
- RPC;
- evento responsável.

---

# AUDITORIA DA VENDA

Executar testes completos para:

Venda simples

Venda múltipla

Grande quantidade

Desconto

Cancelamento

Pagamento Dinheiro

Pagamento M-Pesa

Pagamento e-Mola

Pagamento Cartão

Impressão

PDF

Recibo

Stock

Dashboard

Caixa

Caso algum fluxo falhe:

identificar a causa.

Não mascarar sintomas.

---

# VALIDAÇÃO DE DADOS

Verificar:

Duplicação de vendas

Duplicação de pagamentos

Duplicação de stock

Duplicação de documentos

Perda de sincronização

Falha offline

Falha online

Reconciliação

Integridade transacional

---

# PERFORMANCE

Auditar:

Renderizações

Re-renderizações

Loops

useEffect

useMemo

useCallback

Context Providers

Suspense

Lazy Loading

Virtualização

Objetivo:

Zero renderizações desnecessárias.

---

# MÓDULOS PROTEGIDOS

É PROIBIDO introduzir regressões em:

- POS Engine
- Fiscal
- Billing
- CRM
- Auth
- RLS
- Supabase
- Edge Functions
- Workers
- RPCs
- Inventário
- Dashboard

---

# SUBAGENTES OBRIGATÓRIOS

🎨 UI Architect

🗄️ Supabase Engineer

🔍 Code Auditor

🧪 Testing Agent

🚀 Performance Engineer

🔌 POS Integration Engineer

Todos deverão produzir evidências.

---

# QUALITY GATE

Antes de concluir executar:

✅ Typecheck

✅ Vitest

✅ Testes POS

✅ Testes Caixa

✅ Testes Stock

✅ Testes Dashboard

✅ Testes Fiscal

✅ Testes Billing

✅ Testes Integração

Zero regressão permitida.

---

# RELATÓRIO OBRIGATÓRIO

Apresentar:

## Problemas encontrados

Classificados por:

P0

P1

P2

## Evidências

Para cada problema informar:

- arquivo;
- função;
- causa raiz;
- impacto.

## Correções aplicadas

Explicar exatamente:

- o que foi alterado;
- por que foi alterado;
- qual problema resolveu.

## Testes

Quantidade executada.

Quantidade aprovada.

Quantidade reprovada.

Cobertura.

## Performance

Antes

Depois

## Resultado Final

Production Ready:

SIM ou NÃO.

Caso NÃO:

listar exatamente o que ainda impede o módulo POS de ser considerado pronto para produção.

Nenhum problema poderá ser ocultado. O relatório deve refletir fielmente o estado atual do sistema.
