/**
 * Sprint 2.7 · Enterprise Runbooks (static, read-only).
 * Documentation surfaced in the Founder Operations Center.
 */

export interface Runbook {
  id: string;
  title: string;
  service: 'worker' | 'storage' | 'rpc' | 'realtime' | 'queue' | 'edge' | 'cron' | 'database';
  symptoms: string[];
  checks: string[];
  mitigation: string[];
  rollback: string;
  rpo: string;
  rto: string;
}

export const RUNBOOKS: Runbook[] = [
  {
    id: 'rb.worker.stopped',
    title: 'Worker parado',
    service: 'worker',
    symptoms: ['background_tasks.status = PROCESSING acumula', 'sem novos COMPLETED', 'queue.depth > 250'],
    checks: ['Founder → Health → Worker Status', 'Edge Function process-task-queue logs', 'Cron pg_cron ativo'],
    mitigation: ['Reprocessar tarefas RETRY via cron', 'Aumentar frequência do cron temporariamente', 'Validar secret SERVICE_ROLE'],
    rollback: 'Sem rollback necessário — worker é idempotente.',
    rpo: '≤ 5 min', rto: '≤ 15 min',
  },
  {
    id: 'rb.storage.down',
    title: 'Storage indisponível',
    service: 'storage',
    symptoms: ['uploads falham', 'signed URLs 5xx', 'retention jobs param'],
    checks: ['Health tile Storage', 'Bucket list responde', 'Egress /storage/v1/*'],
    mitigation: ['Ativar modo somente-leitura em uploads', 'Encolher tamanho máximo temporariamente', 'Retry exponencial no cliente'],
    rollback: 'N/A — leitura permanece disponível.',
    rpo: '0', rto: '≤ 30 min',
  },
  {
    id: 'rb.rpc.slow',
    title: 'RPC lenta (p95 acima do SLO)',
    service: 'rpc',
    symptoms: ['telemetry_events.duration_ms p95 > 500', 'timeouts em Founder dashboards'],
    checks: ['Founder → Health → RPC Status', 'supabase slow_queries', 'índices em colunas WHERE'],
    mitigation: ['Investigar EXPLAIN ANALYZE', 'Adicionar índices se comprovado', 'Reduzir janela de agregação'],
    rollback: 'DROP INDEX se degradar writes.',
    rpo: '0', rto: '≤ 1h',
  },
  {
    id: 'rb.realtime.down',
    title: 'Realtime indisponível',
    service: 'realtime',
    symptoms: ['websocket 1006', 'notificações não chegam'],
    checks: ['Health tile Realtime', 'Console: WebSocket errors'],
    mitigation: ['Fallback para polling', 'Reconectar com backoff'],
    rollback: 'N/A.',
    rpo: '0', rto: '≤ 30 min',
  },
  {
    id: 'rb.queue.growing',
    title: 'Fila crescendo',
    service: 'queue',
    symptoms: ['background_tasks PENDING > 250', 'latência de processamento sobe'],
    checks: ['Founder → Health → Queue', 'Worker throughput'],
    mitigation: ['Escalar workers (frequência cron)', 'Pausar novos enqueues não críticos'],
    rollback: 'Reverter cron ao intervalo original.',
    rpo: '≤ 10 min', rto: '≤ 1h',
  },
  {
    id: 'rb.dlq',
    title: 'DLQ com mensagens',
    service: 'queue',
    symptoms: ['background_tasks.status = FAILED com attempts = max'],
    checks: ['Founder → DLQ Fiscal', 'last_error por task_type'],
    mitigation: ['Corrigir causa raiz', 'Requeue seletivo após patch'],
    rollback: 'N/A — DLQ preserva payload original.',
    rpo: '0', rto: '≤ 4h',
  },
  {
    id: 'rb.edge.timeout',
    title: 'Timeout em Edge Function',
    service: 'edge',
    symptoms: ['5xx sistemáticos', 'duration > 25s'],
    checks: ['supabase edge_function_logs', 'CPU/mem limits'],
    mitigation: ['Reduzir payload', 'Paginar chamadas externas', 'Aumentar timeout no cliente'],
    rollback: 'Redeploy versão anterior.',
    rpo: '0', rto: '≤ 30 min',
  },
  {
    id: 'rb.cron.fail',
    title: 'Cron falhando',
    service: 'cron',
    symptoms: ['jobs sem execução em pg_cron.job_run_details', 'last_status = failed'],
    checks: ['SELECT * FROM cron.job_run_details ORDER BY runid DESC', 'net.http_post status'],
    mitigation: ['Rerodar manualmente', 'Validar apikey e URL'],
    rollback: 'cron.unschedule + reschedule com definição válida.',
    rpo: '≤ 5 min', rto: '≤ 30 min',
  },
  {
    id: 'rb.db.down',
    title: 'Banco indisponível',
    service: 'database',
    symptoms: ['ping health tile = offline', '5xx sistêmicos'],
    checks: ['Health tile Database', 'supabase status'],
    mitigation: ['Ativar página de manutenção', 'Suspender edge writes', 'Aguardar recuperação do provedor'],
    rollback: 'Restore de backup PITR se corrupção comprovada.',
    rpo: '≤ 5 min (PITR)', rto: '≤ 1h',
  },
];
