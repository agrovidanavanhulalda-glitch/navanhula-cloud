// SPRINT 1.4 — FASE 5 — Fiscal + Storage
// @ts-nocheck
import { test, expect } from '@playwright/test';

test('issue fiscal document and download PDF from storage', async ({ page }) => {
  await page.goto('/app/fiscal');
  await page.getByRole('button', { name: /emitir/i }).first().click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /pdf/i }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
});
