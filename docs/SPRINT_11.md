# 🛡️ SPRINT 11.3.A — VALIDAÇÃO DOS P0 (FUNCTIONAL VERIFICATION)

MODO OBRIGATÓRIO

Não implementar novas funcionalidades.

Não refatorar.

Não alterar UI.

Não alterar arquitetura.

O objetivo desta Sprint é apenas validar que os P0 corrigidos realmente desapareceram.

====================================================

TESTES OBRIGATÓRIOS

P0-001 / P0-002

Fecho de Caixa

Executar pelo menos 30 ciclos:

Abrir Caixa

↓

Venda

↓

Receber Pagamento

↓

Fechar Caixa

↓

Abrir novamente

Verificar:

✓ Overlay desaparece

✓ Pointer-events não permanece no body

✓ data-scroll-locked removido

✓ overflow restaurado

✓ Scroll normal

✓ Sem fundo desfocado

✓ Sem Dialog preso

====================================================

P0-003

Permissões

Testar:

Operador

Supervisor

Administrador

Validar:

cash.open

cash.close

cash.close_any

Nenhum perfil autorizado deve ficar impedido de fechar o próprio caixa.

====================================================

P0-004

Venda Offline

Desligar internet.

Realizar:

20 vendas.

Fechar aplicação.

Abrir novamente.

Restabelecer internet.

Validar:

✓ Todas as vendas sincronizadas

✓ Nenhuma duplicada

✓ Nenhuma perdida

====================================================

P0-005

Stock

Executar:

Venda POS

Venda Loja Online

Venda Offline

Sincronização

Realtime

Confirmar:

✓ Stock permanece consistente

✓ Nenhuma sobrescrita

✓ Nenhum valor antigo substitui o otimista

====================================================

P0-006

Fecho Offline

Abrir caixa.

Desligar internet.

Fechar caixa.

Ligar internet.

Confirmar:

✓ SyncManager envia o fecho

✓ Caixa permanece consistente

✓ Sem duplicação

====================================================

P0-007

Multi-loja

Testar:

Store válida

Store inválida

Store removida

Store sem permissão

Confirmar:

✓ Nunca selecionar automaticamente outra loja

✓ Exibir erro apropriado quando necessário

====================================================

TESTES DE REGRESSÃO

Executar:

✓ Venda normal

✓ Devolução

✓ Cancelamento

✓ Fiscal

✓ Inventário

✓ Dashboard

✓ CRM

✓ Produtos

✓ Clientes

✓ Impressão

✓ Recibo

====================================================

QUALITY GATE

Somente considerar um P0 encerrado quando:

✔ Correção implementada

✔ Teste aprovado

✔ Sem regressão

====================================================

ENTREGA

📊 Relatório de Validação

Para cada P0 informar:

Status

✅ Validado

ou

❌ Falhou

Testes executados

Resultado

Regressões

Arquivos envolvidos

Risco residual

Ao final informar:

Production Ready (%)

Commercial Ready (%)

Operational Ready (%)

Enterprise Ready (%)

Se existir qualquer falha em qualquer P0, interromper a Sprint e reportar imediatamente.