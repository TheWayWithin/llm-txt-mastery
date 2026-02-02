import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Sequential for integration tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for integration tests
  reporter: [['html'], ['list'], ['json', { outputFile: 'test-results.json' }]],

  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Local development
    {
      name: 'localhost',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8080',
      },
    },
    // Staging environment (no local webserver needed)
    {
      name: 'staging',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'https://develop--llm-txt-mastery.netlify.app',
      },
    },
    // Production environment (no local webserver needed)
    {
      name: 'production',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'https://llmtxtmastery.com',
      },
    },
  ],

  // Only start local webserver for localhost tests
  // Skip when running against staging/production (set SKIP_WEBSERVER=1)
  ...(!process.env.SKIP_WEBSERVER ? {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:8080',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
  } : {}),
});
