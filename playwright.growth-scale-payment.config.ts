import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Sequential for payment flow integrity
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker to prevent race conditions in payment tests
  timeout: 120000, // 2 minutes for payment flows
  expect: {
    timeout: 15000, // 15 second timeout for assertions
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report-growth-scale-payments' }],
    ['list'],
    ['json', { outputFile: 'test-results-growth-scale-payments.json' }],
  ],

  use: {
    baseURL:
      process.env.TEST_ENV === 'production'
        ? 'https://www.llmtxtmastery.com'
        : 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20000, // 20 second timeout for actions
    navigationTimeout: 30000, // 30 second timeout for navigation
  },

  projects: [
    {
      name: 'chromium-growth-scale-payments',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox-growth-scale-payments',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Auto-start dev server for local testing
  webServer:
    process.env.TEST_ENV === 'production'
      ? undefined
      : {
          command: 'npm run dev',
          url: 'http://localhost:8080',
          reuseExistingServer: true,
          timeout: 120 * 1000,
        },
});
