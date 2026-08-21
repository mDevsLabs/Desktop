import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SERVICES } from '../src/types';
describe('configuration mAI', () => {
  it('n’utilise que des URLs HTTPS autorisées', () => {
    expect(new URL(SERVICES.web.url).protocol).toBe('https:');
    expect(new URL(SERVICES.website.url).protocol).toBe('https:');
  });
  it('pointe vers les deux services attendus', () => {
    expect(SERVICES.web.url).toContain('mai-officiel.vercel.app');
    expect(SERVICES.website.url).toContain('mai-devs.vercel.app');
  });
  it('utilise le même identifiant natif sur les cinq plateformes', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(pkg.build.appId).toBe('com.mai.app');
    expect(readFileSync('capacitor.config.ts', 'utf8')).toContain("appId: 'com.mai.app'");
    expect(readFileSync('android/app/build.gradle', 'utf8')).toContain(
      'applicationId "com.mai.app"'
    );
    expect(readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8')).toContain(
      'PRODUCT_BUNDLE_IDENTIFIER = com.mai.app;'
    );
  });
  it('produit un binaire iOS pour appareil dans la CI', () => {
    const workflow = readFileSync('.github/workflows/build.yml', 'utf8');
    expect(workflow).toContain("destination 'generic/platform=iOS'");
    expect(workflow).toContain('mAI-iOS-device-unsigned.ipa');
  });
});
