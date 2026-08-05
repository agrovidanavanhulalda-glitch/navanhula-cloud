# SPRINT 11.1.B — EXECUÇÃO DA AUDITORIA TÉCNICA P0 (EVIDENCE COLLECTION)

## MISSÃO

Executar a auditoria definida na Sprint 11.1.A e produzir evidências concretas do estado atual do módulo POS.

Nesta Sprint, o objetivo NÃO é corrigir problemas. O objetivo é responder tecnicamente, com base no código existente, onde estão as causas raiz dos problemas identificados.

Todo apontamento deve citar o arquivo, função e fluxo correspondente.

---

# PADRÃO OBRIGATÓRIO

🛡️ READ ONLY

🛡️ ROOT CAUSE FIRST

🛡️ EVIDENCE FIRST

🛡️ ZERO CODE CHANGES

🛡️ ZERO REGRESSION

---

# AUDITORIA P0 — FECHO DE CAIXA

Responder às seguintes questões utilizando apenas evidências do código:

1. Qual componente inicia o processo de fecho do caixa?
2. Qual função executa efetivamente o encerramento?
3. Existe transação única envolvendo o encerramento?
4. Existem chamadas assíncronas que podem deixar o estado inconsistente?
5. Há possibilidade de race condition?
6. Existe dupla atualização de estado?
7. O diálogo é desmontado corretamente?
8. O overlay é removido corretamente?
9. O body volta ao estado original após o encerramento?
10. Existe algum bloqueio residual de scroll?
11. Existe pointer-events residual?
12. Existe fluxo que pode interromper o encerramento antes da conclusão?
13. O Dashboard recebe atualização consistente após o fecho?

Para cada resposta informar:

- Arquivo
- Função
- Fluxo
- Evidência
- Impacto

---

# AUDITORIA P0 — STOCK

Mapear toda a cadeia de atualização do stock.

Responder:

- Quem reduz o stock?
- Onde isso ocorre?
- Em qual função?
- Em qual contexto?
- Em qual RPC?
- Em qual query?
- Em qual transação?

Verificar sincronização entre:

- POS
- Loja Online
- Inventário
- Dashboard
- Relatórios
- CRM

Confirmar se existe uma única fonte de verdade ou múltiplos fluxos concorrentes.

---

# AUDITORIA P0 — VENDA

Mapear o ciclo completo:

Produto

↓

Carrinho

↓

Pagamento

↓

Documento Fiscal

↓

Stock

↓

Caixa

↓

Dashboard

↓

Relatórios

Identificar qualquer ponto onde a operação possa falhar ou ficar inconsistente.

---

# AUDITORIA DE PERFORMANCE

Identificar:

- useEffect com dependências críticas
- re-renderizações desnecessárias
- estados duplicados
- providers redundantes
- loops de renderização

Informar apenas evidências comprovadas.

---

# AUDITORIA DE INTEGRIDADE

Verificar:

- duplicação de vendas
- duplicação de documentos
- duplicação de movimentos de stock
- inconsistência entre caixa e vendas
- inconsistência entre POS e Loja Online

---

# CLASSIFICAÇÃO

Todos os problemas encontrados devem ser classificados como:

🔴 P0 — Bloqueador de Produção

🟠 P1 — Alto impacto

🟡 P2 — Médio impacto

🔵 P3 — Baixo impacto

---

# SUBAGENTES

🎨 UI Architect

🗄️ Supabase Engineer

🔍 Code Auditor

🧪 Testing Agent

🚀 Performance Engineer

🔌 POS Integration Engineer

Todos devem produzir evidências objetivas.

---

# RELATÓRIO FINAL

Apresentar obrigatoriamente:

1. Resumo Executivo

2. Fluxo completo do Fecho de Caixa

3. Fluxo completo da Venda

4. Fluxo completo da atualização de Stock

5. Lista de problemas encontrados

6. Evidências (arquivo, função e impacto)

7. Causa raiz de cada problema

8. Riscos para produção

9. Ordem recomendada de correção (P0 → P3)

10. Veredito final:

- POS apto para produção? (SIM ou NÃO)
- Se NÃO, listar exatamente os bloqueadores restantes.

IMPORTANTE: Nenhuma correção deve ser implementada nesta Sprint. O objetivo é concluir um diagnóstico técnico completo que servirá de base para a Sprint 11.2 (Correções P0).
