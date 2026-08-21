import { test, expect, _electron as electron } from '@playwright/test';
import path from 'node:path';

test('Electron lance la fenêtre principale', async () => {
  // Note: nécessite un build préalable `npm run build && npm run electron:compile`
  // Skip si pas de build (CI le fera)
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '../../build-electron/main.cjs')],
    env: { ...process.env, NODE_ENV: 'test' },
  });

  const window = await electronApp.firstWindow();
  await window.waitForLoadState();
  await expect(window.locator('.titlebar')).toBeVisible();
  await expect(window.getByText('Que voulez-vous')).toBeVisible();

  // Raccourci Cmd+1
  await window.keyboard.press('Control+1');
  // Pas de crash

  // Vérifier auto-update menu existe
  // (on ne teste pas le téléchargement réel)

  await electronApp.close();
});

test.skip('Capacitor — placeholder (nécessite émulateur)', async () => {
  // Test Capacitor via webview ou via `npx cap` — placeholder
  // À compléter avec @capacitor-community/test-utils
});
