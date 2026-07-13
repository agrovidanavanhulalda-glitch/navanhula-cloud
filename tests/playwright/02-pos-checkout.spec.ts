// SPRINT 1.4 — FASE 5 — POS: abrir caixa → venda → pagamento
// @ts-nocheck
import { test, expect } from '@playwright/test';

test('POS end-to-end: open register, add item, pay cash', async ({ page }) => {
  await page.goto('/app/pos');
  await page.getByRole('button', { name: /abrir caixa/i }).click();
  await page.getByLabel(/saldo inicial/i).fill('1000');
  await page.getByRole('button', { name: /confirmar/i }).click();

  await page.getByPlaceholder(/buscar produto/i).fill('SKU-001');
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: /finalizar/i }).click();
  await page.getByRole('radio', { name: /dinheiro|cash/i }).check();
  await page.getByRole('button', { name: /confirmar pagamento/i }).click();

  await expect(page.getByText(/venda concluída|sale complete/i)).toBeVisible();
});
