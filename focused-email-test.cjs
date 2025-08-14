/**
 * Focused Email Flow Test - Radix UI Components
 * This test specifically targets Radix UI RadioGroup components
 */

const { chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:8080';

async function testEmailFlowWithRadixUI() {
  console.log('🎯 FOCUSED EMAIL FLOW TEST - RADIX UI');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track important events
  const events = {
    emailCaptured: false,
    stateTransitions: [],
    apiRequests: [],
    consoleMessages: []
  };
  
  // Capture console messages
  page.on('console', (msg) => {
    const text = msg.text();
    events.consoleMessages.push(text);
    
    if (text.includes('EMAIL_CAPTURED') || text.includes('captureEmail') || text.includes('onEmailCaptured')) {
      events.emailCaptured = true;
      console.log(`🎯 EMAIL EVENT: ${text}`);
    }
    
    if (text.includes('State transition') || text.includes('dispatch')) {
      events.stateTransitions.push(text);
      console.log(`🔄 STATE: ${text}`);
    }
  });
  
  // Capture API requests
  page.on('request', (request) => {
    if (request.url().includes('/api/')) {
      events.apiRequests.push({
        url: request.url(),
        method: request.method(),
        postData: request.postData()
      });
      console.log(`🌐 API REQUEST: ${request.method()} ${request.url()}`);
    }
  });
  
  try {
    // Navigate to the page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait for email capture to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    console.log('✅ Email input is visible');
    
    // Test each tier systematically
    const tiers = [
      { name: 'starter', label: 'Test Drive', expectRedirect: false },
      { name: 'coffee', label: 'Solopreneur Special', expectRedirect: true },
      // { name: 'growth', label: 'Growing Business', expectRedirect: false },
      // { name: 'scale', label: 'Agency & API', expectRedirect: false }
    ];
    
    for (const tier of tiers) {
      console.log(`\n🧪 TESTING ${tier.name.toUpperCase()} TIER`);
      console.log('-' .repeat(40));
      
      // Reset events for this tier
      events.emailCaptured = false;
      events.stateTransitions = [];
      events.apiRequests = [];
      
      // Reload page for clean state
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      
      // Step 1: Select tier using multiple strategies
      console.log(`🎯 Selecting ${tier.name} tier...`);
      
      // Strategy 1: Try Radix UI RadioGroupItem
      const radioGroupItem = page.locator(`[role="radio"][data-state][aria-labelledby], [role="radio"][value="${tier.name}"]`);
      if (await radioGroupItem.count() > 0) {
        await radioGroupItem.first().click();
        console.log(`✅ Selected ${tier.name} via Radix RadioGroupItem`);
      } else {
        // Strategy 2: Try clicking the tier card/div
        const tierCard = page.locator(`text="${tier.label}"`).first();
        if (await tierCard.count() > 0) {
          await tierCard.click();
          console.log(`✅ Selected ${tier.name} via tier label`);
        } else {
          // Strategy 3: Try the div that contains the tier
          const tierDiv = page.locator(`div:has-text("${tier.label}")`).first();
          if (await tierDiv.count() > 0) {
            await tierDiv.click();
            console.log(`✅ Selected ${tier.name} via tier div`);
          } else {
            console.log(`❌ Could not find ${tier.name} tier selector`);
            continue;
          }
        }
      }
      
      // Step 2: Fill email
      const testEmail = `${tier.name}-test-${Date.now()}@example.com`;
      const emailInput = page.locator('input[type="email"]');
      await emailInput.fill(testEmail);
      console.log(`✅ Filled email: ${testEmail}`);
      
      // Step 3: Submit form
      console.log('🚀 Submitting form...');
      
      // Find submit button with multiple strategies
      let submitButton;
      
      // Try form submission button
      submitButton = page.locator('button[type="submit"]');
      if (await submitButton.count() === 0) {
        // Try button with specific text for this tier
        if (tier.name === 'coffee') {
          submitButton = page.locator('button:has-text("Continue to Payment"), button:has-text("Pay")');
        } else {
          submitButton = page.locator('button:has-text("Start Analysis")');
        }
      }
      
      if (await submitButton.count() > 0) {
        console.log(`✅ Found submit button: ${await submitButton.first().textContent()}`);
        
        // Click submit and monitor for results
        await submitButton.first().click();
        
        // Wait for state changes
        await page.waitForTimeout(3000);
        
        // Check for results
        console.log('\n📊 RESULTS:');
        console.log(`  EMAIL_CAPTURED event: ${events.emailCaptured ? '✅ YES' : '❌ NO'}`);
        console.log(`  State transitions: ${events.stateTransitions.length}`);
        console.log(`  API requests: ${events.apiRequests.length}`);
        
        if (events.stateTransitions.length > 0) {
          console.log('  State transitions:');
          events.stateTransitions.forEach(s => console.log(`    🔄 ${s}`));
        }
        
        if (events.apiRequests.length > 0) {
          console.log('  API requests:');
          events.apiRequests.forEach(r => console.log(`    🌐 ${r.method} ${r.url}`));
        }
        
        // For coffee tier, check if redirected or payment flow started
        if (tier.name === 'coffee') {
          const currentUrl = page.url();
          if (currentUrl.includes('stripe') || currentUrl.includes('checkout') || currentUrl.includes('payment')) {
            console.log(`✅ Coffee tier: Successfully redirected to payment (${currentUrl})`);
          } else {
            console.log(`📍 Coffee tier: Still on same page (${currentUrl})`);
          }
        }
        
      } else {
        console.log('❌ Submit button not found');
      }
      
      console.log(`\n✅ ${tier.name.toUpperCase()} TIER TEST COMPLETE`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 FOCUSED EMAIL FLOW TEST COMPLETE');
  console.log('=' .repeat(60));
}

// Run the test
if (require.main === module) {
  testEmailFlowWithRadixUI()
    .then(() => {
      console.log('\n✅ Focused test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Focused test failed:', error);
      process.exit(1);
    });
}

module.exports = { testEmailFlowWithRadixUI };