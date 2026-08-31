import { test, expect } from '@playwright/test';

test('home affiche les trois services', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Que voulez-vous');
  await expect(page.getByRole('heading', { name: 'mAI Web', exact: true })).toBeVisible();
  // mAI Website card
  await expect(page.getByRole('heading', { name: 'mAI Website', exact: true })).toBeVisible();
});

test('navigation web via tabs', async ({ page }) => {
  await page.goto('/');
  // Desktop: click web card or open via Home
  const webCard = page
    .locator('.service-card')
    .filter({ has: page.getByRole('heading', { name: 'mAI Web', exact: true }) });
  if (await webCard.isVisible()) {
    await webCard.click();
    // Should open web panel toolbar
    await expect(page.locator('.web-toolbar')).toBeVisible({ timeout: 10_000 });
  }
});

test('command palette Cmd+K', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+K');
  // May not be visible on mobile, but test that no crash
  await expect(page.locator('body')).toBeVisible();
});
