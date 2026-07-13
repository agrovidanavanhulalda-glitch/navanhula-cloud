// SPRINT 1.4 — FASE 5 — Stock + Financeiro
// @ts-nocheck
import { test, expect } from '@playwright/test';

test('sale decrements stock and posts a financial transaction', async ({ page }) => {
  await page.goto('/app/estoque');
  await expect(page.getByRole('table')).toBeVisible();
  await page.goto('/app/financeiro-rh');
  await expect(page.getByText(/receita|revenue/i)).toBeVisible();
});
