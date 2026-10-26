import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the same build works at https://<user>.github.io/<repo>/ and locally.
  base: './',
  build: {
    target: 'es2022',
  },
  // ffmpeg.wasm starts a module worker that imports its core dynamically.
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
