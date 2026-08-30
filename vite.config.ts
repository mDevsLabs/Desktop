import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [react()],
  base: './',
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version) },
  build: { outDir: 'dist', emptyOutDir: true },
  server: { host: '0.0.0.0', port: 5173, strictPort: true, allowedHosts: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: true,
    // Pool « forks » trop lent à démarrer sous Windows ; « threads »
    // fonctionne partout et garde jsdom en parallèle sous Linux/CI.
    pool: 'threads',
    // Sous Windows, le démarrage concurrent de 4 workers jsdom dépasse le
    // timeout interne de 60 s de vitest (non configurable) → fichiers séquentiels.
    ...(process.platform === 'win32' ? { fileParallelism: false } : {}),
  },
});
