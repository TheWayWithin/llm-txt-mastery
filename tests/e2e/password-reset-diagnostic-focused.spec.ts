/**
 * FOCUSED PASSWORD RESET DIAGNOSTIC TEST
 *
 * This diagnostic test specifically identifies issues with the password reset flow
 * and provides detailed evidence of current functionality and security measures.
 */

import { test, expect, type Page } from '@playwright/test';

// Production URLs
const PRODUCTION_URL = 'https://llmtxtmastery.com'; // Note: no www based on redirect
const API_BASE_URL = 'https://llm-txt-mastery-production.up.railway.app';

/**
 * Diagnostic utility functions
 */
async function capturePageDetails(page: Page, testName: string) {
  const timestamp = Date.now();

  // Take screenshot
  await page.screenshot({
    path: `test-results/diagnostic-${testName}-${timestamp}.png`,
    fullPage: true,
  });

  // Log page details
  console.log(`📸 Screenshot saved: diagnostic-${testName}-${timestamp}.png`);
  console.log(`🌐 Current URL: ${page.url()}`);
  console.log(`📄 Page Title: ${await page.title()}`);

  // Log visible form elements
  const forms = await page.locator('form').count();
  const inputs = await page.locator('input').count();
  const buttons = await page.locator('button').count();

  console.log(`📋 Forms found: ${forms}, Inputs: ${inputs}, Buttons: ${buttons}`);
}

async function logFormStructure(page: Page) {
  console.log('🔍 Analyzing form structure...');

  try {
    // Find all input elements
    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const type = await input.getAttribute('type');
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');

      console.log(
        `  Input ${i + 1}: type="${type}", id="${id}", name="${name}", placeholder="${placeholder}"`
      );
    }

    // Find all buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const type = await button.getAttribute('type');
      const text = await button.textContent();

      console.log(`  Button ${i + 1}: type="${type}", text="${text}"`);
    }
  } catch (error) {
    console.log(`⚠️ Error analyzing form: ${error}`);
  }
}

/**
 * PHASE 1: Site Structure Diagnostic
 */
test.describe('Password Reset Diagnostic - Site Structure', () => {
  test('Analyze forgot password page structure', async ({ page }) => {
    console.log('🔧 DIAGNOSTIC: Analyzing forgot password page');

    // Navigate to forgot password page
    await page.goto(`${PRODUCTION_URL}/forgot-password`);
    await capturePageDetails(page, 'forgot-password-page');

    // Check if page exists and loads correctly
    const pageTitle = await page.title();
    const pageUrl = page.url();

    console.log(`📄 Page loaded: ${pageUrl}`);
    console.log(`📄 Title: ${pageTitle}`);

    // Check for redirect to homepage
    if (pageUrl === `${PRODUCTION_URL}/` || pageUrl === `${PRODUCTION_URL}`) {
      console.log('⚠️ ISSUE: Forgot password page redirects to homepage');
      console.log('🔧 RECOMMENDATION: Implement /forgot-password route');

      // Check if there's a login/auth modal or section
      const authModal = page.locator(
        '[data-testid*="auth"], [data-testid*="login"], .auth-modal, .login-modal'
      );
      const loginForms = page.locator('form:has(input[type="password"])');
      const loginCount = await loginForms.count();

      console.log(`🔍 Login forms found: ${loginCount}`);

      if (loginCount > 0) {
        console.log('✅ Login functionality exists on homepage');
        await logFormStructure(page);
      }
    } else {
      console.log('✅ Dedicated forgot password page exists');
      await logFormStructure(page);
    }
  });

  test('Check reset password page structure', async ({ page }) => {
    console.log('🔧 DIAGNOSTIC: Analyzing reset password page');

    // Try to access reset password page with test token
    await page.goto(`${PRODUCTION_URL}/reset-password?token=diagnostic-test-token`);
    await capturePageDetails(page, 'reset-password-page');

    const pageUrl = page.url();
    console.log(`📄 Reset page URL: ${pageUrl}`);

    // Check if the page exists or redirects
    if (pageUrl.includes('/reset-password')) {
      console.log('✅ Reset password page exists');
      await logFormStructure(page);

      // Look for password reset form elements
      const passwordInputs = await page.locator('input[type="password"]').count();
      console.log(`🔐 Password inputs found: ${passwordInputs}`);

      if (passwordInputs >= 2) {
        console.log('✅ Password confirmation form detected');
      } else if (passwordInputs === 1) {
        console.log('⚠️ Only one password input found - confirmation may be missing');
      } else {
        console.log('❌ No password inputs found on reset page');
      }
    } else {
      console.log('⚠️ ISSUE: Reset password page does not exist or redirects');
      console.log('🔧 RECOMMENDATION: Implement /reset-password route');
    }
  });

  test('API endpoint validation', async ({ page }) => {
    console.log('🔧 DIAGNOSTIC: Testing API endpoints');

    // Test forgot password API
    try {
      const forgotResponse = await page.request.post(
        `${API_BASE_URL}/api/auth/request-password-reset`,
        {
          data: { email: 'diagnostic-test@example.com' },
          headers: { 'Content-Type': 'application/json' },
        }
      );

      console.log(`🌐 Forgot password API status: ${forgotResponse.status()}`);

      if (forgotResponse.status() === 200) {
        console.log('✅ Forgot password API is functional');
      } else if (forgotResponse.status() === 404) {
        console.log('❌ ISSUE: Forgot password API endpoint does not exist');
        console.log('🔧 RECOMMENDATION: Implement /api/auth/request-password-reset');
      } else {
        console.log(`⚠️ Forgot password API returned: ${forgotResponse.status()}`);
      }

      const responseText = await forgotResponse.text();
      console.log(`📄 API Response: ${responseText.substring(0, 200)}...`);
    } catch (error) {
      console.log(`❌ API test failed: ${error}`);
    }

    // Test reset password API
    try {
      const resetResponse = await page.request.post(`${API_BASE_URL}/api/auth/reset-password`, {
        data: {
          token: 'diagnostic-test-token',
          password: 'TestPassword123!',
          confirmPassword: 'TestPassword123!',
        },
        headers: { 'Content-Type': 'application/json' },
      });

      console.log(`🌐 Reset password API status: ${resetResponse.status()}`);

      if (resetResponse.status() === 200) {
        console.log('✅ Reset password API is functional');
      } else if (resetResponse.status() === 404) {
        console.log('❌ ISSUE: Reset password API endpoint does not exist');
        console.log('🔧 RECOMMENDATION: Implement /api/auth/reset-password');
      } else {
        console.log(`⚠️ Reset password API returned: ${resetResponse.status()}`);
      }
    } catch (error) {
      console.log(`❌ Reset API test failed: ${error}`);
    }
  });
});

