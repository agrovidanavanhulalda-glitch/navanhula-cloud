# SPRINT 11 — POS PRODUCTION READY (PRIORIDADE MÁXIMA)

## MISSÃO

A partir deste Sprint está PROIBIDO criar novos módulos, páginas ou funcionalidades.

Todo o esforço da equipa deverá ser dedicado EXCLUSIVAMENTE ao módulo POS (Point of Sale) até atingir nível Enterprise Production Ready, comparável aos melhores sistemas do mercado (Square POS, Shopify POS, Lightspeed POS e Toast POS).

O objetivo deste Sprint NÃO é adicionar funcionalidades novas, mas sim eliminar todos os problemas de UX, UI, estabilidade, integração e regras de negócio.

---

# REGRAS OBRIGATÓRIAS

- NÃO alterar regras fiscais.
- NÃO alterar lógica de negócio sem necessidade.
- NÃO criar novos módulos.
- NÃO quebrar funcionalidades existentes.
- ZERO regressões.
- Preservar Supabase.
- Preservar RPCs.
- Preservar RLS.
- Preservar Billing.
- Preservar CRM.
- Preservar Inventário.
- Preservar Performance.
- Utilizar exclusivamente Design Tokens semânticos.
- Nenhum valor hardcoded.
- WCAG AA obrigatório.
- Dark Mode obrigatório.

---

# FASE 1 — CORREÇÃO DOS PROBLEMAS CRÍTICOS (P0)

## 1. Corrigir definitivamente o Fecho de Caixa

Hoje o módulo ainda apresenta problemas.

Investigar profundamente toda a cadeia do processo:

Abrir Caixa

↓

Venda

↓

Pagamento

↓

Emissão de Documento

↓

Fechar Caixa

Eliminar definitivamente qualquer conflito envolvendo:

- Radix Dialog
- Overlay
- Body Lock
- Pointer Events
- Overflow
- Focus Trap
- Re-render
- Estado React
- Scroll Lock

Após fechar o caixa:

- nenhum blur poderá permanecer;
- nenhum overlay poderá existir;
- nenhuma tela poderá ficar bloqueada;
- nenhuma área poderá perder clique.

O sistema deve voltar imediatamente ao estado normal.

---

## 2. Corrigir sincronização do Stock

Existe um problema onde vendas realizadas pela Loja Online não descontam corretamente no stock geral.

Realizar auditoria completa.

Implementar uma ÚNICA fonte de verdade para o stock.

Toda movimentação deverá atualizar automaticamente:

- POS
- Loja Online
- Inventário
- Dashboard
- CRM
- Relatórios
- Indicadores

Não poderá existir divergência entre módulos.

---

## 3. Auditoria completa do fluxo de venda

Validar ponta a ponta:

Abrir Caixa

↓

Selecionar Produto

↓

Editar Quantidade

↓

Aplicar Desconto

↓

Receber Pagamento

↓

Emitir Documento

↓

Atualizar Stock

↓

Atualizar Dashboard

↓

Atualizar Caixa

↓

Fechar Caixa

↓

Atualizar Relatórios

Toda inconsistência encontrada deverá ser corrigida.

---

# FASE 2 — REDESENHO COMPLETO DA EXPERIÊNCIA DO POS

A aparência geral já está bonita, porém ainda NÃO transmite conforto operacional.

O painel direito (Carrinho) continua apertado.

Reprojetar toda a experiência inspirando-se em:

- Square POS
- Shopify POS
- Lightspeed POS
- Toast POS

Objetivos:

- aumentar espaço útil;
- melhorar respiro visual;
- melhorar alinhamentos;
- melhorar hierarquia visual;
- reduzir sensação de aperto;
- tornar a operação extremamente confortável.

---

## Item do Carrinho

Cada item deverá conter:

- imagem maior;
- nome do produto;
- SKU;
- categoria;
- preço unitário;
- editor de quantidade;
- subtotal;
- remover item.

Tudo perfeitamente alinhado.

---

## Quantity Editor Enterprise

