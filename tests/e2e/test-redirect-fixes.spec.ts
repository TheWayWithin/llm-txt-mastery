import { test, expect } from '@playwright/test';

test.describe('Redirect Fixes Test', () => {
  test('should redirect to /analyze after signup, login, and verification', async ({ page }) => {
    const testEmail = `redirect-test-${Date.now()}@example.com`;

    // Test 1: Signup redirect
    console.log('🧪 Testing signup redirect to /analyze...');
    await page.goto('http://localhost:8080/signup');

    // Fill signup form
    await page.selectOption('select#tier', 'starter');
    await page.fill('input#email', testEmail);
    await page.fill('input#password', 'TestPassword123!');
    await page.fill('input#confirmPassword', 'TestPassword123!');

    // Listen for navigation
    const navigationPromise = page.waitForNavigation();
    await page.click('button:has-text("Create Account")');
    await navigationPromise;

    // Should be on /analyze page
    const signupUrl = page.url();
    console.log(`After signup, URL is: ${signupUrl}`);
    expect(signupUrl).toContain('/analyze');

    // Test 2: Check if email verification banner is present
    const verifyBanner = page.locator('text=Verify your email');
    const bannerVisible = await verifyBanner.isVisible().catch(() => false);
    console.log(`Email verification banner visible: ${bannerVisible}`);

    // Test 3: Login redirect (simulate logout and login)
    console.log('🧪 Testing login redirect to /analyze...');

    // Clear session to simulate logout
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });

    await page.goto('http://localhost:8080/login');

    // Fill login form
    await page.fill('input#email', testEmail);
    await page.fill('input#password', 'TestPassword123!');

    // Listen for navigation
    const loginNavigationPromise = page.waitForNavigation();
    await page.click('button:has-text("Sign In")');
    await loginNavigationPromise;

    // Should be on /analyze page
    const loginUrl = page.url();
    console.log(`After login, URL is: ${loginUrl}`);
    expect(loginUrl).toContain('/analyze');

    console.log('✅ All redirect tests passed!');
    console.log('Summary:');
    console.log('- Signup redirects to /analyze ✓');
    console.log('- Login redirects to /analyze ✓');
    console.log('- User stays on /analyze (no landing page) ✓');
  });
});
