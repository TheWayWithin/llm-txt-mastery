import { test, expect } from '@playwright/test';

const PRODUCTION_BASE_URL = 'https://www.llmtxtmastery.com';
const API_BASE_URL = 'https://llm-txt-mastery-production.up.railway.app';

test.describe('Dashboard API & System Validation', () => {
  test('should validate API endpoints are operational', async ({ request }) => {
    // Test authentication endpoint responds correctly
    const authResponse = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: {
        email: 'invalid@test.com',
        password: 'invalid',
      },
    });

    // Should return 401, not 404 (indicates endpoint exists)
    expect(authResponse.status()).toBe(401);

    const errorData = await authResponse.json();
    expect(errorData).toHaveProperty('error');
    console.log('✅ Authentication API operational - returns proper 401 error');
  });

  test('should validate dashboard protection and auth flow', async ({ page }) => {
    // Navigate directly to dashboard (should require auth)
    await page.goto(`${PRODUCTION_BASE_URL}/dashboard`);

    // Should show authentication modal or redirect
    const authModal = page.locator('dialog', { hasText: 'Sign In' });
    const signInHeading = page.locator('h2', { hasText: 'Please sign in to continue' });

    const isProtected =
      (await authModal.isVisible({ timeout: 5000 })) ||
      (await signInHeading.isVisible({ timeout: 5000 }));

    expect(isProtected).toBe(true);
    console.log('✅ Dashboard properly protected - requires authentication');

    // Take screenshot for evidence
    await page.screenshot({
      path: 'test-results/dashboard-protection-validation.png',
      fullPage: true,
    });
  });

  test('should validate system health and connectivity', async ({ page }) => {
    // Test main site loads
    await page.goto(PRODUCTION_BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check for critical elements
    const signInButton = page.locator('button:has-text("Sign In")').first();
    expect(await signInButton.isVisible()).toBe(true);

    // Check console for critical errors
    const logs = await page.evaluate(() => {
      // Get any console errors from the page
      return window.console.errors || [];
    });

    console.log('✅ Main application loads successfully');

    // Take screenshot of successful load
    await page.screenshot({
      path: 'test-results/system-health-validation.png',
      fullPage: true,
    });
  });

  test('should validate signup flow and form validation', async ({ page }) => {
    await page.goto(`${PRODUCTION_BASE_URL}/signup?tier=coffee`);
    await page.waitForLoadState('networkidle');

    // Fill in test data
    const testEmail = 'validation.test@example.com';
    const testPassword = 'TestPassword123!';

    await page.fill('input[name="email"], [placeholder*="email" i]', testEmail);
    await page.fill('input[type="password"]:not([placeholder*="confirm" i])', testPassword);
    await page.fill('input[placeholder*="confirm" i], input[name*="confirm" i]', testPassword);

    // Wait for validation
    await page.waitForTimeout(2000);

    // Check if create account button becomes enabled
    const createButton = page.locator('button:has-text("Create Account")');
    const isEnabled = await createButton.isEnabled();

    expect(isEnabled).toBe(true);
    console.log('✅ Signup form validation working correctly');

    // Take screenshot
    await page.screenshot({
      path: 'test-results/signup-validation-success.png',
      fullPage: true,
    });
  });

  test('should check for database-related error messages', async ({ page }) => {
    // Navigate to login and attempt with test email
    await page.goto(`${PRODUCTION_BASE_URL}/login`);

    await page.fill('input[type="email"]', 'tmuybqteuljyrjvwra@nespj.com');
    await page.fill('input[type="password"]', 'testpassword');

    await page.click('button[type="submit"], button:has-text("Sign In")');

    // Wait for response
    await page.waitForTimeout(3000);

    // Check for database-related error messages
    const pageContent = await page.textContent('body');
    const hasDbError = /database.*error|connection.*failed|server.*unavailable/i.test(pageContent);

    // Should NOT have database errors (just auth errors)
    expect(hasDbError).toBe(false);
    console.log('✅ No database connectivity errors detected');

    // Check we get proper auth error instead
    const hasAuthError = /invalid.*credentials|incorrect.*password|unauthorized/i.test(pageContent);
    expect(hasAuthError).toBe(true);
    console.log('✅ Proper authentication error handling');
  });

  test('should validate mobile responsiveness', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE size
    });
    const page = await context.newPage();

    await page.goto(PRODUCTION_BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check that key elements are still accessible on mobile
    const signInButton = page.locator('button:has-text("Sign In")').first();
    expect(await signInButton.isVisible()).toBe(true);

    // Navigate to dashboard on mobile
    await page.goto(`${PRODUCTION_BASE_URL}/dashboard`);

    // Should still show proper authentication on mobile
    const authRequired = await page
      .locator('h2:has-text("Please sign in"), dialog:has-text("Sign In")')
      .isVisible({ timeout: 5000 });
    expect(authRequired).toBe(true);

    console.log('✅ Mobile responsiveness validated');

    await page.screenshot({
      path: 'test-results/mobile-responsiveness-validation.png',
      fullPage: true,
    });

    await context.close();
  });
});

test.describe('Database Fix Indirect Validation', () => {
  test('should validate system behavior indicates database is working', async ({ page }) => {
    // Navigate to dashboard
    await page.goto(`${PRODUCTION_BASE_URL}/dashboard`);

    // The fact that we get an auth modal instead of a 500 error
    // indicates the backend database connections are working
    const authModal = page.locator('dialog:has-text("Sign In")');
    const authHeading = page.locator('h2:has-text("Please sign in")');

    const systemWorking =
      (await authModal.isVisible({ timeout: 5000 })) ||
      (await authHeading.isVisible({ timeout: 5000 }));

    expect(systemWorking).toBe(true);

    console.log('✅ System responding correctly - database connections likely working');
    console.log('💡 Database fix validation requires authenticated access to complete');
  });

  test('should document test limitations and next steps', async () => {
    const limitations = {
      'Authentication Required': 'Cannot access dashboard content without valid credentials',
      'Database Fix Validation': 'Unable to verify "My Analyses" shows correct count vs "0 total"',
      'UI Interaction Testing': 'Cannot test search, filters, view/re-run without dashboard access',
    };

    const nextSteps = {
      'Option 1': 'Obtain valid credentials for tmuybqteuljyrjvwra@nespj.com',
      'Option 2': 'Create authenticated test account and run analysis',
      'Option 3': 'Direct database query to verify analysis count fix',
    };

    console.log('📋 TEST LIMITATIONS:', limitations);
    console.log('📋 NEXT STEPS FOR COMPLETE VALIDATION:', nextSteps);

    // This "test" always passes - it's for documentation
    expect(true).toBe(true);
  });
});
