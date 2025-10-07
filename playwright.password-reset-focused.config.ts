import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/password-reset-focused.spec.ts',
  fullyParallel: false, // Sequential execution for consistency
  forbidOnly: !!process.env.CI,
  retries: 1, // One retry for network issues
  workers: 1, // Single worker
  timeout: 60000, // 1 minute per test
  expect: {
    timeout: 15000, // 15 second timeout for assertions
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report-password-reset-focused' }],
    ['list'],
    ['json', { outputFile: 'test-results-password-reset-focused.json' }],
  ],

  use: {
    baseURL: 'https://www.llmtxtmastery.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000, // 10 second timeout for actions
    navigationTimeout: 20000, // 20 second timeout for navigation
  },

  projects: [
    {
      name: 'chromium-focused',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox-focused',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
