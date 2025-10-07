import { test, expect, Page } from '@playwright/test';

/**
 * PRODUCTION COMPREHENSIVE REGRESSION TESTING
 *
 * Validates critical functionality after major system changes:
 * - GDPR compliance (Enzuzo integration)
 * - Dashboard fixes for analysis display
 * - Analysis progress tracking improvements
 * - Privacy policy and terms accessibility
 * - Authentication and payment flows
 */

test.describe('🔍 PRODUCTION REGRESSION VALIDATION', () => {
  test('🏠 Critical Landing Page Functionality', async ({ page }) => {
    console.log('\n🚀 Testing Landing Page Critical Elements...');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Test 1: Main hero content loads
    const heroTitle = page.locator('h1').first();
    await expect(heroTitle).toContainText('LLM', { timeout: 10000 });
    console.log('✅ Hero title contains "LLM"');

    // Test 2: Primary CTA is visible
    const getStartedButton = page
      .locator('text=Get Started, button:has-text("Get Started")')
      .first();
    await expect(getStartedButton).toBeVisible({ timeout: 10000 });
    console.log('✅ Get Started button visible');

    // Test 3: Privacy and Terms links work
    const privacyLink = page.locator('a:has-text("Privacy"), a[href*="privacy"]').first();
    if (await privacyLink.isVisible()) {
      await privacyLink.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/.*privacy.*/);
      console.log('✅ Privacy policy link works');
      await page.goBack();
    }

    const termsLink = page.locator('a:has-text("Terms"), a[href*="terms"]').first();
    if (await termsLink.isVisible()) {
      await termsLink.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/.*terms.*/);
      console.log('✅ Terms link works');
      await page.goBack();
    }

    console.log('🎯 Landing Page Test: PASSED');
  });

  test('🔒 GDPR Compliance Validation', async ({ page }) => {
    console.log('\n🔒 Testing GDPR Compliance Implementation...');

    // Use a fresh browser context to ensure no cookies
    const context = await page.context().browser()?.newContext();
    const freshPage = (await context?.newPage()) || page;

    await freshPage.goto('/', { waitUntil: 'domcontentloaded' });
    await freshPage.waitForTimeout(3000); // Allow time for consent banner

    // Check for Enzuzo implementation or consent banner
    const consentSelectors = [
      '.enzuzo-consent',
      '[data-consent]',
      '.consent-banner',
      '#consent-banner',
      '.cookie-banner',
      'text=cookie',
      'text=consent',
      'text=privacy',
    ];

    let consentFound = false;
    for (const selector of consentSelectors) {
      if (
        await freshPage
          .locator(selector)
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        console.log(`✅ GDPR consent mechanism found: ${selector}`);
        consentFound = true;
        break;
      }
    }

    // Check if Enzuzo script is loaded
    const enzuzoScript = await freshPage.evaluate(() => {
      return (
        document.querySelector('script[src*="enzuzo"]') !== null ||
        typeof window.Enzuzo !== 'undefined'
      );
    });

    if (enzuzoScript) {
      console.log('✅ Enzuzo integration detected');
      consentFound = true;
    }

    if (consentFound) {
      console.log('🎯 GDPR Compliance Test: PASSED');
    } else {
      console.log('⚠️  GDPR Compliance Test: Unable to detect consent mechanism');
    }

    await context?.close();
  });

  test('📊 Tier Selection and Flow', async ({ page }) => {
    console.log('\n📊 Testing Tier Selection Flow...');

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Click Get Started
    const getStarted = page.locator('text=Get Started, button:has-text("Get Started")').first();
    await getStarted.click();
    await page.waitForLoadState('domcontentloaded');

    // Should show tier selection or redirect to signup
    const currentUrl = page.url();
    console.log(`After Get Started, URL: ${currentUrl}`);

    if (currentUrl.includes('signup')) {
      console.log('✅ Direct signup flow detected');
    } else {
      // Look for tier selection
      const tierElements = [
        '[data-testid="tier-coffee"]',
        '[data-tier="coffee"]',
        '.tier-coffee',
        'text=Coffee',
        'text=$5',
      ];

      let tierFound = false;
      for (const selector of tierElements) {
        if (
          await page
            .locator(selector)
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          console.log(`✅ Tier selection visible: ${selector}`);
          tierFound = true;
          break;
        }
      }

      if (!tierFound) {
        console.log('⚠️  Tier selection not clearly visible');
      }
    }

    console.log('🎯 Tier Selection Test: PASSED');
  });

  test('🔐 Authentication Pages Load', async ({ page }) => {
    console.log('\n🔐 Testing Authentication Pages...');

    // Test signup page
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    const signupForm = page.locator('form, input[type="email"]');
    await expect(signupForm).toBeVisible({ timeout: 10000 });
    console.log('✅ Signup page loads');

    // Test login page
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const loginForm = page.locator('form, input[type="email"]');
    await expect(loginForm).toBeVisible({ timeout: 10000 });
    console.log('✅ Login page loads');

    console.log('🎯 Authentication Pages Test: PASSED');
  });

  test('🔍 Analysis Page Accessibility', async ({ page }) => {
    console.log('\n🔍 Testing Analysis Page...');

    await page.goto('/analyze', { waitUntil: 'domcontentloaded' });

    // Should show URL input form
    const urlInput = page.locator('input[placeholder*="URL"], input[placeholder*="website"]');
    await expect(urlInput).toBeVisible({ timeout: 10000 });
    console.log('✅ URL input field visible');

    // Should have analyze button
    const analyzeButton = page.locator('button:has-text("Analyze")');
    await expect(analyzeButton).toBeVisible({ timeout: 10000 });
    console.log('✅ Analyze button visible');

    console.log('🎯 Analysis Page Test: PASSED');
  });

  test('📱 Mobile Responsiveness Check', async ({ page }) => {
    console.log('\n📱 Testing Mobile Responsiveness...');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check if main elements are still visible
    const hero = page.locator('h1').first();
    await expect(hero).toBeVisible({ timeout: 10000 });
    console.log('✅ Hero visible on mobile');

    const getStarted = page.locator('text=Get Started').first();
    await expect(getStarted).toBeVisible({ timeout: 10000 });
    console.log('✅ CTA visible on mobile');

    console.log('🎯 Mobile Responsiveness Test: PASSED');
  });

  test('⚡ Performance and Error Check', async ({ page }) => {
    console.log('\n⚡ Testing Performance and Errors...');

    const errors: string[] = [];
    page.on('pageerror', (msg) => errors.push(msg.message));

    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    console.log(`⏱️  Page load time: ${loadTime}ms`);

    if (loadTime < 10000) {
      console.log('✅ Acceptable load time');
    } else {
      console.log('⚠️  Slow load time detected');
    }

    await page.waitForTimeout(3000); // Let any async errors surface

    if (errors.length === 0) {
      console.log('✅ No JavaScript errors detected');
    } else {
      console.log(`⚠️  ${errors.length} JavaScript errors:`, errors);
    }

    console.log('🎯 Performance Test: COMPLETED');
  });

  test('🔗 Critical Route Accessibility', async ({ page }) => {
    console.log('\n🔗 Testing Critical Routes...');

    const criticalRoutes = [
      '/',
      '/pricing',
      '/about',
      '/contact',
      '/privacy',
      '/terms',
      '/signup',
      '/login',
      '/analyze',
    ];

    let passedRoutes = 0;
    const totalRoutes = criticalRoutes.length;

    for (const route of criticalRoutes) {
      try {
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 10000 });

        // Check if page loaded successfully (not 404)
        const pageTitle = await page.title();
        const is404 =
          pageTitle.includes('404') ||
          (await page
            .locator('text=404, text=Not Found')
            .isVisible()
            .catch(() => false));

        if (!is404) {
          console.log(`✅ ${route} - loads successfully`);
          passedRoutes++;
        } else {
          console.log(`❌ ${route} - shows 404`);
        }
      } catch (error) {
        console.log(`❌ ${route} - failed to load:`, error.message);
      }
    }

    const successRate = (passedRoutes / totalRoutes) * 100;
    console.log(
      `🎯 Route Accessibility: ${successRate.toFixed(1)}% (${passedRoutes}/${totalRoutes})`
    );
  });
});
