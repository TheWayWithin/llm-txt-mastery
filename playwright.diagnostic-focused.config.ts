import { defineConfig, devices } from '@playwright/test';

/**
 * Focused Diagnostic Configuration for Password Reset Testing
 * Optimized for quick analysis and issue identification
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/password-reset-diagnostic-focused.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for diagnostic
  workers: 1,
  timeout: 60000, // 1 minute per test

  expect: {
    timeout: 15000, // 15 seconds for assertions
  },

  reporter: [
    ['list'], // Detailed console output
    ['html', { outputFolder: 'playwright-report-diagnostic' }],
    ['json', { outputFile: 'test-results-diagnostic.json' }],
  ],

  use: {
    baseURL: 'https://llmtxtmastery.com',
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 20000,
  },

  projects: [
    {
      name: 'diagnostic',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
