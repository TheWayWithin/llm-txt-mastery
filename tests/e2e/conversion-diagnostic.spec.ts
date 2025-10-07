import { test, expect } from '@playwright/test';

/**
 * DIAGNOSTIC TEST: Understanding Current Implementation
 * This test helps us understand what's actually happening on the page
 * so we can identify specific issues with the conversion optimization.
 */

test.describe('Conversion Diagnostic Tests', () => {
  test('should inspect homepage structure and tier selection', async ({ page }) => {
    console.log('🔍 DIAGNOSTIC: Starting homepage inspection...');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take a screenshot for visual reference
    await page.screenshot({ path: 'diagnostic-homepage.png', fullPage: true });

    // Log page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Check if email capture component is visible
    const emailCaptureVisible = await page.locator('text=Choose Your Analysis Type').isVisible();
    console.log(`📧 Email capture visible: ${emailCaptureVisible}`);

    if (!emailCaptureVisible) {
      // Look for URL input instead (which means user might be authenticated)
      const urlInputVisible = await page.locator('input[placeholder*="example.com"]').isVisible();
      console.log(`🌐 URL input visible: ${urlInputVisible}`);

      if (urlInputVisible) {
        console.log(
          'ℹ️  User appears to be authenticated - seeing URL input instead of email capture'
        );
        return;
      }
    }

    // If we have email capture, inspect tier selection
    if (emailCaptureVisible) {
      console.log('📋 Inspecting tier selection options...');

      // Check all radio inputs
      const radioInputs = await page.locator('input[type="radio"]').all();
      console.log(`🔘 Found ${radioInputs.length} radio inputs`);

      for (let i = 0; i < radioInputs.length; i++) {
        const radio = radioInputs[i];
        const value = await radio.getAttribute('value');
        const checked = await radio.isChecked();
        console.log(`  - Radio ${i}: value="${value}", checked=${checked}`);
      }

      // Check for Coffee tier specific elements
      const coffeeElements = await page.locator('text=coffee').all();
      console.log(`☕ Found ${coffeeElements.length} elements containing "coffee"`);

      // Check for "MOST POPULAR" badge
      const mostPopular = await page.locator('text=MOST POPULAR').isVisible();
      console.log(`⭐ "MOST POPULAR" badge visible: ${mostPopular}`);

      // Check for orange styling
      const orangeBorder = await page.locator('.border-orange-400').isVisible();
      console.log(`🧡 Orange border styling visible: ${orangeBorder}`);

      // Check for Solopreneur Special text
      const solopreneurSpecial = await page.locator('text=Solopreneur Special').isVisible();
      console.log(`💼 "Solopreneur Special" text visible: ${solopreneurSpecial}`);
    }

    // Check navigation elements
    const signUpButton = await page.locator('text=Sign Up').isVisible();
    const signInButton = await page.locator('text=Sign In').isVisible();
    console.log(`🔑 Sign Up button visible: ${signUpButton}`);
    console.log(`🔑 Sign In button visible: ${signInButton}`);

    console.log('✅ DIAGNOSTIC: Homepage inspection complete');
  });

  test('should test tier selection interaction', async ({ page }) => {
    console.log('🔍 DIAGNOSTIC: Testing tier selection interaction...');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for email capture section
    const emailCaptureSection = page.locator('text=Choose Your Analysis Type');
    const isVisible = await emailCaptureSection.isVisible();

    if (!isVisible) {
      console.log('⚠️  Email capture not visible - user might be authenticated');
      return;
    }

    // Scroll to tier selection
    await emailCaptureSection.scrollIntoViewIfNeeded();

    // Try to find tier radio buttons by different selectors
    const selectors = [
      'input[value="coffee"]',
      'input[value="starter"]',
      'input[value="growth"]',
      'input[value="scale"]',
      '[data-tier="coffee"]',
      '.tier-coffee',
      'input[type="radio"][value="coffee"]',
    ];

    for (const selector of selectors) {
      const element = page.locator(selector);
      const exists = (await element.count()) > 0;
      console.log(`🎯 Selector "${selector}" found: ${exists}`);

      if (exists) {
        const isVisible = await element.isVisible();
        const isChecked = await element.isChecked();
        console.log(`  - Visible: ${isVisible}, Checked: ${isChecked}`);
      }
    }

    // Check what radio group structure exists
    const radioGroups = await page
      .locator('[role="radiogroup"], .radio-group, [data-testid*="radio"]')
      .all();
    console.log(`📻 Found ${radioGroups.length} radio group containers`);

    console.log('✅ DIAGNOSTIC: Tier selection interaction test complete');
  });

  test('should test navigation to signup/login', async ({ page }) => {
    console.log('🔍 DIAGNOSTIC: Testing navigation to auth pages...');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for Sign Up button
    const signUpButtons = await page.locator('text=Sign Up').all();
    console.log(`📝 Found ${signUpButtons.length} "Sign Up" elements`);

    if (signUpButtons.length > 0) {
      console.log('🔄 Attempting to click Sign Up...');
      await signUpButtons[0].click();

      // Wait for navigation
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      console.log(`📍 Current URL: ${currentUrl}`);

      // Check if we're on signup page
      const isSignupPage = currentUrl.includes('/signup');
      console.log(`📋 On signup page: ${isSignupPage}`);

      if (isSignupPage) {
        // Check for tier parameter
        const hasTierParam = currentUrl.includes('tier=');
        console.log(`🎯 Has tier parameter: ${hasTierParam}`);

        if (hasTierParam) {
          const tierMatch = currentUrl.match(/tier=([^&]+)/);
          const tierValue = tierMatch ? tierMatch[1] : 'unknown';
          console.log(`☕ Tier value: ${tierValue}`);
        }
      }
    }

    console.log('✅ DIAGNOSTIC: Navigation test complete');
  });
});
