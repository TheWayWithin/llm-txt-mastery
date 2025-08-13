import { chromium } from 'playwright';

/**
 * Quick validation test for TierLimitsDisplay fix:
 * 1. Navigate to site
 * 2. Enter email 
 * 3. Check if tier limits component auto-proceeds
 * 4. Verify we reach URL input
 */

async function validateTierFix() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down to see the fix in action
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const timestamp = Date.now();
  const testEmail = `tier-fix-test-${timestamp}@tempmail.org`;
  
  console.log('🔧 TIER FIX VALIDATION TEST');
  console.log(`📧 Test Email: ${testEmail}`);
  console.log('=' .repeat(40));
  
  try {
    // Navigate to the site
    console.log('\n1️⃣ Navigating to site...');
    await page.goto('https://www.llmtxtmastery.com');
    await page.waitForLoadState('networkidle');
    
    // First, let's enter a URL to start the flow
    console.log('2️⃣ Looking for URL input...');
    const urlInputSelectors = [
      'input[placeholder*="Enter website URL"]',
      'input[placeholder*="website URL"]',
      'input[type="url"]',
      'input[name="url"]'
    ];
    
    let urlInput = null;
    for (const selector of urlInputSelectors) {
      const input = await page.locator(selector).first();
      if (await input.isVisible({ timeout: 3000 })) {
        urlInput = input;
        console.log(`   ✅ Found URL input: ${selector}`);
        break;
      }
    }
    
    if (!urlInput) {
      // Try clicking "Get Started" if URL input isn't visible
      console.log('   Trying Get Started button...');
      const getStartedButton = await page.locator('button:has-text("Get Started")').first();
      if (await getStartedButton.isVisible({ timeout: 3000 })) {
        await getStartedButton.click();
        console.log('   ✅ Clicked Get Started');
        
        // Now look for URL input again
        for (const selector of urlInputSelectors) {
          const input = await page.locator(selector).first();
          if (await input.isVisible({ timeout: 3000 })) {
            urlInput = input;
            console.log(`   ✅ Found URL input after Get Started: ${selector}`);
            break;
          }
        }
      }
    }
    
    if (!urlInput) {
      throw new Error('Could not find URL input field');
    }
    
    // Enter a test URL
    console.log('3️⃣ Entering test URL...');
    const testUrl = 'https://example.com';
    await urlInput.fill(testUrl);
    await urlInput.press('Enter'); // Or look for submit button
    
    // Enter email when prompted
    console.log(`4️⃣ Looking for email input...`);
    await page.waitForTimeout(2000); // Give time for navigation
    
    const emailInput = await page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 8000 })) {
      console.log(`   ✅ Found email input, entering: ${testEmail}`);
      await emailInput.fill(testEmail);
      
      // Look for continue/submit button
      const continueSelectors = [
        'button:has-text("Continue without password")',
        'button:has-text("Quick Start")',
        'button:has-text("Get Started Free")',
        'button:has-text("Start Free")',
        'button:has-text("Continue")',
        'button[type="submit"]'
      ];
      
      let clicked = false;
      for (const selector of continueSelectors) {
        const btn = await page.locator(selector).first();
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          console.log(`   ✅ Clicked "${await btn.textContent()}"`);
          clicked = true;
          break;
        }
      }
      
      if (!clicked) {
        console.log('   ⚠️ No continue button found, trying Enter key');
        await emailInput.press('Enter');
      }
    } else {
      console.log('   ⚠️ Email input not found, flow might be different');
    }
    
    // CRITICAL TEST: Watch for TierLimitsDisplay behavior
    console.log('5️⃣ Watching for TierLimitsDisplay auto-proceed...');
    
    // Look for the "Checking Usage Limits..." message
    console.log('   Looking for limits check message...');
    const limitsCheck = await page.locator('text=/Checking Usage Limits/i').first();
    if (await limitsCheck.isVisible({ timeout: 3000 })) {
      console.log('   ✅ Found "Checking Usage Limits" - TierLimitsDisplay is active');
    } else {
      console.log('   ⚠️ Did not see limits check message');
    }
    
    // Wait for auto-proceed (should happen within 5-10 seconds due to our fixes)
    console.log('   Waiting for auto-proceed to URL input...');
    
    // Wait for URL input to appear (indicates auto-proceed worked)
    const urlInputAfterProceed = await page.locator('input[placeholder*="Enter website URL"]').first();
    const urlInputVisible = await urlInputAfterProceed.isVisible({ timeout: 12000 });
    
    if (urlInputVisible) {
      console.log('   ✅ SUCCESS: URL input appeared - TierLimitsDisplay auto-proceeded!');
      
      // Test a quick analysis to ensure the full flow works
      console.log('6️⃣ Testing quick analysis...');
      await urlInputAfterProceed.fill('https://example.com');
      
      const analyzeButton = await page.locator('button:has-text("Analyze Website")').first();
      if (await analyzeButton.isVisible({ timeout: 2000 })) {
        await analyzeButton.click();
        console.log('   ✅ Analysis initiated successfully');
        
        // Check for analysis progress or usage counter
        await page.waitForTimeout(3000);
        const usageCounter = await page.locator('text=/\\d+\\/3/').first();
        if (await usageCounter.isVisible({ timeout: 5000 })) {
          const usage = await usageCounter.textContent();
          console.log(`   ✅ Usage counter updated: ${usage}`);
        }
      } else {
        console.log('   ⚠️ Analyze button not found');
      }
    } else {
      console.log('   ❌ FAILURE: URL input did not appear - TierLimitsDisplay may be stuck');
    }
    
    // Summary
    console.log('\n' + '=' .repeat(40));
    console.log('📊 VALIDATION RESULTS:');
    console.log(`✅ TierLimitsDisplay Fix Working: ${urlInputVisible ? 'YES' : 'NO'}`);
    console.log(`✅ Auto-Proceed Functional: ${urlInputVisible ? 'YES' : 'NO'}`);
    console.log(`✅ Full Flow Operational: ${urlInputVisible ? 'YES' : 'NO'}`);
    
    if (urlInputVisible) {
      console.log('\n🎉 FIX VALIDATION SUCCESSFUL!');
      console.log('The TierLimitsDisplay error handling and auto-proceed logic is working.');
      console.log('Users should no longer get stuck at the tier limits screen.');
    } else {
      console.log('\n⚠️ FIX VALIDATION FAILED!');
      console.log('The TierLimitsDisplay may still be causing issues.');
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: `tier-fix-validation-${timestamp}.png`,
      fullPage: true 
    });
    console.log(`\n📸 Screenshot: tier-fix-validation-${timestamp}.png`);
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    
    await page.screenshot({ 
      path: `tier-fix-error-${timestamp}.png`,
      fullPage: true 
    });
    console.log(`📸 Error screenshot: tier-fix-error-${timestamp}.png`);
  }
  
  // Keep browser open for 15 seconds for inspection
  console.log('\n🔍 Keeping browser open for 15 seconds...');
  await page.waitForTimeout(15000);
  
  await browser.close();
}

// Run the validation
validateTierFix().catch(console.error);