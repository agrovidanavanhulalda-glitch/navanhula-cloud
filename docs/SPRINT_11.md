🛑 SPRINT 11.2.B — EXECUÇÃO DA AUDITORIA REAL (SEM DOCUMENTAÇÃO)

ATENÇÃO

A partir desta Sprint fica PROIBIDO editar:

- docs/SPRINT_11.md
- README
- CHANGELOG
- qualquer documentação

A documentação está encerrada.

====================================================

OBJETIVO

Executar a auditoria REAL do código.

Não escrever protocolo.

Não escrever plano.

Não escrever documentação.

Abrir os arquivos e inspecionar o código.

====================================================

MODO

READ ONLY

É proibido:

❌ alterar código

❌ criar componentes

❌ corrigir bugs

❌ otimizar UI

❌ mover arquivos

❌ criar migrations

❌ alterar RPC

❌ alterar Supabase

❌ alterar Contexts

❌ alterar Hooks

====================================================

AUDITAR NESTA ORDEM

1.

src/pages/LocalCashRegisterPage.tsx

Abrir o arquivo.

Ler todo o código.

Responder com evidências.

----------------------------------------------------

2.

src/contexts/CashRegisterContext.tsx

Abrir o arquivo.

Ler todo o código.

Mapear o fluxo completo.

----------------------------------------------------

3.

src/contexts/LocalPOSContext.tsx

Abrir o arquivo.

Ler todo o código.

Mapear:

• venda

• stock

• caixa

• financeiro

• fiscal

• sincronização

----------------------------------------------------

4.

PaymentModal

Verificar:

• overlays

• body lock

• scroll lock

• cleanup

• finally

• desmontagem

----------------------------------------------------

5.

Loja Online

Encontrar exatamente onde o stock é reduzido.

Comparar com o POS.

Responder:

• usam o mesmo pipeline?

• usam RPC diferente?

• algum fluxo está incompleto?

----------------------------------------------------

6.

QuantityEditor

Verificar:

• renderizações

• foco

• edição manual

• callbacks

• stale state

====================================================

PARA CADA PROBLEMA ENCONTRADO

Informar:

• arquivo

• função

• linha aproximada

• evidência encontrada

• causa raiz

• impacto

• risco

Não propor correção.

====================================================

ENTREGA OBRIGATÓRIA

Ao terminar devolver SOMENTE:

📊 RELATÓRIO DA AUDITORIA REAL

Arquivos auditados

Fluxos encontrados

P0 confirmados

P1 confirmados

P2 confirmados

Problemas descartados

Mapa completo do pipeline POS

Mapa completo do pipeline Caixa

Mapa completo do pipeline Stock

Production Ready (%)

Nenhuma alteração de código.

Nenhuma documentação.

Nenhuma implementação.

Somente evidências reais extraídas do código.