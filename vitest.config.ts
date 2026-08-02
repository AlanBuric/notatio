import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: '/src/' }],
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
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
