import { test, expect, type Page } from '@playwright/test';

/**
 * DIAGNOSTIC PASSWORD RESET TESTING
 *
 * This test helps diagnose what's happening with the password reset pages
 * by capturing detailed information about the page state and elements.
 */

const PRODUCTION_URL = 'https://www.llmtxtmastery.com';

async function capturePageDiagnostics(page: Page, testName: string) {
  console.log(`🔍 Capturing diagnostics for: ${testName}`);

  // Get current URL
  const currentUrl = page.url();
  console.log(`📍 Current URL: ${currentUrl}`);

  // Get page title
  const title = await page.title();
  console.log(`📄 Page title: ${title}`);

  // Check if page loaded successfully
  const bodyText = await page.textContent('body');
  if (bodyText && bodyText.length > 0) {
    console.log(`📝 Page has content (${bodyText.length} characters)`);
    console.log(`📝 First 200 chars: ${bodyText.substring(0, 200)}...`);
  } else {
    console.log(`❌ Page appears to have no content`);
  }

  // Check for common error indicators
  const hasError = await page.locator('text=/404|not found|error|failed/i').isVisible();
  if (hasError) {
    console.log(`❌ Page contains error indicators`);
  }

  // Check for loading indicators
  const isLoading = await page
    .locator('text=/loading|please wait/i, [class*="loading"], [class*="spinner"]')
    .isVisible();
  if (isLoading) {
    console.log(`⏳ Page appears to still be loading`);
  }

  // Take screenshot for visual inspection
  await page.screenshot({
    path: `test-results/diagnostic-${testName}-${Date.now()}.png`,
    fullPage: true,
  });

  console.log(`✅ Diagnostics captured for ${testName}`);
}

