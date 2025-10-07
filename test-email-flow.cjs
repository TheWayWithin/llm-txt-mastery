/**
 * Email Flow Test Script
 * Tests email submission for all tiers and verifies EMAIL_CAPTURED events
 */

const { chromium } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:8080';
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_URL = 'https://example.com';

// Test results tracking
let testResults = {
  starterTier: { success: false, error: null, emailCapturedFired: false },
  coffeeTier: { success: false, error: null, emailCapturedFired: false },
  growthTier: { success: false, error: null, emailCapturedFired: false },
  scaleTier: { success: false, error: null, emailCapturedFired: false },
};

async function testEmailFlowForTier(page, tierName, expectedEmailCapturedEvent = true) {
  console.log(`\n🧪 Testing ${tierName} tier email flow...`);

  try {
    // Navigate to home page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for email capture form to be visible
    const emailCaptureCard = page
      .locator('[data-testid="email-capture"], .card, [class*="card"]')
      .first();
    await emailCaptureCard.waitFor({ state: 'visible', timeout: 10000 });

    console.log(`✅ Email capture form is visible for ${tierName} tier`);

    // Select the appropriate tier
    const tierRadio = page.locator(`input[value="${tierName}"]`);
    if ((await tierRadio.count()) > 0) {
      await tierRadio.click();
      console.log(`✅ Selected ${tierName} tier`);
    } else {
      console.log(`⚠️ ${tierName} tier radio button not found, trying alternative selector`);
      // Try alternative selector
      const tierLabel = page.locator(`text=${tierName}`).first();
      if ((await tierLabel.count()) > 0) {
        await tierLabel.click();
        console.log(`✅ Selected ${tierName} tier via label`);
      }
    }

    // Fill in email
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(`${tierName}-${TEST_EMAIL}`);
    console.log(`✅ Filled email: ${tierName}-${TEST_EMAIL}`);

    // Set up console monitoring for EMAIL_CAPTURED event
    let emailCapturedFired = false;
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('EMAIL_CAPTURED') || text.includes('Email captured successfully')) {
        console.log(`🎯 EMAIL_CAPTURED event detected for ${tierName}: ${text}`);
        emailCapturedFired = true;
      }
    });

    // Submit the form
    const submitButton = page
      .locator(
        'button[type="submit"], button:has-text("Start Analysis"), button:has-text("Continue to Payment"), button:has-text("Pay")'
      )
      .first();
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });

    console.log(`🚀 Clicking submit button for ${tierName} tier...`);
    await submitButton.click();

    // Wait for state transition or redirect
    if (tierName === 'coffee') {
      // Coffee tier should redirect to Stripe or show payment processing
      try {
        await page.waitForURL(/stripe|payment|checkout/, { timeout: 10000 });
        console.log(`✅ ${tierName} tier: Redirected to payment page as expected`);
      } catch (e) {
        // Check if we stayed on same page but state changed
        await page.waitForTimeout(3000);
        const currentUrl = page.url();
        console.log(`📍 ${tierName} tier: Current URL after submit: ${currentUrl}`);
      }
    } else {
      // Other tiers should proceed to next step (URL input or analysis)
      await page.waitForTimeout(3000);
      const urlInputVisible = await page
        .locator('input[placeholder*="website"], input[id*="url"], input[name*="url"]')
        .isVisible()
        .catch(() => false);
      const analysisVisible = await page
        .locator('text=Analysis, text=Analyzing, [data-testid*="analysis"]')
        .isVisible()
        .catch(() => false);

      if (urlInputVisible || analysisVisible) {
        console.log(`✅ ${tierName} tier: Proceeded to next step as expected`);
      } else {
        console.log(`⚠️ ${tierName} tier: State transition unclear, checking page content...`);
        const pageContent = await page.textContent('body');
        console.log(`📄 Page content preview: ${pageContent.substring(0, 200)}...`);
      }
    }

    // Check if EMAIL_CAPTURED event was fired
    await page.waitForTimeout(2000); // Give time for events to fire

    if (emailCapturedFired) {
      console.log(`✅ ${tierName} tier: EMAIL_CAPTURED event was fired correctly`);
    } else {
      console.log(`❌ ${tierName} tier: EMAIL_CAPTURED event was NOT fired`);
    }

    return {
      success: true,
      error: null,
      emailCapturedFired,
    };
  } catch (error) {
    console.error(`❌ ${tierName} tier test failed:`, error.message);
    return {
      success: false,
      error: error.message,
      emailCapturedFired: false,
    };
  }
}

async function runEmailFlowTests() {
  console.log('🚀 Starting Email Flow Tests for All Tiers');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false, // Set to true for headless mode
    slowMo: 500, // Slow down for better visibility
  });

  try {
    // Test each tier in separate contexts
    const tiers = ['starter', 'coffee', 'growth', 'scale'];

    for (const tier of tiers) {
      const context = await browser.newContext();
      const page = await context.newPage();

      testResults[`${tier}Tier`] = await testEmailFlowForTier(page, tier);

      await context.close();

      // Small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } finally {
    await browser.close();
  }

  // Print final results
  console.log('\n' + '='.repeat(60));
  console.log('📊 EMAIL FLOW TEST RESULTS');
  console.log('='.repeat(60));

  let allPassed = true;

  Object.entries(testResults).forEach(([tier, result]) => {
    const tierName = tier.replace('Tier', '');
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const emailEvent = result.emailCapturedFired
      ? '✅ EMAIL_CAPTURED fired'
      : '❌ EMAIL_CAPTURED missing';

    console.log(`${tierName.toUpperCase()}: ${status} | ${emailEvent}`);

    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }

    if (!result.success || !result.emailCapturedFired) {
      allPassed = false;
    }
  });

  console.log('\n' + '='.repeat(60));

  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! Email flow working correctly for all tiers.');
  } else {
    console.log('⚠️  SOME TESTS FAILED. Check results above for details.');
  }

  console.log('='.repeat(60));

  return testResults;
}

// Additional manual test helper
async function quickManualTest() {
  console.log('\n🔧 MANUAL TEST HELPER');
  console.log('Use this to manually verify the email flow:');
  console.log(`1. Go to: ${BASE_URL}`);
  console.log(`2. Open browser dev tools (F12)`);
  console.log(`3. Go to Console tab`);
  console.log(`4. Try each tier with test emails:`);
  console.log(`   - Starter: starter-${TEST_EMAIL}`);
  console.log(`   - Coffee: coffee-${TEST_EMAIL}`);
  console.log(`   - Growth: growth-${TEST_EMAIL}`);
  console.log(`   - Scale: scale-${TEST_EMAIL}`);
  console.log(`5. Look for these console messages:`);
  console.log(`   - "EMAIL_CAPTURED"`);
  console.log(`   - "Email captured successfully"`);
  console.log(`   - State machine transition logs`);
  console.log('');
}

// Run tests if script is executed directly
if (require.main === module) {
  runEmailFlowTests()
    .then((results) => {
      quickManualTest();
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runEmailFlowTests, testEmailFlowForTier, quickManualTest };
