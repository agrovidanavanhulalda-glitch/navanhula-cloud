# Architecture

## Stack
- Frontend: React 18 + Vite 5 + TypeScript 5 + Tailwind v3 + shadcn/ui
- Backend: Lovable Cloud (PostgreSQL + Auth + Storage + Edge Functions + Realtime)
- State/Data: TanStack Query · React Router · React Hook Form + Zod
- Observability: telemetry buffer + server sink + edge function `telemetry-sink`

## Multi-tenancy
- Isolamento por `company_id` via RLS
- Funções: `get_user_company_ids()`, `get_user_branch_ids()`, `has_role()`
- Roles em tabela dedicada `user_roles` (nunca em `profiles`)

## Módulos protegidos (imutáveis nesta Sprint)
POS · Fiscal · Billing · CRM · Inventário · Auth · Multi-Tenant · Workers · Edge Functions · RPCs · APIs · RLS

## Camadas Enterprise
- `src/lib/agentic/release/*` — Release/Certification engines (read-only)
- `src/lib/telemetry/*` — coleta e retenção
- `src/pages/founder/*` — consoles internos (read-only)