/**
 * PHASE 2: Authentication System Analysis
 */
test.describe('Password Reset Diagnostic - Authentication Analysis', () => {
  test('Analyze current authentication system', async ({ page }) => {
    console.log('🔧 DIAGNOSTIC: Analyzing authentication system');

    // Check homepage for auth elements
    await page.goto(PRODUCTION_URL);
    await capturePageDetails(page, 'homepage-auth');

    // Look for login/signup buttons
    const loginButtons = page.locator(
      'button:has-text("Login"), a:has-text("Login"), [data-testid*="login"]'
    );
    const signupButtons = page.locator(
      'button:has-text("Sign"), a:has-text("Sign"), [data-testid*="signup"]'
    );

    const loginCount = await loginButtons.count();
    const signupCount = await signupButtons.count();

    console.log(`🔍 Login buttons found: ${loginCount}`);
    console.log(`🔍 Signup buttons found: ${signupCount}`);

    if (loginCount > 0) {
      console.log('✅ Login functionality available');

      // Try to click login and see what happens
      try {
        await loginButtons.first().click();
        await page.waitForTimeout(2000);

        const newUrl = page.url();
        console.log(`📄 After login click: ${newUrl}`);

        // Check if modal appeared or redirected to login page
        const modalExists = await page.locator('.modal, .dialog, [role="dialog"]').isVisible();
        if (modalExists) {
          console.log('✅ Login modal detected');
          await logFormStructure(page);
        } else if (newUrl.includes('/login')) {
          console.log('✅ Redirected to login page');
          await logFormStructure(page);
        } else {
          console.log('⚠️ Login click did not open modal or redirect');
        }
      } catch (error) {
        console.log(`⚠️ Error testing login: ${error}`);
      }
    }
  });

  test('Test authentication flow elements', async ({ page }) => {
    console.log('🔧 DIAGNOSTIC: Testing authentication flow');

    // Try different auth-related URLs
    const authUrls = [
      '/login',
      '/signup',
      '/auth/login',
      '/auth/signup',
      '/forgot-password',
      '/reset-password',
    ];

    for (const url of authUrls) {
      try {
        console.log(`🔍 Testing URL: ${PRODUCTION_URL}${url}`);

        const response = await page.request.get(`${PRODUCTION_URL}${url}`);
        const status = response.status();

        if (status === 200) {
          console.log(`✅ ${url} - Page exists (200)`);

          // Visit page to analyze structure
          await page.goto(`${PRODUCTION_URL}${url}`);
          await page.waitForTimeout(1000);

          const hasForm = (await page.locator('form').count()) > 0;
          const hasInputs = (await page.locator('input').count()) > 0;

          console.log(`  📋 Has form: ${hasForm}, Has inputs: ${hasInputs}`);
        } else if (status === 404) {
          console.log(`❌ ${url} - Page not found (404)`);
        } else {
          console.log(`⚠️ ${url} - Status: ${status}`);
        }
      } catch (error) {
        console.log(`❌ ${url} - Error: ${error}`);
      }
    }
  });
});

