import { build } from 'esbuild';
import { rm, mkdir } from 'node:fs/promises';
await rm('build-electron', { recursive: true, force: true });
await mkdir('build-electron', { recursive: true });
const common = { bundle: true, platform: 'node', target: 'node22', format: 'cjs', sourcemap: true, external: ['electron', 'node-pty'] };
await Promise.all([
  build({ ...common, entryPoints: ['electron/main.ts'], outfile: 'build-electron/main.cjs' }),
  build({ ...common, entryPoints: ['electron/preload.ts'], outfile: 'build-electron/preload.cjs' })
]);
