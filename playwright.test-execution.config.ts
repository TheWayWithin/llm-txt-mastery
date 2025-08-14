import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Sequential for integration tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Allow 1 retry for flaky tests
  workers: 1, // Single worker for integration tests
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  use: {
    // Use port 8080 to match server default
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Add more time for actions since we're testing conversion flows
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'conversion-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/conversion-validation-tests.spec.ts', '**/diagnostic-conversion-test.spec.ts']
    }
  ],

  // Server should be manually started before running tests
});