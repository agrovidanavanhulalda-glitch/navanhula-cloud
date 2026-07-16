# Runbooks

## Incidente: POS offline não sincroniza
1. Verificar `syncQueue` no dispositivo
2. Consultar `telemetry` para erros de POST
3. Reprocessar via botão "Sincronizar agora"
4. Escalar a P2 se persistir > 30min

## Incidente: Fiscal DLQ acumulando
1. Founder → Fiscal DLQ Page
2. Inspecionar payloads com erro
3. Reenviar em lote após correção
4. Notificar cliente se atingir SLA fiscal

## Incidente: Auth falha em massa
1. Confirmar status do provider (Lovable Cloud)
2. Verificar redirect URLs
3. Rotate keys apenas com aprovação executiva

## Incidente: Performance degradada
1. Founder → Health / Metrics
2. Avaliar slow queries
3. Ativar cache extended em `react-query.ts` se necessário
