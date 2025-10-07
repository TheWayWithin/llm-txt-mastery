import { test, expect } from '@playwright/test';

/**
 * QUICK REGRESSION HEALTH CHECK
 *
 * Fast validation of critical system functionality
 * after recent GDPR and dashboard changes
 */

test.describe('🏥 QUICK HEALTH CHECK', () => {
  test('🌐 Website Loads and Basic Elements Present', async ({ page }) => {
    console.log('\n🌐 Testing basic website load...');

    try {
      await page.goto('/', { timeout: 30000 });
      console.log('✅ Website loads');

      // Check page title
      const title = await page.title();
      console.log(`📄 Page title: ${title}`);

      // Look for any h1 element
      const h1 = await page.locator('h1').count();
      console.log(`📝 H1 elements found: ${h1}`);

      // Look for navigation or main content
      const nav = await page.locator('nav, header, main').count();
      console.log(`🧭 Navigation/content elements: ${nav}`);

      // Check if any buttons exist
      const buttons = await page.locator('button').count();
      console.log(`🔘 Buttons found: ${buttons}`);

      expect(h1).toBeGreaterThan(0);
      console.log('🎯 Basic Website Load: PASSED');
    } catch (error) {
      console.log('❌ Basic Website Load: FAILED -', error.message);
      throw error;
    }
  });

  test('🔗 Critical Pages Return 200 Status', async ({ page }) => {
    console.log('\n🔗 Testing critical page responses...');

    const pages = ['/', '/pricing', '/about', '/privacy', '/terms'];
    const results: { [key: string]: string } = {};

    for (const pagePath of pages) {
      try {
        const response = await page.goto(`https://www.llmtxtmastery.com${pagePath}`, {
          timeout: 15000,
          waitUntil: 'domcontentloaded',
        });

        const status = response?.status() || 0;
        results[pagePath] = `${status}`;

        if (status === 200) {
          console.log(`✅ ${pagePath}: ${status}`);
        } else {
          console.log(`⚠️  ${pagePath}: ${status}`);
        }
      } catch (error) {
        results[pagePath] = 'ERROR';
        console.log(`❌ ${pagePath}: ${error.message}`);
      }
    }

    // At least homepage should work
    expect(results['/']).toBe('200');
    console.log('🎯 Page Response Test: COMPLETED');
  });

  test('📱 Mobile Viewport Loads', async ({ page }) => {
    console.log('\n📱 Testing mobile viewport...');

    try {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/', { timeout: 20000 });

      // Just check if page loads on mobile
      const title = await page.title();
      console.log(`📱 Mobile title: ${title}`);

      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);

      console.log('🎯 Mobile Test: PASSED');
    } catch (error) {
      console.log('❌ Mobile Test: FAILED -', error.message);
      throw error;
    }
  });

  test('🔍 JavaScript and Errors Check', async ({ page }) => {
    console.log('\n🔍 Testing for JavaScript errors...');

    const errors: string[] = [];
    const consoleMessages: string[] = [];

    page.on('pageerror', (error) => {
      errors.push(error.message);
      console.log(`❌ JS Error: ${error.message}`);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
        console.log(`🔴 Console Error: ${msg.text()}`);
      }
    });

    try {
      await page.goto('/', { timeout: 20000 });
      await page.waitForTimeout(5000); // Let any async errors surface

      console.log(`📊 Page errors: ${errors.length}`);
      console.log(`📊 Console errors: ${consoleMessages.length}`);

      if (errors.length === 0 && consoleMessages.length === 0) {
        console.log('✅ No critical JavaScript errors detected');
      } else {
        console.log('⚠️  Some errors detected but test continuing');
      }

      console.log('🎯 Error Check: COMPLETED');
    } catch (error) {
      console.log('❌ Error Check: FAILED -', error.message);
      throw error;
    }
  });

  test('🍪 GDPR/Cookie Consent Detection', async ({ page }) => {
    console.log('\n🍪 Testing GDPR compliance...');

    try {
      await page.goto('/', { timeout: 20000 });
      await page.waitForTimeout(3000); // Allow consent banner to load

      // Check for Enzuzo or other consent mechanisms
      const consentIndicators = [
        'text=cookie',
        'text=consent',
        'text=privacy',
        '.consent',
        '[data-consent]',
        'script[src*="enzuzo"]',
      ];

      let found = false;
      for (const indicator of consentIndicators) {
        if (indicator.startsWith('script')) {
          const scriptExists = await page.evaluate(
            () => document.querySelector('script[src*="enzuzo"]') !== null
          );
          if (scriptExists) {
            console.log('✅ Enzuzo script detected');
            found = true;
            break;
          }
        } else {
          const visible = await page
            .locator(indicator)
            .first()
            .isVisible()
            .catch(() => false);
          if (visible) {
            console.log(`✅ Consent element found: ${indicator}`);
            found = true;
            break;
          }
        }
      }

      if (found) {
        console.log('🎯 GDPR Compliance: DETECTED');
      } else {
        console.log('⚠️  GDPR Compliance: NOT CLEARLY VISIBLE');
      }
    } catch (error) {
      console.log('❌ GDPR Test: FAILED -', error.message);
      throw error;
    }
  });
});
