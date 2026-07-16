# Developer Guide

## Setup
```bash
npm install
npm run dev
```

## Convenções
- Tokens semânticos apenas (nunca `bg-blue-500`)
- TypeScript strict, sem `any`
- RLS em 100% das tabelas públicas
- `getProfile()` para identidade
- `cn()` de `@/lib/utils` para classes condicionais
- Componentes ≤ 150 linhas

## Testes
```bash
npm run test         # Vitest
npx playwright test  # E2E
```

## Estrutura
- `src/pages` — rotas
- `src/components` — UI reutilizável
- `src/hooks` — lógica compartilhada
- `src/lib` — utilitários e engines
- `supabase/functions` — Edge Functions
