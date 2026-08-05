# 🛡️ SPRINT 11.2.C — AUDITORIA REAL DO CÓDIGO (EVIDENCE FIRST)

## MODO
READ-ONLY ABSOLUTO.

É EXPRESSAMENTE PROIBIDO:

- criar documentação;
- editar documentação;
- criar Markdown;
- alterar código;
- criar migrações;
- alterar RPCs;
- alterar RLS;
- alterar Hooks;
- alterar Contexts;
- alterar componentes.

Nesta Sprint você NÃO É um programador.

Você é um AUDITOR TÉCNICO.

Seu único trabalho é INVESTIGAR.

--------------------------------------------------

## OBJETIVO

Abrir o código-fonte REAL.

Ler linha por linha.

Seguir o fluxo completo.

Encontrar a causa raiz.

Produzir evidências.

NÃO produzir hipóteses.

NÃO produzir opiniões.

Somente fatos encontrados no código.

--------------------------------------------------

## P0 #1

AUDITAR COMPLETAMENTE

src/pages/LocalCashRegisterPage.tsx

e

src/contexts/CashRegisterContext.tsx

Responder com evidências:

1.
Quem abre o Dialog?

2.
Quem fecha?

3.
Existe mais de um estado controlando o Dialog?

4.
Existe mais de um useEffect relacionado?

5.
Existe renderização dupla?

6.
Existe race condition?

7.
Existe await antes do fechamento?

8.
Existe navigate durante fechamento?

9.
Existe unmount durante animação?

10.
Existe cleanup do body?

11.
Existe cleanup do pointer-events?

12.
Existe cleanup do overflow?

13.
Existe cleanup do data-scroll-locked?

14.
Quem adiciona esses atributos?

15.
Quem remove?

16.
Pode existir caminho onde nunca são removidos?

17.
Existe Radix Dialog conflitante?

18.
Existe mais de um Overlay?

19.
Existe estado stale?

20.
Existe re-render desnecessário?

Para CADA resposta mostrar:

Arquivo

Linha

Trecho

Motivo

Impacto

--------------------------------------------------

## P0 #2

Auditar completamente

LocalPOSContext.tsx

LocalPOSPage.tsx

Inventory

Sale

RPC

Encontrar exatamente:

Quando uma venda é concluída.

Qual função dispara.

Quem baixa stock.

Quem sincroniza stock.

Quem atualiza Loja Online.

Quem atualiza Inventário.

Quem atualiza POS.

Existe algum fluxo separado?

Existe fluxo duplicado?

Existe caminho onde a Loja Online NÃO baixa stock?

Existe caminho onde POS baixa e Loja Online não baixa?

Existe trigger?

Existe RPC?

Existe Edge Function?

Existe chamada perdida?

Mostrar:

Arquivo

Linha

Fluxograma completo

--------------------------------------------------

## P0 #3

Auditar QuantityEditor

Encontrar:

renderizações

memo

callbacks

loops

stale state

prop drilling

controlled/uncontrolled

re-render desnecessário

--------------------------------------------------

## P0 #4

Auditar Layout do POS

Encontrar:

containers

overflow

flex

grid

larguras fixas

min-width

max-width

scroll horizontal

centralização

padding

gaps

porque o carrinho continua apertado

porque o conteúdo não ocupa corretamente o espaço disponível

--------------------------------------------------

## P0 #5

Auditar todos os Dialogs do POS

Payment

Receipt

Cash Register

Confirmações

Encontrar:

Dialog aninhado

Overlay duplicado

Portal duplicado

Focus Trap

Scroll Lock

Body Lock

Pointer Events

--------------------------------------------------

## IMPORTANTE

NÃO CORRIGIR.

NÃO ALTERAR.

NÃO IMPLEMENTAR.

NÃO OTIMIZAR.

NÃO ESCREVER DOCUMENTAÇÃO.

Somente investigar.

--------------------------------------------------

## ENTREGA

Ao terminar entregar SOMENTE:

📊 Relatório de Auditoria Técnica

Problema P0

Status:
✅ Encontrado
ou
❌ Não encontrado

Arquivo

Linha

Trecho

Fluxo completo

Causa raiz

Impacto

Probabilidade

Severidade

Risco para Produção

Ao final emitir:

Production Ready:

SIM

ou

NÃO

com justificativa baseada EXCLUSIVAMENTE nas evidências encontradas no código.