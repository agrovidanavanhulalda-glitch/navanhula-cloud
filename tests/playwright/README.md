# SPRINT 1.4 — FASE 5 — PLAYWRIGHT CERTIFICATION

QUALITY GATE: **tests-only**. Does not alter UX, APIs, business rules,
architecture or migrations.

## Why these specs are scaffolds (not wired to CI yet)

Playwright is **not** currently a project dependency and the repository
already ships a Vitest-based E2E suite under `src/tests/e2e/`. Adding
`@playwright/test` + a browser runtime to `package.json` would be a
build-system change, which is explicitly out of scope for this sprint.

The specs below are **certification-ready**: they capture every flow
required by Sprint 1.4 in executable Playwright syntax. To activate:

```bash
bun add -D @playwright/test
bunx playwright install --with-deps chromium
bunx playwright test tests/playwright
```

## Coverage matrix

| Flow                              | Spec file                          |
| --------------------------------- | ---------------------------------- |
| Login → Empresa → Loja            | `01-auth-tenant.spec.ts`           |
| Abrir Caixa → Venda → Pagamento   | `02-pos-checkout.spec.ts`          |
| Stock → Financeiro                | `03-stock-finance.spec.ts`         |
| Fiscal → Storage                  | `04-fiscal-storage.spec.ts`        |
| Dashboard Founder → CRM → Billing | `05-founder-crm-billing.spec.ts`   |
| Offline / Reconexão / Retry / DLQ | `06-offline-sync-dlq.spec.ts`      |
| Voucher / Split / Cancelamento    | `07-payment-edge-cases.spec.ts`    |
| Logout                            | `08-logout.spec.ts`                |
