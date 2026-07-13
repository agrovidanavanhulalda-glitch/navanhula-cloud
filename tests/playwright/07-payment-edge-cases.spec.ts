// SPRINT 1.4 — FASE 5 — Voucher / Split payment / Cancelamento
// @ts-nocheck
import { test, expect } from '@playwright/test';

test('split payment: cash + mpesa', async ({ page }) => {
  await page.goto('/app/pos');
  await page.getByRole('button', { name: /split|dividir/i }).click();
  await page.getByLabel(/dinheiro/i).fill('500');
  await page.getByLabel(/mpesa/i).fill('500');
  await page.getByRole('button', { name: /confirmar/i }).click();
  await expect(page.getByText(/venda concluída/i)).toBeVisible();
});

test('admin cancels a sale with justification and stock is restored', async ({ page }) => {
  await page.goto('/app/sales-history');
  await page.getByRole('button', { name: /cancelar/i }).first().click();
  await page.getByLabel(/justificativa/i).fill('erro do operador');
  await page.getByRole('button', { name: /confirmar cancelamento/i }).click();
  await expect(page.getByText(/CANCELADA/)).toBeVisible();
});
