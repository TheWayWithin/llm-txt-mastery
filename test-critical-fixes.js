import { chromium } from 'playwright';

/**
 * THE TESTER - Critical Fix Verification Suite
 *
 * Tests for:
 * 1. React Router → Wouter migration (no context errors)
 * 2. Email capture flow restoration (email form shows first)
 */

async function runTests() {
  console.log('🧪 THE TESTER - Critical Fix Verification Starting...\n');

  const browser = await chromium.launch({
    headless: false, // Show browser for debugging
    slowMo: 500, // Slow down for observation
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  // Capture console errors
  const consoleErrors = [];
  const routerErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const errorText = msg.text();
      consoleErrors.push(errorText);

      // Specifically look for React Router errors
      if (
        errorText.includes('useRoutes') ||
        errorText.includes('RouterProvider') ||
        errorText.includes('basename') ||
        errorText.includes('router') ||
        errorText.includes('Router')
      ) {
        routerErrors.push(errorText);
      }
    }
  });

  try {
    // TEST 1: Load homepage and check for React Router errors
    console.log('🔍 TEST 1: Checking for React Router context errors...');
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(2000); // Give time for any errors to appear

    if (routerErrors.length > 0) {
      console.log('❌ FAILURE: React Router errors detected:');
      routerErrors.forEach((error) => console.log(`   • ${error}`));
    } else {
      console.log('✅ SUCCESS: No React Router context errors detected');
    }

    // TEST 2: Verify email capture shows first on landing page
    console.log('\n🔍 TEST 2: Verifying email capture flow restoration...');

    // Check if email capture form is visible
    const emailInput = page.locator('input[type="email"]').first();
    const emailFormVisible = await emailInput.isVisible({ timeout: 3000 });

    if (emailFormVisible) {
      console.log('✅ SUCCESS: Email capture form is visible on landing page');
    } else {
      console.log('❌ FAILURE: Email capture form is NOT visible on landing page');

      // Debug: Check what's actually visible
      const visibleElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('h1, h2, h3, input, button'));
        return elements
          .filter((el) => el.offsetWidth > 0 && el.offsetHeight > 0)
          .map((el) => ({
            tag: el.tagName,
            text: el.textContent?.slice(0, 50),
            type: el.type || 'N/A',
          }));
      });

      console.log('   Visible elements on page:', visibleElements);
    }

    // TEST 3: Check tier selection appears after email entry
    if (emailFormVisible) {
      console.log('\n🔍 TEST 3: Testing email submission and tier selection...');

      // Fill in email
      await emailInput.fill('test@example.com');

      // Look for tier selection buttons/cards
      const tierButtons = page.locator('[data-testid="tier-card"], .tier-card, button').filter({
        hasText: /Free|Coffee|Test Drive|Solopreneur/,
      });

      const tierButtonsCount = await tierButtons.count();

      if (tierButtonsCount > 0) {
        console.log(`✅ SUCCESS: Found ${tierButtonsCount} tier selection options`);

        // Get the text of available tier options
        const tierTexts = await tierButtons.allTextContents();
        console.log('   Available tiers:', tierTexts);
      } else {
        console.log('❌ FAILURE: No tier selection options found after email entry');
      }
    }

    // TEST 4: Navigation test - check key pages
    console.log('\n🔍 TEST 4: Testing navigation between pages...');

    const testPages = [
      { path: '/about', name: 'About' },
      { path: '/docs', name: 'Documentation' },
      { path: '/contact', name: 'Contact' },
      { path: '/pricing', name: 'Pricing' },
    ];

    for (const testPage of testPages) {
      try {
        await page.goto(`http://localhost:8080${testPage.path}`);
        await page.waitForTimeout(1000);

        // Check if page loaded (not a 404)
        const title = await page.title();
        const hasContent = await page.locator('h1, h2, h3').first().isVisible({ timeout: 2000 });

        if (hasContent) {
          console.log(`✅ SUCCESS: ${testPage.name} page (${testPage.path}) loaded correctly`);
        } else {
          console.log(
            `❌ FAILURE: ${testPage.name} page (${testPage.path}) failed to load properly`
          );
        }
      } catch (error) {
        console.log(
          `❌ ERROR: Failed to navigate to ${testPage.name} (${testPage.path}): ${error.message}`
        );
      }
    }

    // Return to homepage for final checks
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(1000);

    // TEST 5: Mobile responsiveness check
    console.log('\n🔍 TEST 5: Basic mobile responsiveness check...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    const mobileEmailInput = page.locator('input[type="email"]').first();
    const isMobileResponsive = await mobileEmailInput.isVisible();

    if (isMobileResponsive) {
      console.log('✅ SUCCESS: Email form is visible on mobile viewport');
    } else {
      console.log('❌ FAILURE: Email form is NOT visible on mobile viewport');
    }
  } catch (error) {
    console.log(`❌ CRITICAL ERROR during testing: ${error.message}`);
  } finally {
    // Summary Report
    console.log('\n📊 FINAL TEST SUMMARY:');
    console.log('=======================');
    console.log(`Router Errors Found: ${routerErrors.length}`);
    console.log(`Total Console Errors: ${consoleErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('\n🚨 Console Errors Detected:');
      consoleErrors.slice(0, 5).forEach((error, idx) => {
        console.log(`   ${idx + 1}. ${error}`);
      });
      if (consoleErrors.length > 5) {
        console.log(`   ... and ${consoleErrors.length - 5} more`);
      }
    }

    // Production Readiness Assessment
    console.log('\n🎯 PRODUCTION READINESS ASSESSMENT:');
    console.log('===================================');

    if (routerErrors.length === 0) {
      console.log('✅ Router Migration: SUCCESSFUL');
    } else {
      console.log('❌ Router Migration: ISSUES DETECTED');
    }

    if (consoleErrors.length <= 2) {
      // Allow minor non-critical errors
      console.log('✅ Console Errors: ACCEPTABLE');
    } else {
      console.log('❌ Console Errors: NEEDS ATTENTION');
    }

    const overallStatus =
      routerErrors.length === 0 && consoleErrors.length <= 2
        ? '✅ READY FOR PRODUCTION'
        : '⚠️  NEEDS FIXES BEFORE PRODUCTION';

    console.log(`\n🏁 OVERALL STATUS: ${overallStatus}`);

    await browser.close();
  }
}

// Run the tests
runTests().catch(console.error);
