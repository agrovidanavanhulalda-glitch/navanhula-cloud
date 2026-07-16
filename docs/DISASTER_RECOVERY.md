# Disaster Recovery

- **RPO:** 24h (backup diário automático)
- **RTO:** 4h para restauração completa

## Procedimento
1. Isolar o incidente (freeze de writes se necessário)
2. Restaurar último snapshot íntegro (Founder → Backup)
3. Validar integridade referencial (`dbCertification.test.ts`)
4. Reabrir tráfego progressivamente
5. Emitir post-mortem em 48h
