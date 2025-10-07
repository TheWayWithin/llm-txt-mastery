import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/password-reset-final-validation.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for diagnostics
  workers: 1,
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  reporter: [['list'], ['json', { outputFile: 'test-results-diagnostic.json' }]],

  use: {
    baseURL: 'https://www.llmtxtmastery.com',
    trace: 'on',
    screenshot: 'always',
    video: 'on',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium-diagnostic',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
