import { defineConfig, devices } from '@playwright/test';

/**
 * Production-Ready Password Reset Testing Configuration
 * 
 * Optimized for reliability and real-world testing scenarios
 * with improved timeout handling and better error recovery.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/password-reset-production-ready.spec.ts',
  fullyParallel: false, // Sequential for email service coordination
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // More retries in CI
  workers: 1, // Single worker to prevent conflicts
  timeout: 180000, // 3 minutes per test (generous for production)
  
  expect: {
    timeout: 45000, // 45 second timeout for assertions
  },
  
  reporter: [
    ['html', { outputFolder: 'playwright-report-password-reset-production' }],
    ['list'],
    ['json', { outputFile: 'test-results-password-reset-production.json' }],
    ['junit', { outputFile: 'test-results-password-reset-production.xml' }]
  ],
  
  use: {
    baseURL: 'https://www.llmtxtmastery.com',
    trace: 'retain-on-failure', // Always keep traces on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000, // 30 seconds for actions
    navigationTimeout: 45000, // 45 seconds for navigation
    
    // Enhanced HTTP headers for better compatibility
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none'
    },
  },

  projects: [
    // Primary testing - Chromium
    {
      name: 'chromium-production',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Enhanced browser settings for production testing
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security', // For CORS testing
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ],
        },
        // Set user agent to avoid bot detection
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
    },
    
    // Secondary testing - Firefox
    {
      name: 'firefox-production',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
        // Firefox-specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': false,
            'dom.push.enabled': false
          }
        }
      },
    },
    
    // Mobile testing - Safari on iPhone
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 13'],
        // Mobile-specific timeout adjustments
        actionTimeout: 20000,
        navigationTimeout: 30000
      },
    }
  ],

  // Global setup and teardown
  globalSetup: undefined, // No global setup needed for production tests
  globalTeardown: undefined,
});