import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import dts from 'unplugin-dts/vite';

export default defineConfig({
  plugins: [dts({ include: ['src'], tsconfigPath: './tsconfig.build.json' })],
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: decodeURIComponent(new URL('./src/', import.meta.url).pathname).replace(
          /^\/(?=[a-zA-Z]:)/,
          '',
        ),
      },
    ],
  },
  build: {
    sourcemap: true,
    minify: 'terser',
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    terserOptions: {
      compress: {
        passes: 3,
        unsafe: true,
      },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['test/browser/**/*.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            screenshotFailures: false,
            instances: [{ browser: 'chromium' }, { browser: 'webkit' }, { browser: 'firefox' }],
          },
        },
      },
    ],
  },
});