/**
 * PHASE 3: Security Feature Testing
 */
test.describe('Password Reset Diagnostic - Security Analysis', () => {
  test('Test password reset security measures', async ({ page }) => {
    console.log('🔧 DIAGNOSTIC: Testing security features');

    // Test 1: Invalid token handling
    console.log('🔒 Testing invalid token handling...');

    const invalidTokens = ['invalid-123', 'malformed', ''];

    for (const token of invalidTokens) {
      await page.goto(`${PRODUCTION_URL}/reset-password?token=${token}`);

      const url = page.url();
      const title = await page.title();

      console.log(`  Token "${token}": URL=${url}, Title=${title}`);

      // Check if properly handled
      const hasError = await page.locator('text=/invalid|expired|error/i').isVisible();
      const redirected = !url.includes('/reset-password');

      if (hasError || redirected) {
        console.log(`    ✅ Properly handled`);
      } else {
        console.log(`    ⚠️ May not be properly secured`);
      }
    }

    await capturePageDetails(page, 'security-validation');
  });

  test('Email service validation', async ({ page }) => {
    console.log('🔧 DIAGNOSTIC: Testing email service connectivity');

    // Test if email sending API is configured
    try {
      const testResponse = await page.request.post(
        `${API_BASE_URL}/api/auth/request-password-reset`,
        {
          data: { email: 'diagnostic-test@example.com' },
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const status = testResponse.status();
      const responseText = await testResponse.text();

      console.log(`📧 Email API Status: ${status}`);
      console.log(`📧 Email API Response: ${responseText.substring(0, 300)}`);

      if (status === 200) {
        console.log('✅ Email service appears to be configured');

        // Check if response indicates email was sent
        if (
          responseText.toLowerCase().includes('sent') ||
          responseText.toLowerCase().includes('email') ||
          responseText.toLowerCase().includes('check')
        ) {
          console.log('✅ Email sending appears functional');
        } else {
          console.log('⚠️ Email sending response unclear');
        }
      } else {
        console.log(`❌ Email service issue - Status: ${status}`);
      }
    } catch (error) {
      console.log(`❌ Email service test failed: ${error}`);
    }
  });
});

/**
 * PHASE 4: Final Diagnostic Summary
 */
test.describe('Password Reset Diagnostic - Summary Report', () => {
  test('Generate comprehensive diagnostic report', async ({ page }) => {
    console.log('📊 GENERATING COMPREHENSIVE DIAGNOSTIC REPORT');
    console.log('='.repeat(60));

    const diagnosticResults = {
      timestamp: new Date().toISOString(),
      productionUrl: PRODUCTION_URL,
      apiUrl: API_BASE_URL,
      findings: {
        siteStructure: {
          forgotPasswordPage: 'To be determined',
          resetPasswordPage: 'To be determined',
          authenticationSystem: 'To be determined',
        },
        apiEndpoints: {
          forgotPasswordApi: 'To be determined',
          resetPasswordApi: 'To be determined',
          healthCheck: 'To be determined',
        },
        security: {
          invalidTokenHandling: 'To be determined',
          passwordValidation: 'To be determined',
          rateLimiting: 'To be determined',
        },
        emailIntegration: {
          serviceConfigured: 'To be determined',
          deliveryTesting: 'Manual verification required',
        },
      },
      recommendations: [
        'Review diagnostic screenshots for visual validation',
        'Verify API endpoints are properly implemented',
        'Test email delivery manually with real email address',
        'Confirm security measures are in place',
        'Validate user experience flow',
      ],
      nextSteps: [
        'Fix any identified structural issues',
        'Implement missing API endpoints',
        'Test email delivery in production',
        'Validate security measures',
        'Run comprehensive end-to-end tests',
      ],
    };

    console.log(JSON.stringify(diagnosticResults, null, 2));
    console.log('='.repeat(60));

    // Create summary page
    await page.goto(
      'data:text/html,<h1>Password Reset Diagnostic Complete</h1><p>Check console for detailed findings</p>'
    );
    await capturePageDetails(page, 'diagnostic-summary');

    console.log('✅ Diagnostic analysis completed');
  });
});
