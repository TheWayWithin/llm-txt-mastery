import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables for UAT
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

/**
 * Playwright configuration for User Acceptance Testing
 * Comprehensive testing across all features and user journeys
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Test files to run
  testMatch: 'user-acceptance-testing.spec.ts',
  
  // Maximum time one test can run
  timeout: 120 * 1000,
  
  // Maximum time to wait for page to load
  expect: {
    timeout: 30 * 1000,
  },
  
  // Run tests in parallel (set to false for sequential execution)
  fullyParallel: false,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests
  retries: process.env.CI ? 2 : 1,
  
  // Number of workers (parallel test execution)
  workers: process.env.CI ? 2 : 1,
  
  // Reporter configuration
  reporter: [
    // Console output
    ['list'],
    
    // HTML report with screenshots and videos
    ['html', {
      outputFolder: 'tests/reports/uat-html-report',
      open: 'never',
    }],
    
    // JSON report for programmatic analysis
    ['json', {
      outputFile: 'tests/reports/uat-results.json',
    }],
    
    // JUnit report for CI integration
    ['junit', {
      outputFile: 'tests/reports/uat-junit.xml',
    }],
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for the application
    baseURL: process.env.TEST_URL || 'https://www.llmtxtmastery.com',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Capture screenshot on failure
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
    
    // Record video on failure
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 },
    },
    
    // Emulate real user behavior
    actionTimeout: 30 * 1000,
    navigationTimeout: 30 * 1000,
    
    // Browser context options
    contextOptions: {
      // Accept downloads
      acceptDownloads: true,
      
      // Ignore HTTPS errors in test environment
      ignoreHTTPSErrors: process.env.TEST_ENV !== 'production',
      
      // Viewport size
      viewport: { width: 1440, height: 900 },
      
      // User agent (optional)
      userAgent: 'Playwright UAT Bot',
      
      // Permissions
      permissions: ['clipboard-read', 'clipboard-write'],
      
      // Geolocation (for testing location-based features)
      geolocation: { longitude: -122.4194, latitude: 37.7749 },
      
      // Locale
      locale: 'en-US',
      
      // Timezone
      timezoneId: 'America/Los_Angeles',
    },
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'X-Test-Type': 'UAT',
      'X-Test-Run': new Date().toISOString(),
    },
  },
  
  // Test projects for different browsers and viewports
  projects: [
    // ============================================================================
    // DESKTOP BROWSERS
    // ============================================================================
    
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    {
      name: 'edge-desktop',
      use: {
        ...devices['Desktop Edge'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    // ============================================================================
    // MOBILE DEVICES
    // ============================================================================
    
    {
      name: 'mobile-chrome-iphone',
      use: {
        ...devices['iPhone 13'],
      },
    },
    
    {
      name: 'mobile-safari-iphone',
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit',
      },
    },
    
    {
      name: 'mobile-chrome-android',
      use: {
        ...devices['Pixel 5'],
      },
    },
    
    // ============================================================================
    // TABLET DEVICES
    // ============================================================================
    
    {
      name: 'tablet-safari-ipad',
      use: {
        ...devices['iPad (gen 7)'],
      },
    },
    
    {
      name: 'tablet-chrome-ipad',
      use: {
        ...devices['iPad (gen 7)'],
        browserName: 'chromium',
      },
    },
    
    // ============================================================================
    // SPECIAL TEST CONFIGURATIONS
    // ============================================================================
    
    // Slow network simulation
    {
      name: 'slow-network',
      use: {
        ...devices['Desktop Chrome'],
        offline: false,
        // Simulate slow 3G network
        connectionSpeed: {
          download: ((500 * 1000) / 8) * 0.8, // 500kb/s
          upload: ((500 * 1000) / 8) * 0.8,
          latency: 400,
        },
      },
    },
    
    // High DPI screen
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 },
        deviceScaleFactor: 2,
      },
    },
    
    // Accessibility testing (with screen reader simulation)
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Force high contrast mode
        colorScheme: 'dark',
        // Reduce motion for accessibility
        reducedMotion: 'reduce',
      },
    },
  ],
  
  // Global setup and teardown
  globalSetup: './tests/e2e/utils/uat-global-setup.ts',
  globalTeardown: './tests/e2e/utils/uat-global-teardown.ts',
  
  // Web server configuration (if running locally)
  webServer: process.env.TEST_URL?.includes('localhost') ? {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'test',
      TEST_MODE: 'true',
    },
  } : undefined,
  
  // Output folder for test artifacts
  outputDir: 'tests/test-results/uat',
  
  // Preserve test artifacts
  preserveOutput: 'failures-only',
  
  // Metadata for test runs
  metadata: {
    testType: 'UAT',
    environment: process.env.TEST_ENV || 'production',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || 'unknown',
  },
});

// Environment-specific configurations
export const UAT_ENV_CONFIGS = {
  production: {
    baseURL: 'https://www.llmtxtmastery.com',
    apiURL: 'https://llm-txt-mastery-production.up.railway.app',
    stripeMode: 'live',
  },
  staging: {
    baseURL: 'https://staging.llmtxtmastery.com',
    apiURL: 'https://llm-txt-mastery-staging.up.railway.app',
    stripeMode: 'test',
  },
  development: {
    baseURL: 'http://localhost:8080',
    apiURL: 'http://localhost:8080',
    stripeMode: 'test',
  },
};

// Test data paths
export const UAT_DATA_PATHS = {
  reports: 'tests/reports',
  screenshots: 'tests/screenshots',
  downloads: 'tests/downloads',
  videos: 'tests/videos',
  traces: 'tests/traces',
};