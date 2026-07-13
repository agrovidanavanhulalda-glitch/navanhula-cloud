// SPRINT 1.4 — FASE 5 — Offline / Reconexão / Retry / Worker / DLQ
// @ts-nocheck
import { test, expect } from '@playwright/test';

test('sale queued while offline replays on reconnect', async ({ page, context }) => {
  await page.goto('/app/pos');
  await context.setOffline(true);
  await page.getByRole('button', { name: /finalizar/i }).click();
  await expect(page.getByText(/offline|pendente/i)).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText(/sincronizado|synced/i)).toBeVisible({ timeout: 15_000 });
});

test('failed task lands in DLQ after max retries', async ({ page }) => {
  await page.goto('/founder/fiscal-dlq');
  await expect(page.getByRole('heading', { name: /dlq/i })).toBeVisible();
});
