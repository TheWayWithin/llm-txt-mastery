import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/password-reset-comprehensive.spec.ts',
  fullyParallel: false, // Sequential execution for email testing
  forbidOnly: !!process.env.CI,
  retries: 1, // One retry for network issues
  workers: 1, // Single worker to avoid email conflicts
  timeout: 120000, // 2 minutes per test (for email waiting)
  expect: {
    timeout: 30000, // 30 second timeout for assertions
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report-password-reset' }],
    ['list'],
    ['json', { outputFile: 'test-results-password-reset.json' }],
    ['junit', { outputFile: 'test-results-password-reset.xml' }]
  ],
  
  use: {
    baseURL: 'https://www.llmtxtmastery.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure', 
    video: 'retain-on-failure',
    actionTimeout: 15000, // 15 second timeout for actions
    navigationTimeout: 30000, // 30 second timeout for navigation
    
    // Additional context options for email testing
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
  },

  projects: [
    {
      name: 'chromium-password-reset',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Enable permissions for notifications (if needed for email)
        permissions: ['notifications'],
        // Use a persistent context to handle email sessions
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor'],
        }
      },
    },
    {
      name: 'firefox-password-reset',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
    // Uncomment for WebKit testing (Safari) if needed
    // {
    //   name: 'webkit-password-reset',
    //   use: { 
    //     ...devices['Desktop Safari'],
    //     viewport: { width: 1280, height: 720 },
    //   },
    // },
  ],

  // No web server needed for production tests
});