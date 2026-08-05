# 🛡️ SPRINT 11.3 — IMPLEMENTAÇÃO DOS P0 (ZERO REGRESSION)

## MISSÃO

Implementar SOMENTE as correções dos P0 confirmados na Sprint 11.2.

É PROIBIDO:

❌ Criar novos recursos
❌ Alterar UI sem necessidade
❌ Refatorar módulos não auditados
❌ Alterar Billing
❌ Alterar Fiscal
❌ Alterar CRM
❌ Alterar Auth
❌ Alterar RLS
❌ Alterar RPCs não relacionadas
❌ Alterar Edge Functions não relacionadas
❌ Alterar documentação

Objetivo:

Eliminar exclusivamente as causas raiz confirmadas.

--------------------------------------------------

# P0-001 + P0-002

## Fecho de Caixa

Eliminar definitivamente o problema de:

• Overlay preso

• Body Lock

• Pointer Events

• Scroll Lock

Substituir o hack baseado em requestAnimationFrame por um fluxo determinístico.

Criar uma única rotina reutilizável responsável por:

- remover pointer-events
- remover overflow
- remover data-scroll-locked
- remover locks residuais

Essa rotina deve ser executada exatamente uma vez no encerramento do diálogo.

Não utilizar timers desnecessários.

--------------------------------------------------

# P0-003

## Permissões do Caixa

Auditar o fluxo de permissões.

Garantir consistência entre:

cash.open

cash.close

cash.close_any

Administrador

O operador que abriu um caixa deve conseguir fechá-lo conforme a política definida pelo sistema.

Eliminar inconsistências.

--------------------------------------------------

# P0-004

## Atomicidade do fluxo de venda

Revisar completeSale().

Garantir que:

cart

stock

sales

queue

permaneçam consistentes.

Nenhum estado parcial pode permanecer caso ocorra erro.

Utilizar fluxo transacional no estado local.

--------------------------------------------------

# P0-005

## Sincronização de Stock

Enquanto existir sincronização pendente:

Realtime NÃO pode sobrescrever o stock otimista.

Criar mecanismo de proteção.

Objetivo:

offline stock

↓

sync queue

↓

confirmação

↓

Realtime

Nunca o contrário.

--------------------------------------------------

# P0-006

## Fecho de Caixa Offline

Implementar estratégia equivalente ao syncManager utilizado nas vendas.

Caso Supabase esteja indisponível:

registrar fechamento

↓

enfileirar

↓

sincronizar posteriormente

Nunca perder o fechamento.

--------------------------------------------------

# P0-007

## Identidade da Loja

Eliminar fallback inseguro.

Nunca selecionar automaticamente a primeira loja.

Caso store_id seja inválido:

mostrar erro

ou

solicitar seleção.

Jamais assumir outra filial.

--------------------------------------------------

# REQUISITOS

Todas as alterações devem:

✅ manter TypeScript strict

✅ manter performance O(n)

✅ manter compatibilidade

✅ manter hooks existentes

✅ manter queries existentes

✅ manter componentes existentes

✅ manter UX atual

--------------------------------------------------

# TESTES OBRIGATÓRIOS

Executar:

✓ abrir caixa
✓ fechar caixa
✓ venda online
✓ venda offline
✓ sincronização
✓ atualização de stock
✓ realtime
✓ perda de internet
✓ retorno da internet
✓ troca de loja
✓ múltiplos fechamentos
✓ múltiplas vendas

--------------------------------------------------

# QUALITY GATE

Entregar:

📊 Relatório de Execução

Para cada P0 informar:

Status:

✅ Corrigido

ou

❌ Não corrigido

Arquivo(s) modificados

Resumo técnico

Risco residual

Testes executados

Regressões encontradas

Ao final informar:

Production Readiness (%)

Commercial Readiness (%)

Operational Readiness (%)

Enterprise Readiness (%)

Somente considerar a Sprint aprovada se TODOS os P0 confirmados estiverem corregidos, testados e sem regressões.