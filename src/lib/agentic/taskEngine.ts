/**
 * Sprint 4.0 · Task Engine (pure).
 * Builds structured task lists (checklist, runbook, rollback, validation).
 */

export interface AgenticTask {
  id: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  category: 'CHECK' | 'ACTION' | 'VALIDATE' | 'ROLLBACK';
}

export interface TaskBundle {
  checklist: AgenticTask[];
  runbook: AgenticTask[];
  rollback: AgenticTask[];
  validation: AgenticTask[];
}

let seq = 0;
const nid = (p: string) => `${p}-${++seq}-${Math.random().toString(36).slice(2, 6)}`;

export function buildTaskBundle(kind: string): TaskBundle {
  const now = kind.toLowerCase();
  const base: TaskBundle = { checklist: [], runbook: [], rollback: [], validation: [] };

  if (now.includes('storage')) {
    base.checklist.push(
      { id: nid('chk'), title: 'Confirmar uso atual de storage', description: 'Ler métricas ao vivo da camada storage.', order: 1, estimatedMinutes: 2, category: 'CHECK' },
      { id: nid('chk'), title: 'Validar snapshot recente', description: 'Confirmar backup < 24h.', order: 2, estimatedMinutes: 3, category: 'CHECK' },
    );
    base.runbook.push(
      { id: nid('run'), title: 'Aumentar quota do bucket', description: 'Solicitar expansão via provedor.', order: 1, estimatedMinutes: 15, category: 'ACTION' },
      { id: nid('run'), title: 'Aplicar retenção', description: 'Arquivar telemetry_events antigos.', order: 2, estimatedMinutes: 20, category: 'ACTION' },
    );
    base.rollback.push({ id: nid('rb'), title: 'Restaurar quota original', description: 'Reverter alteração caso métricas degradem.', order: 1, estimatedMinutes: 10, category: 'ROLLBACK' });
    base.validation.push({ id: nid('val'), title: 'Verificar % storage < 75%', description: 'Confirmar métrica pós-ação.', order: 1, estimatedMinutes: 2, category: 'VALIDATE' });
  } else if (now.includes('worker')) {
    base.checklist.push({ id: nid('chk'), title: 'Ler taxa de sucesso dos workers', description: 'Confirmar success rate atual.', order: 1, estimatedMinutes: 2, category: 'CHECK' });
    base.runbook.push(
      { id: nid('run'), title: 'Aumentar concorrência', description: 'Escalar workers em +50%.', order: 1, estimatedMinutes: 10, category: 'ACTION' },
      { id: nid('run'), title: 'Reprocessar DLQ', description: 'Requeue itens seguros.', order: 2, estimatedMinutes: 15, category: 'ACTION' },
    );
    base.rollback.push({ id: nid('rb'), title: 'Reverter concorrência', description: 'Voltar ao nível anterior.', order: 1, estimatedMinutes: 5, category: 'ROLLBACK' });
    base.validation.push({ id: nid('val'), title: 'Sucesso ≥ 95%', description: 'Verificar 30 min pós-ação.', order: 1, estimatedMinutes: 30, category: 'VALIDATE' });
  } else if (now.includes('dlq')) {
    base.checklist.push({ id: nid('chk'), title: 'Contar itens DLQ', description: 'Amostragem por tipo.', order: 1, estimatedMinutes: 3, category: 'CHECK' });
    base.runbook.push({ id: nid('run'), title: 'Requeue seletivo', description: 'Somente jobs idempotentes.', order: 1, estimatedMinutes: 20, category: 'ACTION' });
    base.rollback.push({ id: nid('rb'), title: 'Mover de volta para DLQ', description: 'Reverter caso falhem novamente.', order: 1, estimatedMinutes: 5, category: 'ROLLBACK' });
    base.validation.push({ id: nid('val'), title: 'DLQ estável < 20', description: 'Após 1h.', order: 1, estimatedMinutes: 60, category: 'VALIDATE' });
  } else if (now.includes('rpc') || now.includes('latência')) {
    base.checklist.push({ id: nid('chk'), title: 'Coletar p95 atual', description: 'Amostra últimas 24h.', order: 1, estimatedMinutes: 2, category: 'CHECK' });
    base.runbook.push(
      { id: nid('run'), title: 'Introduzir read replica', description: 'Descarregar leituras pesadas.', order: 1, estimatedMinutes: 60, category: 'ACTION' },
      { id: nid('run'), title: 'Criar índices compostos', description: 'Por company_id em queries quentes.', order: 2, estimatedMinutes: 30, category: 'ACTION' },
    );
    base.rollback.push({ id: nid('rb'), title: 'Remover índice se degradar writes', description: 'Monitorar 24h.', order: 1, estimatedMinutes: 10, category: 'ROLLBACK' });
    base.validation.push({ id: nid('val'), title: 'p95 < 400ms', description: 'Verificar por 24h.', order: 1, estimatedMinutes: 5, category: 'VALIDATE' });
  } else {
    base.checklist.push({ id: nid('chk'), title: 'Coletar evidências', description: 'Reunir métricas e logs.', order: 1, estimatedMinutes: 5, category: 'CHECK' });
    base.runbook.push({ id: nid('run'), title: 'Aplicar mitigação sugerida', description: 'Ver detalhes do plano.', order: 1, estimatedMinutes: 15, category: 'ACTION' });
    base.rollback.push({ id: nid('rb'), title: 'Reverter alteração', description: 'Restaurar estado anterior.', order: 1, estimatedMinutes: 10, category: 'ROLLBACK' });
    base.validation.push({ id: nid('val'), title: 'Confirmar métrica alvo', description: 'Comparar antes/depois.', order: 1, estimatedMinutes: 15, category: 'VALIDATE' });
  }
  return base;
}
