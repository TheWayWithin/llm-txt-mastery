import { chromium } from 'playwright';

/**
 * Debug test to understand the exact flow after email capture
 */

async function debugTierFlow() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 2000, // Extra slow to see everything
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const timestamp = Date.now();
  const testEmail = `debug-tier-${timestamp}@tempmail.org`;

  console.log('🔍 DEBUG: TIER FLOW TEST');
  console.log(`📧 Test Email: ${testEmail}`);
  console.log('='.repeat(40));

  try {
    // Navigate and start flow
    await page.goto('https://www.llmtxtmastery.com');
    await page.waitForLoadState('networkidle');

    // Fill URL
    const urlInput = await page.locator('input[type="url"]').first();
    await urlInput.fill('https://example.com');
    await urlInput.press('Enter');

    console.log('1️⃣ URL submitted, waiting for email input...');
    await page.waitForTimeout(3000);

    // Fill email
    const emailInput = await page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill(testEmail);

      // Click continue
      const continueBtn = await page
        .locator('button:has-text("Continue without password")')
        .first();
      if (await continueBtn.isVisible({ timeout: 3000 })) {
        console.log('2️⃣ Clicking "Continue without password"...');
        await continueBtn.click();
      } else {
        console.log('2️⃣ Continue button not found, trying other buttons...');
        const processingBtn = await page.locator('button:has-text("Processing")').first();
        if (await processingBtn.isVisible()) {
          console.log('   Found "Processing" button - clicking...');
          await processingBtn.click();
        }
      }
    }

    console.log('3️⃣ After email submission, waiting to see what appears...');
    await page.waitForTimeout(5000);

    // Check current DOM state
    console.log('4️⃣ Checking current DOM state...');

    // Look for TierLimitsDisplay indicators
    const limitsText = await page.locator('text=/Checking Usage Limits/i').first();
    const limitsTextVisible = await limitsText.isVisible({ timeout: 2000 });
    console.log(`   Limits check text visible: ${limitsTextVisible}`);

    // Look for any analysis-related content
    const analysisContent = await page.locator('text=/Analyzing/i').first();
    const analysisVisible = await analysisContent.isVisible({ timeout: 2000 });
    console.log(`   Analysis content visible: ${analysisVisible}`);

    // Look for URL input (would indicate we reached analysis state)
    const urlInputVisible = await page
      .locator('input[placeholder*="website URL"]')
      .first()
      .isVisible({ timeout: 2000 });
    console.log(`   URL input visible: ${urlInputVisible}`);

    // Check for any error messages
    const errorElements = await page
      .locator('[class*="error"], [class*="Error"], .text-red-')
      .all();
    console.log(`   Found ${errorElements.length} potential error elements`);

    for (let i = 0; i < errorElements.length && i < 3; i++) {
      const text = await errorElements[i].textContent();
      if (text && text.length > 0) {
        console.log(`   Error ${i + 1}: ${text}`);
      }
    }

    // Check browser console logs
    console.log('5️⃣ Browser console messages:');
    const logs = await page.evaluate(() => {
      // This won't work for existing logs, but we can check for any new ones
      return 'Check browser dev tools for console messages';
    });
    console.log(`   ${logs}`);

    // Take a detailed screenshot
    await page.screenshot({
      path: `debug-tier-flow-${timestamp}.png`,
      fullPage: true,
    });
    console.log(`📸 Debug screenshot: debug-tier-flow-${timestamp}.png`);

    // Let's also check the page title and URL to see where we are
    const currentUrl = page.url();
    const currentTitle = await page.title();
    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`📍 Current Title: ${currentTitle}`);
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    await page.screenshot({
      path: `debug-tier-error-${timestamp}.png`,
      fullPage: true,
    });
  }

  // Keep browser open longer for manual inspection
  console.log('\n🔍 Keeping browser open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
}

debugTierFlow().catch(console.error);