O número da quantidade deverá funcionar exatamente igual ao módulo de Cotações.

Obrigatório:

✔ clicar diretamente no número;

✔ escrever manualmente;

✔ auto selecionar valor;

✔ Enter confirma;

✔ Esc cancela;

✔ Blur confirma;

✔ aceitar teclado numérico;

✔ aceitar ↑ ↓;

✔ aceitar grandes quantidades;

✔ excelente experiência em touch.

O campo NÃO poderá ficar pequeno.

---

## Checkout Premium

Melhorar completamente:

- cartões de pagamento;
- dinheiro;
- M-Pesa;
- e-Mola;
- cartão;
- valor entregue;
- troco;
- teclado numérico;
- espaçamento;
- alinhamentos;
- centralização.

Toda experiência deverá parecer um sistema Enterprise moderno.

---

# FASE 3 — DOCUMENTOS FISCAIS

Revisar completamente:

- Fatura;
- Fatura-Recibo;
- Recibo;
- Impressão Térmica;
- PDF.

Melhorar:

- alinhamentos;
- tipografia;
- margens;
- logótipo;
- totais;
- QR Fiscal;
- assinatura digital;
- identificação do operador;
- identificação da loja.

Os documentos devem possuir aparência comercial profissional.

---

# FASE 4 — RESPONSIVIDADE

Revisar TODAS as telas do POS.

Garantir funcionamento perfeito em:

1366×768

1440×900

1600×900

1920×1080

Nenhuma página poderá apresentar:

- elementos apertados;
- componentes desalinhados;
- cartões cortados;
- grids quebrados;
- overflow;
- scrolls desnecessários;
- conteúdo descentralizado.

Todo o layout deverá permanecer elegante em qualquer resolução.

---

# FASE 5 — QUALITY ASSURANCE

Executar auditoria completa do POS.

Validar:

✅ Abrir Caixa

✅ Fechar Caixa

✅ Venda

✅ Cancelamento

✅ Devolução (se existir)

✅ Desconto

✅ Pagamento

✅ Impressão

✅ PDF

✅ Atualização do Stock

✅ Dashboard

✅ Fiscal

✅ Performance

✅ Responsividade

✅ Dark Mode

✅ Acessibilidade

---

# SUBAGENTES OBRIGATÓRIOS

🎨 UI Architect

🗄️ Supabase Engineer

🔍 Code Auditor

🧪 QA/Test Engineer

🚀 Performance Engineer

🔌 POS Integration Engineer

Todos deverão validar o código antes da conclusão.

---

# RELATÓRIO FINAL OBRIGATÓRIO

Ao terminar o Sprint apresentar:

- Arquivos modificados;
- Problemas encontrados;
- Problemas corrigidos;
- Testes executados;
- Regressões encontradas;
- Performance antes/depois;
- Pontuação Enterprise;
- Pontuação UX;
- Pontuação WCAG;
- Pontuação Responsividade;
- Prontidão Comercial;
- Prontidão Produção.

---

# CRITÉRIO DE ACEITAÇÃO

Este Sprint SOMENTE poderá ser encerrado quando:

✔ O fecho de caixa funcionar em 100% dos cenários.

✔ O stock permanecer sincronizado entre POS, Loja Online, Inventário e Dashboard.

✔ O carrinho proporcionar uma experiência confortável e moderna.

✔ O Quantity Editor permitir edição direta pelo teclado, exatamente como no módulo de Cotações.

✔ Todas as telas estiverem perfeitamente alinhadas e centralizadas.

✔ O checkout possuir aparência Enterprise.

✔ Os documentos fiscais tiverem qualidade comercial.

✔ Todos os testes passarem.

✔ Zero regressões.

✔ Nenhum bug conhecido permanecer aberto.

## OBJETIVO FINAL

Transformar o módulo POS da NAVANHULA CLOUD numa solução Enterprise robusta, elegante, estável e pronta para utilização em ambiente real de produção. Nenhum novo módulo deverá ser desenvolvido antes da conclusão e homologação completa deste Sprint.