test.describe('Password Reset - Diagnostic Tests', () => {
  test('Diagnose forgot password page', async ({ page }) => {
    console.log('🔍 Diagnosing forgot password page');

    try {
      await page.goto(`${PRODUCTION_URL}/forgot-password`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      await capturePageDiagnostics(page, 'forgot-password');

      // Look for specific elements
      console.log('🔍 Checking for specific elements:');

      const emailInput = page.locator('input[type="email"]');
      const emailVisible = await emailInput.isVisible();
      console.log(`📧 Email input visible: ${emailVisible}`);

      const submitButton = page.locator('button[type="submit"]');
      const submitVisible = await submitButton.isVisible();
      console.log(`🔲 Submit button visible: ${submitVisible}`);

      // Check for form element
      const form = page.locator('form');
      const formVisible = await form.isVisible();
      console.log(`📋 Form element visible: ${formVisible}`);

      // Check for specific text content
      const hasPasswordResetText = await page
        .locator('text=/reset.*password|forgot.*password/i')
        .isVisible();
      console.log(`📝 Password reset text found: ${hasPasswordResetText}`);

      // Check for any React/JS errors
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(`Page Error: ${error.message}`);
      });

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(`Console Error: ${msg.text()}`);
        }
      });

      await page.waitForTimeout(3000); // Wait to catch any late errors

      if (errors.length > 0) {
        console.log('❌ JavaScript errors detected:');
        errors.forEach((error) => console.log(`  - ${error}`));
      } else {
        console.log('✅ No JavaScript errors detected');
      }
    } catch (error) {
      console.log(`❌ Error accessing forgot password page: ${error}`);
    }
  });

  test('Diagnose reset password page with token', async ({ page }) => {
    console.log('🔍 Diagnosing reset password page with token');

    try {
      await page.goto(`${PRODUCTION_URL}/reset-password?token=test-token`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      await capturePageDiagnostics(page, 'reset-password-with-token');

      // Look for specific elements
      console.log('🔍 Checking for specific elements:');

      const passwordInput = page.locator('input[id="password"]');
      const passwordVisible = await passwordInput.isVisible();
      console.log(`🔐 Password input visible: ${passwordVisible}`);

      const confirmInput = page.locator('input[id="confirmPassword"]');
      const confirmVisible = await confirmInput.isVisible();
      console.log(`🔐 Confirm password input visible: ${confirmVisible}`);

      const submitButton = page.locator('button[type="submit"]');
      const submitVisible = await submitButton.isVisible();
      console.log(`🔲 Submit button visible: ${submitVisible}`);

      // Check for specific text content
      const hasNewPasswordText = await page
        .locator('text=/set.*new.*password|new.*password/i')
        .isVisible();
      console.log(`📝 New password text found: ${hasNewPasswordText}`);
    } catch (error) {
      console.log(`❌ Error accessing reset password page: ${error}`);
    }
  });

  test('Diagnose reset password page without token', async ({ page }) => {
    console.log('🔍 Diagnosing reset password page without token');

    try {
      await page.goto(`${PRODUCTION_URL}/reset-password`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      await capturePageDiagnostics(page, 'reset-password-no-token');

      // Look for error message about missing token
      const hasTokenError = await page.locator('text=/invalid.*token|missing.*token/i').isVisible();
      console.log(`🚫 Token error message visible: ${hasTokenError}`);

      // Check if it redirects or shows error in place
      const currentUrl = page.url();
      console.log(`📍 Final URL after navigation: ${currentUrl}`);
    } catch (error) {
      console.log(`❌ Error accessing reset password page without token: ${error}`);
    }
  });

  test('Check site accessibility and routing', async ({ page }) => {
    console.log('🔍 Diagnosing site accessibility');

    try {
      // Test main site first
      await page.goto(PRODUCTION_URL, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      await capturePageDiagnostics(page, 'main-site');

      // Test navigation to password reset from main site
      try {
        const forgotPasswordLink = page.locator(
          'a[href*="forgot-password"], a:has-text("forgot password")'
        );
        const linkExists = await forgotPasswordLink.isVisible();
        console.log(`🔗 Forgot password link exists on main page: ${linkExists}`);

        if (linkExists) {
          await forgotPasswordLink.click();
          await page.waitForLoadState('networkidle');
          console.log(`📍 After clicking link, URL: ${page.url()}`);
        }
      } catch (navError) {
        console.log(`⚠️ Could not navigate via link: ${navError}`);
      }

      // Test direct API access
      const apiHealth = await page.request.get(
        'https://llm-txt-mastery-production.up.railway.app/api/health'
      );
      console.log(`🔗 API health status: ${apiHealth.status()}`);

      const forgotPasswordApi = await page.request.post(
        'https://llm-txt-mastery-production.up.railway.app/api/auth/request-password-reset',
        {
          data: { email: 'test@example.com' },
          headers: { 'Content-Type': 'application/json' },
        }
      );
      console.log(`📧 Forgot password API status: ${forgotPasswordApi.status()}`);
    } catch (error) {
      console.log(`❌ Error checking site accessibility: ${error}`);
    }
  });

  test('Network and performance diagnostics', async ({ page }) => {
    console.log('🔍 Running network and performance diagnostics');

    // Monitor network requests
    const requests: string[] = [];
    const failedRequests: string[] = [];

    page.on('request', (request) => {
      requests.push(`${request.method()} ${request.url()}`);
    });

    page.on('requestfailed', (request) => {
      failedRequests.push(
        `FAILED: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`
      );
    });

    try {
      const startTime = Date.now();

      await page.goto(`${PRODUCTION_URL}/forgot-password`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      const loadTime = Date.now() - startTime;
      console.log(`⏱️ Page load time: ${loadTime}ms`);

      console.log(`📡 Total network requests: ${requests.length}`);
      if (failedRequests.length > 0) {
        console.log(`❌ Failed requests (${failedRequests.length}):`);
        failedRequests.forEach((req) => console.log(`  - ${req}`));
      } else {
        console.log(`✅ No failed network requests`);
      }

      // Show first few successful requests for debugging
      console.log(`📡 First 10 network requests:`);
      requests.slice(0, 10).forEach((req) => console.log(`  - ${req}`));
    } catch (error) {
      console.log(`❌ Network diagnostics error: ${error}`);
    }
  });

  test('Browser compatibility check', async ({ page, browserName }) => {
    console.log(`🌐 Browser compatibility check for ${browserName}`);

    try {
      await page.goto(`${PRODUCTION_URL}/forgot-password`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Check basic browser capabilities
      const userAgent = await page.evaluate(() => navigator.userAgent);
      console.log(`🔍 User agent: ${userAgent}`);

      const hasLocalStorage = await page.evaluate(() => typeof Storage !== 'undefined');
      console.log(`💾 LocalStorage available: ${hasLocalStorage}`);

      const hasConsole = await page.evaluate(() => typeof console !== 'undefined');
      console.log(`📝 Console available: ${hasConsole}`);

      // Check for browser-specific issues
      const supportsES6 = await page.evaluate(() => {
        try {
          // Test arrow functions
          const arrow = () => true;
          // Test template literals
          const template = `test`;
          // Test const/let
          const constTest = true;
          return true;
        } catch {
          return false;
        }
      });
      console.log(`⚡ ES6 support: ${supportsES6}`);

      await capturePageDiagnostics(page, `browser-${browserName}`);
    } catch (error) {
      console.log(`❌ Browser compatibility check failed: ${error}`);
    }
  });
});
