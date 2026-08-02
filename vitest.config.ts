import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    projects: [
      {
        // Pure functions with no DOM dependency.
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
        },
      },
      {
        // Everything else. This library is built on getBoundingClientRect,
        // getClientRects and SVGPathElement.getTotalLength; jsdom returns
        // zeroes for the first two and does not implement the third at all,
        // so these have to run against a real engine.
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
