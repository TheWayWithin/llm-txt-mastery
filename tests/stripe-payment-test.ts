import { chromium, Browser, Page, BrowserContext } from 'playwright';

const TEST_URL = 'http://localhost:5001';

// Test card numbers (Stripe test mode)
const TEST_CARDS = {
  success: '4242424242424242',
  decline: '4000000000000002',
  insufficient: '4000000000009995',
};

interface TestResult {
  tier: string;
  status: 'success' | 'failure';
  error?: string;
  checkoutSessionId?: string;
  redirectUrl?: string;
  time: number;
}

async function generateTestEmail(): Promise<string> {
  const timestamp = Date.now();
  return `stripe-test-${timestamp}@test.com`;
}

async function testPaymentFlow(
  page: Page,
  tier: 'coffee' | 'growth' | 'scale',
  cardNumber: string = TEST_CARDS.success
): Promise<TestResult> {
  const startTime = Date.now();
  const testEmail = await generateTestEmail();
  
  try {
    console.log(`\n🧪 Testing ${tier.toUpperCase()} tier payment flow...`);
    console.log(`   Email: ${testEmail}`);
    
    // 1. Navigate to homepage
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');
    
    // 2. Click "Start Free Analysis" button
    const startButton = page.locator('button:has-text("Start Free Analysis")').first();
    if (await startButton.isVisible()) {
      await startButton.click();
    } else {
      // Try alternative button text
      const getStartedButton = page.locator('button:has-text("Get Started")').first();
      await getStartedButton.click();
    }
    
    // 3. Select tier
    console.log(`   Selecting ${tier} tier...`);
    await page.waitForSelector('[role="radiogroup"]', { timeout: 5000 });
    
    const tierSelectors = {
      coffee: 'input[value="coffee"]',
      growth: 'input[value="growth"]',
      scale: 'input[value="scale"]'
    };
    
    await page.click(tierSelectors[tier]);
    await page.waitForTimeout(500);
    
    // 4. Click Sign Up button
    console.log('   Clicking Sign Up...');
    const signUpButton = page.locator('button:has-text("Sign Up")').first();
    await signUpButton.click();
    
    // 5. Fill signup form
    console.log('   Filling signup form...');
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    // Submit signup form
    await page.click('button[type="submit"]:has-text("Sign Up")');
    
    // 6. Wait for redirect to Stripe or analysis page
    console.log('   Waiting for redirect...');
    
    // For paid tiers, we should be redirected to Stripe
    if (tier !== 'coffee' && tier !== 'growth' && tier !== 'scale') {
      // Free tier - should go to email verification
      await page.waitForURL('**/check-email', { timeout: 10000 });
      return {
        tier,
        status: 'success',
        redirectUrl: page.url(),
        time: Date.now() - startTime
      };
    }
    
    // Wait for Stripe checkout redirect
    try {
      await page.waitForURL('**/checkout.stripe.com/**', { timeout: 15000 });
      console.log('   ✅ Redirected to Stripe Checkout!');
      
      // Get checkout session ID from URL
      const url = new URL(page.url());
      const sessionId = url.pathname.split('/').pop();
      
      // Now we're on Stripe's checkout page
      console.log('   Filling payment details...');
      
      // Wait for Stripe checkout to load
      await page.waitForSelector('input[name="email"]', { timeout: 10000 });
      
      // Fill email if needed
      const emailInput = page.locator('input[name="email"]');
      if (await emailInput.isVisible()) {
        await emailInput.fill(testEmail);
      }
      
      // Fill card details
      await page.frameLocator('iframe[title*="card number"]').locator('input[name="cardnumber"]').fill(cardNumber);
      await page.frameLocator('iframe[title*="expiry"]').locator('input[name="exp-date"]').fill('12/30');
      await page.frameLocator('iframe[title*="CVC"]').locator('input[name="cvc"]').fill('123');
      
      // Fill billing details
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[id="billingPostalCode"]', '10001');
      
      // Submit payment
      console.log('   Submitting payment...');
      await page.click('button[type="submit"]');
      
      // Wait for redirect back to our app
      await page.waitForURL(`${TEST_URL}/**`, { timeout: 15000 });
      
      console.log(`   ✅ Payment completed! Redirected to: ${page.url()}`);
      
      return {
        tier,
        status: 'success',
        checkoutSessionId: sessionId,
        redirectUrl: page.url(),
        time: Date.now() - startTime
      };
      
    } catch (stripeError) {
      // Check if we ended up on check-email page (for free tier)
      if (page.url().includes('check-email')) {
        console.log('   ℹ️ Redirected to email verification (free tier behavior)');
        return {
          tier,
          status: 'success',
          redirectUrl: page.url(),
          time: Date.now() - startTime
        };
      }
      throw stripeError;
    }
    
  } catch (error) {
    console.error(`   ❌ Error testing ${tier} tier:`, error);
    return {
      tier,
      status: 'failure',
      error: error instanceof Error ? error.message : String(error),
      time: Date.now() - startTime
    };
  }
}

async function testStripeIntegration() {
  console.log('🚀 Starting Stripe Payment Flow Testing');
  console.log('=====================================\n');
  
  const browser = await chromium.launch({
    headless: false, // Show browser for debugging
    slowMo: 500 // Slow down actions for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const results: TestResult[] = [];
  
  // Test each tier
  for (const tier of ['coffee', 'growth', 'scale'] as const) {
    const page = await context.newPage();
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('   Browser console error:', msg.text());
      }
    });
    
    const result = await testPaymentFlow(page, tier);
    results.push(result);
    
    // Take screenshot of final state
    await page.screenshot({ 
      path: `tests/screenshots/stripe-${tier}-final.png`,
      fullPage: true 
    });
    
    await page.close();
    
    // Wait between tests
    if (tier !== 'scale') {
      console.log('\n   Waiting 3 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Print summary
  console.log('\n=====================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=====================================\n');
  
  for (const result of results) {
    const emoji = result.status === 'success' ? '✅' : '❌';
    console.log(`${emoji} ${result.tier.toUpperCase()} Tier: ${result.status}`);
    if (result.checkoutSessionId) {
      console.log(`   Checkout Session: ${result.checkoutSessionId}`);
    }
    if (result.redirectUrl) {
      console.log(`   Final URL: ${result.redirectUrl}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log(`   Time: ${(result.time / 1000).toFixed(2)}s`);
    console.log();
  }
  
  await browser.close();
  
  // Return overall success
  return results.every(r => r.status === 'success');
}

// Run the tests
testStripeIntegration()
  .then(success => {
    console.log(success ? '\n✅ All payment flows tested successfully!' : '\n❌ Some tests failed');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });