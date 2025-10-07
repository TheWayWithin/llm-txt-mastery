import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Sequential for production validation
  forbidOnly: !!process.env.CI,
  retries: 2, // More retries for production tests
  workers: 1, // Single worker for production tests
  timeout: 60000, // 60 second timeout for production tests
  expect: {
    timeout: 10000, // 10 second timeout for assertions
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report-production' }],
    ['list'],
    ['json', { outputFile: 'test-results-production.json' }],
  ],

  use: {
    baseURL: 'https://www.llmtxtmastery.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000, // 15 second timeout for actions
    navigationTimeout: 30000, // 30 second timeout for navigation
  },

  projects: [
    {
      name: 'chromium-production',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox-production',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // No web server needed for production tests
});
