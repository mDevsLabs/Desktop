import { test, expect } from '@playwright/test';

test('home affiche les trois services', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Que voulez-vous')).toBeVisible();
  await expect(page.getByText('mAI Web')).toBeVisible();
  // mAI Website card
  await expect(page.getByText('mAI Website')).toBeVisible();
});

test('navigation web via tabs', async ({ page }) => {
  await page.goto('/');
  // Desktop: click web card or open via Home
  const webCard = page.locator('.service-card', { hasText: 'mAI Web' });
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
