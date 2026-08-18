import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  base: './',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^notatio$/, replacement: fileURLToPath(new URL('../../src/index.ts', import.meta.url)) },
      { find: /^@\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) },
    ],
  },
  server: {
    fs: { allow: [repositoryRoot] },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
