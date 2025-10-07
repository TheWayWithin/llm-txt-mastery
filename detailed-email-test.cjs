/**
 * Detailed Email Flow Test - Deep Inspection
 * This test provides more detailed inspection of the email form behavior
 */

const { chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:8080';

async function inspectEmailForm() {
  console.log('🔍 DETAILED EMAIL FORM INSPECTION');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all console messages
  const consoleMessages = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(text);
    console.log(`📝 CONSOLE: ${text}`);
  });

  // Capture network requests
  const networkRequests = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        postData: request.postData(),
      });
      console.log(`🌐 REQUEST: ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', (response) => {
    if (response.url().includes('/api/')) {
      console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
    }
  });

  try {
    // Navigate to the page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n🎯 ANALYZING EMAIL CAPTURE FORM...');

    // Inspect the email capture form structure
    const cards = await page.locator('.card, [class*="card"]').count();
    console.log(`📋 Found ${cards} card elements`);

    // Look for radio buttons
    const radios = await page.locator('input[type="radio"]').count();
    console.log(`🔘 Found ${radios} radio buttons`);

    if (radios > 0) {
      for (let i = 0; i < radios; i++) {
        const radio = page.locator('input[type="radio"]').nth(i);
        const value = await radio.getAttribute('value');
        const id = await radio.getAttribute('id');
        console.log(`  Radio ${i}: value="${value}", id="${id}"`);
      }
    }

    // Look for the form element
    const forms = await page.locator('form').count();
    console.log(`📝 Found ${forms} form elements`);

    // Look for email input
    const emailInputs = await page.locator('input[type="email"]').count();
    console.log(`📧 Found ${emailInputs} email inputs`);

    // Look for submit buttons
    const buttons = await page.locator('button[type="submit"], button').count();
    console.log(`🔳 Found ${buttons} buttons`);

    if (buttons > 0) {
      for (let i = 0; i < Math.min(buttons, 5); i++) {
        const button = page.locator('button').nth(i);
        const text = await button.textContent().catch(() => 'N/A');
        const type = await button.getAttribute('type').catch(() => 'N/A');
        console.log(`  Button ${i}: text="${text}", type="${type}"`);
      }
    }

    console.log('\n🧪 TESTING STARTER TIER INTERACTION...');

    // Try to select starter tier (should be default)
    const starterRadio = page.locator('input[value="starter"]');
    if ((await starterRadio.count()) > 0) {
      await starterRadio.click();
      console.log('✅ Selected starter tier');
    } else {
      console.log('⚠️ Starter radio not found, trying alternative methods');

      // Try clicking on the starter card/label
      const starterLabel = page
        .locator('text=/starter/i, text=/test drive/i, text=/free/i')
        .first();
      if ((await starterLabel.count()) > 0) {
        await starterLabel.click();
        console.log('✅ Selected starter tier via label');
      }
    }

    // Fill email
    const emailInput = page.locator('input[type="email"]').first();
    if ((await emailInput.count()) > 0) {
      const testEmail = `detailed-test-${Date.now()}@example.com`;
      await emailInput.fill(testEmail);
      console.log(`✅ Filled email: ${testEmail}`);
    } else {
      console.log('❌ Email input not found');
    }

    // Find and click submit button
    const submitButton = page.locator('button[type="submit"]').first();
    if ((await submitButton.count()) > 0) {
      console.log('\n🚀 CLICKING SUBMIT BUTTON...');
      console.log('Console messages before submit:', consoleMessages.length);

      await submitButton.click();

      // Wait for potential state changes
      await page.waitForTimeout(5000);

      console.log('Console messages after submit:', consoleMessages.length);
      console.log('Network requests made:', networkRequests.length);

      // Check for specific console messages
      const emailCapturedMessages = consoleMessages.filter(
        (msg) =>
          msg.includes('EMAIL_CAPTURED') ||
          msg.includes('Email captured') ||
          msg.includes('captureEmail') ||
          msg.includes('onEmailCaptured')
      );

      console.log(`\n📊 EMAIL_CAPTURED related messages: ${emailCapturedMessages.length}`);
      emailCapturedMessages.forEach((msg) => console.log(`  🎯 ${msg}`));

      // Check state machine messages
      const stateMessages = consoleMessages.filter(
        (msg) =>
          msg.includes('State transition') ||
          msg.includes('currentState') ||
          msg.includes('dispatch')
      );

      console.log(`\n📊 State machine messages: ${stateMessages.length}`);
      stateMessages.forEach((msg) => console.log(`  🔄 ${msg}`));

      // Check API requests
      console.log(`\n📊 API requests made: ${networkRequests.length}`);
      networkRequests.forEach((req) => {
        console.log(`  🌐 ${req.method} ${req.url}`);
        if (req.postData) {
          console.log(`    📤 Data: ${req.postData.substring(0, 200)}`);
        }
      });
    } else {
      console.log('❌ Submit button not found');
    }

    // Take a screenshot for manual inspection
    await page.screenshot({ path: 'email-form-state.png', fullPage: true });
    console.log('\n📸 Screenshot saved as email-form-state.png');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 DETAILED INSPECTION COMPLETE');
  console.log('='.repeat(60));
}

// Run the detailed inspection
if (require.main === module) {
  inspectEmailForm()
    .then(() => {
      console.log('\n✅ Inspection completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Inspection failed:', error);
      process.exit(1);
    });
}

module.exports = { inspectEmailForm };
