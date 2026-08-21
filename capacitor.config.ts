import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mai.app',
  appName: 'mAI',
  webDir: 'dist',
  backgroundColor: '#07090f',
  ios: { contentInset: 'automatic', scrollEnabled: true },
  android: { backgroundColor: '#07090f', allowMixedContent: false },
};
export default config;
