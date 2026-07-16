# Go-Live Checklist (Sprint 6.0)

## Production
- [x] Build limpo
- [x] Typecheck OK
- [x] Testes 420/420
- [x] Error boundaries globais
- [x] Skeletons e loading states
- [x] Retry/timeout em queries críticas

## Security
- [x] RLS em 100% das tabelas
- [x] Roles em tabela `user_roles`
- [x] Secrets fora do frontend
- [x] CORS restrito nas Edge Functions
- [x] MFA (TOTP) disponível

## Performance
- [x] Code splitting por rota
- [x] TanStack Query com staleTime 5min
- [x] Dedupe React/React-DOM no Vite
- [x] Lazy loading de imagens

## Operations
- [x] Runbooks documentados
- [x] Disaster Recovery (RPO 24h / RTO 4h)
- [x] Health checks (Founder → Health)
- [x] Telemetria com retenção definida

## Support
- [x] SLA por plano
- [x] Canais de suporte definidos
- [x] Escalonamento P1–P4

## Compliance
- [x] SAF-T MZ
- [x] Auditoria (`audit_logs`, `access_logs`)
- [x] Privacidade de dados de clientes

## Customer Readiness
- [x] Onboarding wizard (`OnboardingChecklist`)
- [x] Primeira empresa/utilizador/loja/produto/venda
- [x] Primeiro relatório

## Commercial
- [x] Pricing (Basic / Profissional / Enterprise)
- [x] Landing pública (`/`, `/pricing`, `/features`)
- [x] Release Notes

## Backup / Recovery
- [x] Backup diário automático
- [x] Restauração testada

**Release Recommendation:** 🟡 CONDITIONAL_GO — pronto para demonstração comercial e onboarding controlado de clientes piloto. Transição para ✅ GA após atingir 95+ em todos os domínios de evidência.
