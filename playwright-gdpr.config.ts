import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for GDPR Compliance Testing
 * 
 * Specialized configuration for testing GDPR compliance against the production site.
 * Includes cross-browser testing, network monitoring, and consent persistence validation.
 */

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/gdpr-compliance-comprehensive.spec.ts',
  
  // Parallel execution for cross-browser testing
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 3,
  
  // Extended timeout for comprehensive GDPR tests
  timeout: 60000,
  expect: { timeout: 10000 },
  
  // Comprehensive reporting for compliance documentation
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report-gdpr',
      open: 'never'
    }],
    ['list'],
    ['json', { 
      outputFile: 'test-results-gdpr.json' 
    }],
    ['junit', { 
      outputFile: 'test-results-gdpr.xml' 
    }]
  ],
  
  use: {
    // Production site URL
    baseURL: 'https://www.llmtxtmastery.com',
    
    // Enhanced tracing for GDPR compliance analysis
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Network monitoring for consent validation
    launchOptions: {
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--enable-logging',
        '--log-level=0'
      ]
    },
    
    // Extended action timeout for consent interactions
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Locale settings for EU compliance testing
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  },

  projects: [
    {
      name: 'chromium-gdpr',
      use: { 
        ...devices['Desktop Chrome'],
        contextOptions: {
          // Clear storage for fresh consent testing
          storageState: undefined,
          // Simulate EU user for GDPR requirements
          geolocation: { latitude: 51.5074, longitude: -0.1278 }, // London
          permissions: ['geolocation'],
        }
      },
    },
    {
      name: 'firefox-gdpr',
      use: { 
        ...devices['Desktop Firefox'],
        contextOptions: {
          storageState: undefined,
          geolocation: { latitude: 48.8566, longitude: 2.3522 }, // Paris
          permissions: ['geolocation'],
        }
      },
    },
    {
      name: 'webkit-gdpr',
      use: { 
        ...devices['Desktop Safari'],
        contextOptions: {
          storageState: undefined,
          geolocation: { latitude: 52.5200, longitude: 13.4050 }, // Berlin
          permissions: ['geolocation'],
        }
      },
    },
    {
      name: 'mobile-chrome-gdpr',
      use: { 
        ...devices['Pixel 5'],
        contextOptions: {
          storageState: undefined,
          geolocation: { latitude: 41.9028, longitude: 12.4964 }, // Rome
          permissions: ['geolocation'],
        }
      },
    },
    {
      name: 'mobile-safari-gdpr',
      use: { 
        ...devices['iPhone 12'],
        contextOptions: {
          storageState: undefined,
          geolocation: { latitude: 40.4168, longitude: -3.7038 }, // Madrid
          permissions: ['geolocation'],
        }
      },
    },
  ],

  // No local server needed - testing against production
  webServer: undefined,
});