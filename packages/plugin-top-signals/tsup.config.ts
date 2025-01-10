import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/actions/checkMarketSignals.ts', 'src/actions/addMarketSignal.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node18',
  sourcemap: true,
  minify: false,
  splitting: false,
  noExternal: ['@elizaos/core'],
  outDir: 'dist',
  platform: 'node',
  bundle: true,
  shims: true
}); 