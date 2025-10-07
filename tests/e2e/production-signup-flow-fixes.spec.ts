import { test, expect } from '@playwright/test';

test.describe('Production Sign-up Flow Bug Fixes', () => {
  const PRODUCTION_URL = 'https://www.llmtxtmastery.com';

  test.beforeEach(async ({ page }) => {
    // Navigate to production site
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Navigation flow: Sign In → Sign Up should default to Coffee tier', async ({ page }) => {
    // Click "Sign In" from homepage
    await page.click('text=Sign In');
    await page.waitForLoadState('networkidle');

    // Verify we're on sign-in page
    await expect(page).toHaveURL(/.*\/sign-in/);

    // Click "Sign up for free" link on sign-in page
    await page.click('text=Sign up for free');
    await page.waitForLoadState('networkidle');

    // Verify we're on sign-up page
    await expect(page).toHaveURL(/.*\/sign-up/);

    // Take screenshot of sign-up page
    await page.screenshot({
      path: 'signup-page-coffee-default.png',
      fullPage: true,
    });

    // Verify Coffee tier is selected by default
    const coffeeRadio = page.locator('input[value="coffee"]');
    await expect(coffeeRadio).toBeChecked();

    // Verify Coffee tier label is visible
    await expect(page.locator('text=Coffee')).toBeVisible();
  });

  test('Tier information should display immediately on page load', async ({ page }) => {
    // Navigate directly to sign-up page
    await page.goto(`${PRODUCTION_URL}/sign-up`);
    await page.waitForLoadState('networkidle');

    // Verify tier benefits are visible immediately (no user interaction needed)
    await expect(page.locator('text=Coffee Plan Benefits')).toBeVisible();

    // Check for specific benefits with checkmarks
    const benefitSelectors = [
      'text=AI-enhanced content analysis',
      'text=Quality scoring and recommendations',
      'text=Priority processing',
      'text=Email support',
    ];

    for (const selector of benefitSelectors) {
      await expect(page.locator(selector)).toBeVisible();
    }

    // Verify checkmark icons are present
    const checkmarks = page.locator('svg[data-testid="check-icon"], .lucide-check');
    const checkmarkCount = await checkmarks.count();
    expect(checkmarkCount).toBeGreaterThan(0);

    // Take screenshot showing tier benefits display
    await page.screenshot({
      path: 'tier-benefits-display.png',
      fullPage: true,
    });
  });

  test('Tier switching functionality works correctly', async ({ page }) => {
    // Navigate to sign-up page
    await page.goto(`${PRODUCTION_URL}/sign-up`);
    await page.waitForLoadState('networkidle');

    // Verify Coffee is selected by default
    await expect(page.locator('input[value="coffee"]')).toBeChecked();
    await expect(page.locator('text=Coffee Plan Benefits')).toBeVisible();

    // Switch to Free tier
    await page.click('input[value="free"]');
    await page.waitForTimeout(500); // Allow for any animations

    // Verify Free tier is now selected
    await expect(page.locator('input[value="free"]')).toBeChecked();
    await expect(page.locator('text=Free Plan Benefits')).toBeVisible();

    // Take screenshot of Free tier selected
    await page.screenshot({
      path: 'free-tier-selected.png',
      fullPage: true,
    });

    // Switch back to Coffee tier
    await page.click('input[value="coffee"]');
    await page.waitForTimeout(500);

    // Verify Coffee tier is selected again
    await expect(page.locator('input[value="coffee"]')).toBeChecked();
    await expect(page.locator('text=Coffee Plan Benefits')).toBeVisible();

    // Take screenshot of Coffee tier re-selected
    await page.screenshot({
      path: 'coffee-tier-reselected.png',
      fullPage: true,
    });
  });

  test('Coffee tier benefits content validation', async ({ page }) => {
    // Navigate to sign-up page
    await page.goto(`${PRODUCTION_URL}/sign-up`);
    await page.waitForLoadState('networkidle');

    // Ensure Coffee tier is selected
    await page.click('input[value="coffee"]');
    await page.waitForTimeout(500);

    // Verify specific Coffee tier benefits
    const expectedBenefits = [
      'AI-enhanced content analysis',
      'Quality scoring and recommendations',
      'Priority processing',
      'Email support',
      'Download your llms.txt file',
    ];

    for (const benefit of expectedBenefits) {
      await expect(page.locator(`text=${benefit}`)).toBeVisible();
    }

    // Verify Coffee Plan Benefits card is present
    await expect(page.locator('text=Coffee Plan Benefits')).toBeVisible();

    // Take detailed screenshot of benefits section
    const benefitsSection = page
      .locator(
        '[data-testid="tier-benefits"], .tier-benefits, div:has-text("Coffee Plan Benefits")'
      )
      .first();
    await benefitsSection.screenshot({ path: 'coffee-benefits-detail.png' });
  });

  test('Sign-up form interaction with Coffee tier pre-selected', async ({ page }) => {
    // Navigate via Sign In → Sign Up flow
    await page.click('text=Sign In');
    await page.waitForLoadState('networkidle');
    await page.click('text=Sign up for free');
    await page.waitForLoadState('networkidle');

    // Verify Coffee tier is pre-selected
    await expect(page.locator('input[value="coffee"]')).toBeChecked();

    // Fill out the form with Coffee tier selected
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');

    // Take screenshot of completed form
    await page.screenshot({
      path: 'signup-form-completed-coffee.png',
      fullPage: true,
    });

    // Verify the sign-up button is enabled and shows correct text
    const signUpButton = page.locator('button[type="submit"], button:has-text("Sign Up")');
    await expect(signUpButton).toBeEnabled();

    // Don't actually submit to avoid creating test accounts
    console.log('Form validation complete - ready for submission with Coffee tier');
  });
});
