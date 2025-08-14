/**
 * Simple Form Debug - Basic Network & Console Analysis
 */

const { chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:8080';

async function simpleFormDebug() {
  console.log('🔧 SIMPLE FORM DEBUG');
  console.log('=' .repeat(50));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 2000
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track key events
  let formSubmitted = false;
  let apiRequestMade = false;
  let emailCapturedFired = false;
  
  // Monitor console for form-related messages
  page.on('console', (msg) => {
    const text = msg.text();
    console.log(`📝 CONSOLE: ${text}`);
    
    if (text.includes('EMAIL_CAPTURED') || text.includes('onEmailCaptured')) {
      emailCapturedFired = true;
      console.log('🎯 EMAIL_CAPTURED EVENT DETECTED!');
    }
    
    if (text.includes('mutation') || text.includes('onSubmit')) {
      formSubmitted = true;
      console.log('📋 FORM SUBMISSION DETECTED!');
    }
  });
  
  // Monitor API requests
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/')) {
      apiRequestMade = true;
      console.log(`🌐 API REQUEST: ${request.method()} ${url}`);
    }
  });
  
  try {
    // Navigate and wait
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait for email form to appear
    console.log('⏳ Waiting for email form...');
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    console.log('✅ Email form is ready');
    
    // Fill form
    console.log('📝 Filling form...');
    const testEmail = `simple-debug-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', testEmail);
    console.log(`✅ Email filled: ${testEmail}`);
    
    // Find submit button and click
    console.log('🔍 Looking for submit button...');
    const submitButton = page.locator('button[type="submit"]');
    const buttonText = await submitButton.first().textContent();
    console.log(`✅ Found submit button: "${buttonText}"`);
    
    console.log('🚀 Clicking submit button...');
    await submitButton.first().click();
    
    // Wait and check results
    console.log('⏳ Waiting 10 seconds for results...');
    await page.waitForTimeout(10000);
    
    console.log('\n📊 FINAL RESULTS:');
    console.log(`  Form submitted: ${formSubmitted ? '✅ YES' : '❌ NO'}`);
    console.log(`  API request made: ${apiRequestMade ? '✅ YES' : '❌ NO'}`);
    console.log(`  EMAIL_CAPTURED fired: ${emailCapturedFired ? '✅ YES' : '❌ NO'}`);
    
    // Check for any validation errors
    const errorElements = await page.locator('[class*="error"], [class*="destructive"], .text-red-500').count();
    console.log(`  Validation errors visible: ${errorElements}`);
    
    // Check current URL
    console.log(`  Current URL: ${page.url()}`);
    
    if (!formSubmitted && !apiRequestMade && !emailCapturedFired) {
      console.log('\n🚨 DIAGNOSIS: Form submission is completely broken');
      console.log('   Possible causes:');
      console.log('   - React form handler not attached');
      console.log('   - JavaScript errors preventing submission');
      console.log('   - Form validation failing silently');
      console.log('   - Submit button not properly connected to form');
    } else if (formSubmitted && !apiRequestMade) {
      console.log('\n🚨 DIAGNOSIS: Form submits but no API request');
      console.log('   Possible causes:');
      console.log('   - API endpoint not reachable');
      console.log('   - Form data validation failing');
      console.log('   - Network request blocked');
    } else if (apiRequestMade && !emailCapturedFired) {
      console.log('\n🚨 DIAGNOSIS: API works but state machine not triggered');
      console.log('   Possible causes:');
      console.log('   - onEmailCaptured callback not called');
      console.log('   - State machine dispatch failing');
      console.log('   - React state update issue');
    } else if (emailCapturedFired) {
      console.log('\n✅ SUCCESS: Email flow working correctly!');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 SIMPLE DEBUG COMPLETE');
}

// Run the debug
if (require.main === module) {
  simpleFormDebug()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Debug failed:', error);
      process.exit(1);
    });
}

module.exports = { simpleFormDebug };