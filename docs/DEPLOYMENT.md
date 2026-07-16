# Deployment Guide

## Pré-requisitos
- Node 20+, projeto conectado ao Lovable Cloud
- Variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` presentes (auto-geridas)

## Fluxo
1. `npm run build` — verificar bundle e ausência de warnings críticos
2. Aplicar migrations pendentes (via ferramentas Cloud)
3. Deploy de Edge Functions (automático no Lovable)
4. Publicar frontend: **Publish → Update**
5. Verificar `/health` (Founder Health Page) e telemetria

## Rollback
- Frontend: publicar versão anterior via histórico
- Backend: reverter migration com script de compensação (ver RUNBOOKS)
