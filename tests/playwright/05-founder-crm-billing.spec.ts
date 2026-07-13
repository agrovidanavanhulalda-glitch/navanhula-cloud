// SPRINT 1.4 — FASE 5 — Founder dashboard + CRM + Billing
// @ts-nocheck
import { test, expect } from '@playwright/test';

test('founder dashboard renders global metrics', async ({ page }) => {
  await page.goto('/founder');
  await expect(page.getByText(/MRR|ARR|Churn/i)).toBeVisible();
});

test('CRM tasks page loads', async ({ page }) => {
  await page.goto('/app/crm');
  await expect(page.getByRole('heading', { name: /crm/i })).toBeVisible();
});

test('billing page shows subscription status', async ({ page }) => {
  await page.goto('/app/subscription');
  await expect(page.getByText(/plano|plan/i)).toBeVisible();
});
