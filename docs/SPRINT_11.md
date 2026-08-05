🛡️ SPRINT 11.2.A — EXECUÇÃO REAL DA AUDITORIA (EVIDENCE FIRST)

MODO OBRIGATÓRIO

Esta Sprint NÃO é para corrigir absolutamente nada.

É proibido:

- alterar código
- criar componentes
- otimizar UI
- refatorar
- mover arquivos
- alterar RPC
- alterar Supabase
- alterar RLS
- alterar migrations
- alterar hooks
- alterar contextos

Esta Sprint é exclusivamente uma inspeção técnica do código existente.

====================================================

OBJETIVO

Abrir cada arquivo crítico do POS e auditá-lo linha por linha.

Nenhuma conclusão pode ser baseada em hipótese.

Toda conclusão deve conter evidência real encontrada no código.

====================================================

ORDEM DA AUDITORIA

P0

1.
LocalCashRegisterPage.tsx

Responder:

• como inicia o fecho
• quem chama closeCashRegister()
• quais estados são alterados
• quais dialogs permanecem montados
• existe race condition?
• existe stale state?
• existe body lock?
• existe overlay preso?
• existe scroll lock?
• existe cleanup?
• existe try/finally?
• existe await incorreto?

Mostrar evidências.

----------------------------------------------------

2.

CashRegisterContext.tsx

Responder:

• fluxo completo do fecho
• estados alterados
• RPC utilizada
• rollback
• tratamento de erro
• concorrência
• possíveis estados inválidos

Mostrar evidências.

----------------------------------------------------

3.

LocalPOSContext.tsx

Responder:

Fluxo completo da venda.

Após finalizar uma venda:

quem baixa stock?

quem atualiza inventário?

quem sincroniza loja online?

quem atualiza dashboard?

quem atualiza caixa?

quem atualiza financeiro?

quem atualiza fiscal?

Existe algum fluxo quebrado?

Mostrar evidências.

----------------------------------------------------

4.

Pipeline Fiscal

Encontrar:

• emissão fiscal

• movimento financeiro

• stock

• histórico

• recibo

Confirmar ordem de execução.

----------------------------------------------------

5.

Loja Online

Responder:

Quando uma venda é feita na Loja Online,

qual função baixa o stock?

usa o mesmo pipeline do POS?

usa outra RPC?

há duplicação?

há ausência de sincronização?

Mostrar evidências.

----------------------------------------------------

6.

PaymentModal

Responder:

Existe body lock?

Existe overlay preso?

Existe cleanup?

Existe removeEventListener?

Existe finally?

Existe desmontagem correta?

----------------------------------------------------

7.

QuantityEditor

Responder:

Há renders desnecessários?

Há re-render em cascata?

Há perda de foco?

Há stale props?

====================================================

ENTREGAR

Não corrigir nada.

Gerar apenas um relatório contendo:

P0 encontrados

P1 encontrados

P2 encontrados

arquivo

função

linha aproximada

causa raiz

impacto

risco

evidência

====================================================

Ao final apresentar apenas:

📊 Relatório de Auditoria

Arquivos auditados

Problemas encontrados

Problemas NÃO encontrados

Mapa completo dos fluxos

Production Ready (%)

NÃO IMPLEMENTAR CORREÇÕES.

A próxima Sprint (11.3) será exclusivamente para corrigir os P0 confirmados.