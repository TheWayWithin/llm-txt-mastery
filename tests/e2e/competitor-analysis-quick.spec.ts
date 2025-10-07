import { test, expect } from '@playwright/test';

/**
 * QUICK COMPETITOR ANALYSIS TEST
 *
 * A simplified test to validate the competitor analysis infrastructure
 * and get a quick assessment of one competitor.
 */

test.describe('Quick Competitor Analysis', () => {
  test('SiteSpeakAI - basic functionality test', async ({ page }) => {
    console.log('🔍 Quick test of SiteSpeakAI llms.txt generator');

    // Configure browser
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.setExtraHTTPHeaders({
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    // Navigate to SiteSpeakAI
    await page.goto('https://sitespeak.ai/tools/llms-txt-generator', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Take initial screenshot
    await page.screenshot({ path: 'test-results/sitespeak-landing.png', fullPage: true });

    // Look for input field
    const inputSelectors = [
      'input[type="url"]',
      'input[placeholder*="website"]',
      'input[placeholder*="URL"]',
      'input[name="url"]',
    ];

    let inputFound = false;
    let workingInputSelector = '';

    for (const selector of inputSelectors) {
      try {
        const input = page.locator(selector);
        if (await input.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found input field: ${selector}`);
          inputFound = true;
          workingInputSelector = selector;
          break;
        }
      } catch (error) {
        console.log(`❌ Input selector failed: ${selector}`);
      }
    }

    expect(inputFound).toBe(true);

    // Fill the input
    if (inputFound) {
      await page.locator(workingInputSelector).fill('https://example.com');
      console.log('✅ Filled input with test URL');
    }

    // Look for submit button
    const submitSelectors = [
      'button:has-text("Generate")',
      'button:has-text("Create")',
      'button:has-text("Build")',
      'button[type="submit"]',
      '.btn-primary',
    ];

    let submitFound = false;
    let workingSubmitSelector = '';

    for (const selector of submitSelectors) {
      try {
        const button = page.locator(selector);
        if ((await button.isVisible({ timeout: 2000 })) && (await button.isEnabled())) {
          console.log(`✅ Found submit button: ${selector}`);
          submitFound = true;
          workingSubmitSelector = selector;
          break;
        }
      } catch (error) {
        console.log(`❌ Submit selector failed: ${selector}`);
      }
    }

    expect(submitFound).toBe(true);

    // Click submit and wait briefly
    if (submitFound) {
      await page.locator(workingSubmitSelector).click();
      console.log('✅ Clicked submit button');

      // Wait 10 seconds to see if anything happens
      await page.waitForTimeout(10000);

      // Take screenshot after submission
      await page.screenshot({ path: 'test-results/sitespeak-after-submit.png', fullPage: true });
    }

    // Look for any output or loading indicators
    const outputSelectors = [
      'textarea[readonly]',
      'pre',
      'code',
      '.output',
      '.result',
      '.generated-content',
    ];

    const loadingSelectors = ['.loading', '.spinner', '[data-loading="true"]', '.progress'];

    console.log('🔍 Checking for output or loading indicators...');

    let outputFound = false;
    let loadingFound = false;

    // Check for loading
    for (const selector of loadingSelectors) {
      try {
        if (await page.locator(selector).isVisible({ timeout: 1000 })) {
          console.log(`⏳ Loading indicator found: ${selector}`);
          loadingFound = true;
        }
      } catch (error) {
        // Continue checking
      }
    }

    // Check for output
    for (const selector of outputSelectors) {
      try {
        const output = page.locator(selector);
        if (await output.isVisible({ timeout: 1000 })) {
          const content = await output.textContent();
          if (content && content.trim().length > 0) {
            console.log(`✅ Output found: ${selector} - ${content.length} characters`);
            console.log(`Sample: ${content.substring(0, 100)}...`);
            outputFound = true;
            break;
          }
        }
      } catch (error) {
        // Continue checking
      }
    }

    if (!outputFound && !loadingFound) {
      console.log('❌ No output or loading indicators found');

      // Check page content for clues
      const pageText = await page.textContent('body');
      if (pageText?.includes('error') || pageText?.includes('Error')) {
        console.log('⚠️ Page contains error text');
      }
      if (pageText?.includes('rate') || pageText?.includes('limit')) {
        console.log('⚠️ Possible rate limiting detected');
      }
    }

    console.log(
      `📊 Quick test results: Input=${inputFound}, Submit=${submitFound}, Output=${outputFound}, Loading=${loadingFound}`
    );
  });
});
