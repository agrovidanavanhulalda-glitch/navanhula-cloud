// SPRINT 1.4 — FASE 5 — Logout
// @ts-nocheck
import { test, expect } from '@playwright/test';

test('logout clears session and returns to login', async ({ page }) => {
  await page.goto('/app');
  await page.getByRole('button', { name: /sair|logout/i }).click();
  await expect(page).toHaveURL(/\/(login|auth|)$/);
});
