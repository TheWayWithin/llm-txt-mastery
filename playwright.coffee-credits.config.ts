import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/coffee-credits*.spec.ts',
  fullyParallel: false, // Sequential for production testing
  forbidOnly: !!process.env.CI,
  retries: 2, // Retry failed tests in production
  workers: 1, // Single worker for production tests
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 30000 // 30 second expect timeout
  },
  
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report-coffee-credits',
      open: 'never' 
    }],
    ['list'],
    ['json', { outputFile: 'test-results/coffee-credits-results.json' }]
  ],
  
  use: {
    // Production URLs - no local server
    baseURL: 'https://www.llmtxtmastery.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Longer timeouts for production
    actionTimeout: 30000,
    navigationTimeout: 60000,
    
    // Production-appropriate settings
    ignoreHTTPSErrors: false,
    acceptDownloads: true,
    
    // Extra context for debugging
    contextOptions: {
      recordVideo: {
        dir: 'test-results/videos/',
        size: { width: 1280, height: 720 }
      }
    }
  },

  projects: [
    {
      name: 'chromium-production',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'firefox-production',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
    }
  ],

  // No web server - testing against production
});