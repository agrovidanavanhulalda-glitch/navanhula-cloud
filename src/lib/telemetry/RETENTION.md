# Sprint 2.6 — Storage Retention Policy (formal, non-destructive)

Documenta a política de retenção por bucket. **Nenhum ficheiro é apagado por esta política.**
Serve apenas como referência auditável e ponto de configuração futuro.

| Bucket                | Classe            | Retenção mínima | Rotina de arquivo               | Sensibilidade | Notas                                    |
| --------------------- | ----------------- | --------------- | -------------------------------- | ------------- | ---------------------------------------- |
| `fiscal-documents`    | Fiscal legal      | **10 anos**     | Cold storage após 24 meses       | 🔴 Alta       | Retenção legal MZ (SAF-T, faturas)       |
| `compliance_documents`| Compliance        | **10 anos**     | Cold storage após 24 meses       | 🔴 Alta       | INSS, IRPC, IVA e obrigações fiscais     |
| `payment-proofs`      | Financeiro        | **5 anos**      | Comprimido após 12 meses         | 🟠 Média-alta | Manual Payments / anti-fraude            |
| `founder-backups`     | Backup plataforma | **12 meses**    | Rotação semanal, keep 12 last    | 🟠 Média-alta | Backups aplicacionais Founder            |
| `company_assets`      | Branding          | Sem prazo       | Limpeza de órfãos anual (manual) | 🟢 Baixa      | Logos, imagens de produto                |
| `comunidade_media`    | Utilizador        | **24 meses**    | Purgar órfãos de posts apagados  | 🟡 Média      | Requer signed URLs; policy já ativa      |

## Regras operacionais

- **Zero apagamento automático.** Qualquer purga futura exige aprovação explícita e migração dedicada.
- Buckets `fiscal-documents` e `compliance_documents` **NÃO** podem ter DELETE aberto ao role `authenticated` — writes/read via signed URL.
- Rotinas de arquivo/lifecycle serão implementadas por Edge Function agendada em sprint futura (fora de escopo 2.6).
- Constantes centralizadas: ver `src/lib/telemetry/retention.ts`.
