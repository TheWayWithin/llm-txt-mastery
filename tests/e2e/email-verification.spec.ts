import { test, expect } from '@playwright/test';

test.describe('Email Verification System', () => {
  const testEmail = `test-verify-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test('should show email verification banner after registration', async ({ page }) => {
    // Start at home page (use baseURL from config or localhost)
    const url = process.env.CI ? 'https://www.llmtxtmastery.com' : 'http://localhost:8080';
    await page.goto(url);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Click on user icon to open auth
    await page.click('[aria-label="User account"]');

    // Wait for auth modal
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Click on Sign Up link
    await page.click('text=Sign up');

    // Fill registration form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.fill('input[placeholder*="Confirm"]', testPassword);

    // Submit registration
    await page.click('button:has-text("Sign up")');

    // Wait for registration to complete
    await page.waitForTimeout(2000);

    // Check console logs for debug info
    page.on('console', (msg) => {
      if (
        msg.text().includes('User verification check') ||
        msg.text().includes('EmailVerificationBanner rendered')
      ) {
        console.log('Console:', msg.text());
      }
    });

    // Check if we're logged in (should see welcome message)
    const welcomeText = await page
      .locator('text=/Welcome.*' + testEmail.split('@')[0] + '/i')
      .isVisible();
    console.log('Welcome message visible:', welcomeText);

    // Check for email verification banner
    const bannerTexts = [
      'Verify your email',
      'Please verify your email',
      'verify your email address',
      'Email verification',
    ];

    let bannerFound = false;
    for (const text of bannerTexts) {
      const isVisible = await page
        .locator(`text=/${text}/i`)
        .isVisible()
        .catch(() => false);
      if (isVisible) {
        console.log(`Found banner with text: "${text}"`);
        bannerFound = true;
        break;
      }
    }

    if (!bannerFound) {
      // Try to find any alert component
      const alertExists = await page
        .locator('.border-amber-200, .bg-amber-50, [role="alert"]')
        .isVisible()
        .catch(() => false);
      console.log('Alert component exists:', alertExists);

      // Get all text content in the page to debug
      const bodyText = await page.locator('body').textContent();
      console.log('Page contains "verify":', bodyText?.toLowerCase().includes('verify'));
    }

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/email-verification-banner.png', fullPage: true });

    // Assert banner exists
    expect(bannerFound).toBeTruthy();
  });

  test('should check console logs for user object', async ({ page }) => {
    // Enable console log capture
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    // Navigate and register
    const url = process.env.CI ? 'https://www.llmtxtmastery.com' : 'http://localhost:8080';
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    // Open auth modal
    await page.click('[aria-label="User account"]');
    await page.waitForSelector('[role="dialog"]');

    // Register new user
    const email = `debug-${Date.now()}@example.com`;
    await page.click('text=Sign up');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', testPassword);
    await page.fill('input[placeholder*="Confirm"]', testPassword);
    await page.click('button:has-text("Sign up")');

    // Wait for logs
    await page.waitForTimeout(3000);

    // Find and print relevant logs
    const relevantLogs = consoleLogs.filter(
      (log) =>
        log.includes('User verification check') ||
        log.includes('EmailVerificationBanner') ||
        log.includes('emailVerified') ||
        log.includes('User signed up successfully')
    );

    console.log('\n=== Console Logs ===');
    relevantLogs.forEach((log) => console.log(log));

    // Check for specific patterns
    const hasEmailVerifiedLog = relevantLogs.some((log) => log.includes('emailVerified'));
    console.log('\nFound emailVerified in logs:', hasEmailVerifiedLog);

    // Take screenshot
    await page.screenshot({ path: 'test-results/console-debug.png', fullPage: true });
  });

  test('should test with production URL', async ({ page }) => {
    // Test against production
    await page.goto('https://www.llmtxtmastery.com');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Capture console logs
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('User verification check') || text.includes('EmailVerificationBanner')) {
        console.log('Production console:', text);
      }
    });

    // Open auth modal
    await page.click('[aria-label="User account"]');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Register new user
    const prodEmail = `prod-test-${Date.now()}@example.com`;
    await page.click('text=Sign up');
    await page.fill('input[type="email"]', prodEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.fill('input[placeholder*="Confirm"]', testPassword);
    await page.click('button:has-text("Sign up")');

    // Wait for registration
    await page.waitForTimeout(3000);

    // Check for banner
    const bannerVisible = await page
      .locator('text=/verify.*email/i')
      .isVisible()
      .catch(() => false);
    console.log('Production banner visible:', bannerVisible);

    // Take screenshot
    await page.screenshot({ path: 'test-results/production-test.png', fullPage: true });

    // Print console logs
    console.log('\n=== Production Console Logs ===');
    consoleLogs.slice(-20).forEach((log) => console.log(log));
  });
});
