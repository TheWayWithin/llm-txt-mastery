/**
 * Debug Form Submission - Network & Error Analysis
 * This test focuses on understanding why form submissions aren't working
 */

const { chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:8080';

async function debugFormSubmission() {
  console.log('🐛 DEBUG FORM SUBMISSION ANALYSIS');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1500,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture ALL network activity
  const allRequests = [];
  const allResponses = [];

  page.on('request', (request) => {
    allRequests.push({
      url: request.url(),
      method: request.method(),
      headers: Object.fromEntries(request.headers()),
      postData: request.postData(),
      timestamp: Date.now(),
    });

    console.log(`📤 REQUEST: ${request.method()} ${request.url()}`);
    if (request.postData()) {
      console.log(`   📋 POST DATA: ${request.postData().substring(0, 200)}`);
    }
  });

  page.on('response', (response) => {
    allResponses.push({
      url: response.url(),
      status: response.status(),
      headers: Object.fromEntries(response.headers()),
      timestamp: Date.now(),
    });

    console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
  });

  // Capture errors
  const errors = [];
  page.on('pageerror', (error) => {
    errors.push(error);
    console.log(`💥 PAGE ERROR: ${error.message}`);
  });

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();

    if (type === 'error') {
      console.log(`❌ CONSOLE ERROR: ${text}`);
    } else if (text.includes('mutation') || text.includes('submit') || text.includes('email')) {
      console.log(`🔍 RELEVANT: ${text}`);
    }
  });

  try {
    // Navigate and wait for page to load
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });

    console.log('\n🎯 SETTING UP FORM...');

    // Select starter tier
    const starterRadio = page.locator('[role="radio"][data-state]').first();
    await starterRadio.click();
    console.log('✅ Selected starter tier');

    // Fill email
    const testEmail = `debug-test-${Date.now()}@example.com`;
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(testEmail);
    console.log(`✅ Filled email: ${testEmail}`);

    // Before submitting, let's inspect the form state
    console.log('\n🔍 INSPECTING FORM STATE...');

    // Check if form has proper event handlers
    const formHandler = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        return {
          hasOnSubmit: !!form.onsubmit,
          hasEventListeners: form.getEventListeners
            ? !!form.getEventListeners('submit')
            : 'unknown',
          action: form.action,
          method: form.method,
        };
      }
      return null;
    });

    console.log('📋 Form inspection:', JSON.stringify(formHandler, null, 2));

    // Check React form state
    const reactFormState = await page.evaluate(() => {
      // Try to find React form state in dev tools
      const emailInput = document.querySelector('input[type="email"]');
      if (emailInput) {
        return {
          value: emailInput.value,
          name: emailInput.name,
          required: emailInput.required,
          validity: emailInput.validity.valid,
        };
      }
      return null;
    });

    console.log('📋 Email input state:', JSON.stringify(reactFormState, null, 2));

    console.log('\n🚀 SUBMITTING FORM...');

    // Clear request tracking for submission
    allRequests.length = 0;
    allResponses.length = 0;

    // Find and click submit button
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    console.log('⏳ Waiting for form submission effects...');

    // Wait for any network activity
    await page.waitForTimeout(5000);

    console.log('\n📊 SUBMISSION ANALYSIS:');
    console.log(`  Network requests made: ${allRequests.length}`);
    console.log(`  Network responses received: ${allResponses.length}`);
    console.log(`  JavaScript errors: ${errors.length}`);

    if (allRequests.length > 0) {
      console.log('\n📤 REQUESTS MADE:');
      allRequests.forEach((req, i) => {
        console.log(`  ${i + 1}. ${req.method} ${req.url}`);
        if (req.postData) {
          console.log(`     📋 Data: ${req.postData}`);
        }
      });
    } else {
      console.log('\n❌ NO NETWORK REQUESTS MADE - Form submission not triggering API calls');
    }

    if (allResponses.length > 0) {
      console.log('\n📥 RESPONSES RECEIVED:');
      allResponses.forEach((res, i) => {
        console.log(`  ${i + 1}. ${res.status} ${res.url}`);
      });
    }

    if (errors.length > 0) {
      console.log('\n💥 JAVASCRIPT ERRORS:');
      errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.message}`);
        console.log(`     Stack: ${err.stack?.substring(0, 200)}...`);
      });
    }

    // Check current page state after submission
    const finalUrl = page.url();
    console.log(`\n📍 Final URL: ${finalUrl}`);

    // Check for any error messages on page
    const errorMessages = await page
      .locator('[class*="error"], [class*="destructive"], .text-red-500, .text-red-700')
      .allTextContents();
    if (errorMessages.length > 0) {
      console.log('\n🚨 ERROR MESSAGES ON PAGE:');
      errorMessages.forEach((msg) => console.log(`  - ${msg}`));
    }

    // Take screenshot for visual inspection
    await page.screenshot({ path: 'form-submission-debug.png', fullPage: true });
    console.log('\n📸 Screenshot saved: form-submission-debug.png');
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 FORM SUBMISSION DEBUG COMPLETE');
  console.log('='.repeat(60));
}

// Run the debug
if (require.main === module) {
  debugFormSubmission()
    .then(() => {
      console.log('\n✅ Debug completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Debug failed:', error);
      process.exit(1);
    });
}

module.exports = { debugFormSubmission };
