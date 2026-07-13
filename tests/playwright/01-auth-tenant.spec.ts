// SPRINT 1.4 — FASE 5 — Auth + Tenant selection
// Scaffold spec. Activate per tests/playwright/README.md.
// @ts-nocheck
import { test, expect } from '@playwright/test';

test('login → seleciona empresa → seleciona loja', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/email/i).fill(process.env.E2E_EMAIL!);
  await page.getByLabel(/senha|password/i).fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: /entrar|login/i }).click();
  await expect(page).toHaveURL(/\/app/);
  // Empresa + Loja are resolved by AuthContext.loadAppContext (RPC get_user_app_context)
  await expect(page.getByTestId('app-ready')).toBeVisible({ timeout: 10_000 });
});
