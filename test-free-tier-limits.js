import { chromium } from 'playwright';

/**
 * Comprehensive test for free tier flow:
 * 1. New user email capture
 * 2. Free tier selection
 * 3. Run 3 analyses (daily limit)
 * 4. Verify upgrade prompt on 4th attempt
 */

async function testFreeTierLimits() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down for visibility
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Generate unique test email
  const timestamp = Date.now();
  const testEmail = `free-tier-test-${timestamp}@tempmail.org`;
  
  console.log('🧪 Starting Free Tier Limit Test');
  console.log(`📧 Test Email: ${testEmail}`);
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Navigate to the site
    console.log('\n1️⃣ Navigating to site...');
    await page.goto('https://www.llmtxtmastery.com');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Click Get Started
    console.log('2️⃣ Clicking Get Started...');
    const getStartedButton = await page.locator('button:has-text("Get Started")').first();
    await getStartedButton.click();
    
    // Step 3: Enter email
    console.log(`3️⃣ Entering email: ${testEmail}`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', testEmail);
    
    // Step 4: Select Free tier (Quick Start)
    console.log('4️⃣ Selecting Free tier...');
    
    // Wait for tier selection to appear
    await page.waitForTimeout(2000);
    
    // Try multiple selectors for Quick Start / Free tier
    const tierSelectors = [
      'button:has-text("Quick Start")',
      'button:has-text("Continue without password")',
      'button:has-text("Start Free")',
      '[data-tier="starter"]',
      'button:has-text("Get Started Free")'
    ];
    
    let tierSelected = false;
    for (const selector of tierSelectors) {
      try {
        const button = await page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          console.log(`   Found button: "${await button.textContent()}"`);
          await button.click();
          tierSelected = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!tierSelected) {
      console.log('   ⚠️ Could not find tier selection button, checking if already on URL input...');
      // Check if we're already on the URL input page
      const urlInput = await page.locator('input[placeholder*="Enter website URL"]').first();
      if (!await urlInput.isVisible({ timeout: 2000 })) {
        throw new Error('Could not select tier or find URL input');
      }
    }
    
    // Track analyses
    const analyses = [];
    
    // Step 5: Run 3 analyses (should succeed)
    for (let i = 1; i <= 3; i++) {
      console.log(`\n📊 Analysis ${i}/3:`);
      
      // Wait for URL input
      const urlInputSelectors = [
        'input[placeholder*="Enter website URL"]',
        'input[placeholder*="website URL"]',
        'input[type="url"]',
        'input[name="url"]'
      ];
      
      let urlInput = null;
      for (const selector of urlInputSelectors) {
        const input = await page.locator(selector).first();
        if (await input.isVisible({ timeout: 2000 })) {
          urlInput = input;
          break;
        }
      }
      
      if (!urlInput) {
        throw new Error('Could not find URL input field');
      }
      
      // Enter URL
      const testUrl = `https://example${i}.com`;
      console.log(`   Entering URL: ${testUrl}`);
      await urlInput.fill(testUrl);
      
      // Click Analyze
      const analyzeButton = await page.locator('button:has-text("Analyze Website")').first();
      await analyzeButton.click();
      
      // Wait for analysis to start
      console.log('   Waiting for analysis...');
      
      // Check for usage counter update
      const usageText = await page.locator('text=/\\d+\\/3/').first();
      if (await usageText.isVisible({ timeout: 5000 })) {
        const usage = await usageText.textContent();
        console.log(`   ✅ Usage updated: ${usage}`);
        analyses.push({ url: testUrl, usage, status: 'success' });
      }
      
      // Check if we see analysis progress or completion
      try {
        // Wait for either progress indicator or completion
        await Promise.race([
          page.waitForSelector('text=/Analyzing/i', { timeout: 10000 }),
          page.waitForSelector('text=/Analysis complete/i', { timeout: 10000 }),
          page.waitForSelector('text=/discovered.*pages/i', { timeout: 10000 })
        ]);
        console.log('   ✅ Analysis started successfully');
      } catch (e) {
        console.log('   ⚠️ Could not confirm analysis started');
      }
      
      // For analyses 1-2, look for "Analyze Another Website" button
      if (i < 3) {
        console.log('   Looking for "Analyze Another Website" button...');
        
        // Wait a bit for the page to update
        await page.waitForTimeout(3000);
        
        // Try multiple selectors
        const analyzeAnotherSelectors = [
          'button:has-text("Analyze Another Website")',
          'button:has-text("Analyze another website")',
          'button:has-text("Start New Analysis")',
          'a:has-text("Analyze Another")'
        ];
        
        let clicked = false;
        for (const selector of analyzeAnotherSelectors) {
          const button = await page.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            await button.click();
            console.log(`   ✅ Clicked "${await button.textContent()}"`);
            clicked = true;
            break;
          }
        }
        
        if (!clicked) {
          console.log('   ⚠️ Could not find "Analyze Another" button, continuing...');
          // Try to navigate back to home
          await page.goto('https://www.llmtxtmastery.com');
        }
      }
    }
    
    // Step 6: Try 4th analysis (should be blocked)
    console.log('\n🚫 Attempting 4th analysis (should be blocked)...');
    
    // Make sure we're on a page where we can start analysis
    const urlInput = await page.locator('input[placeholder*="Enter website URL"]').first();
    if (!await urlInput.isVisible({ timeout: 2000 })) {
      // Navigate to start new analysis
      await page.goto('https://www.llmtxtmastery.com');
      await page.locator('button:has-text("Get Started")').first().click();
    }
    
    // Try to enter 4th URL
    await page.waitForSelector('input[placeholder*="Enter website URL"]', { timeout: 10000 });
    await page.fill('input[placeholder*="Enter website URL"]', 'https://example4.com');
    
    // Try to analyze
    const analyzeButton = await page.locator('button:has-text("Analyze Website")').first();
    await analyzeButton.click();
    
    // Check for limit reached message
    console.log('📋 Checking for upgrade prompt...');
    
    const limitMessages = [
      'Daily limit reached',
      'limit reached',
      'Upgrade to continue',
      'Buy me a coffee',
      'reached your daily limit',
      'No analyses remaining'
    ];
    
    let limitReached = false;
    for (const message of limitMessages) {
      const element = await page.locator(`text=/${message}/i`).first();
      if (await element.isVisible({ timeout: 5000 })) {
        console.log(`✅ Limit message found: "${await element.textContent()}"`);
        limitReached = true;
        break;
      }
    }
    
    // Check for upgrade/payment buttons
    const upgradeButtons = [
      'button:has-text("Buy me a coffee")',
      'button:has-text("Upgrade")',
      'button:has-text("Get Coffee Tier")',
      'a[href*="stripe"]'
    ];
    
    let upgradeFound = false;
    for (const selector of upgradeButtons) {
      const button = await page.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 })) {
        console.log(`✅ Upgrade button found: "${await button.textContent()}"`);
        upgradeFound = true;
        
        // Check if it's a Stripe checkout link
        const href = await button.getAttribute('href');
        if (href && href.includes('stripe')) {
          console.log(`   🔗 Stripe URL: ${href}`);
        }
        break;
      }
    }
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST SUMMARY:');
    console.log(`Email: ${testEmail}`);
    console.log(`Analyses completed: ${analyses.length}`);
    analyses.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.url} - ${a.usage}`);
    });
    console.log(`Daily limit enforced: ${limitReached ? '✅ YES' : '❌ NO'}`);
    console.log(`Upgrade prompt shown: ${upgradeFound ? '✅ YES' : '❌ NO'}`);
    
    if (limitReached && upgradeFound) {
      console.log('\n✅ FREE TIER LIMITS WORKING CORRECTLY!');
      console.log('Users are blocked after 3 analyses and shown upgrade options.');
    } else {
      console.log('\n⚠️ ISSUES DETECTED:');
      if (!limitReached) console.log('- Daily limit not enforced');
      if (!upgradeFound) console.log('- Upgrade prompt not shown');
    }
    
    // Take screenshot of final state
    await page.screenshot({ 
      path: `free-tier-test-${timestamp}.png`,
      fullPage: true 
    });
    console.log(`\n📸 Screenshot saved: free-tier-test-${timestamp}.png`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take error screenshot
    await page.screenshot({ 
      path: `free-tier-error-${timestamp}.png`,
      fullPage: true 
    });
    console.log(`📸 Error screenshot: free-tier-error-${timestamp}.png`);
  }
  
  // Keep browser open for inspection
  console.log('\n🔍 Browser will stay open for 30 seconds for inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
}

// Run the test
testFreeTierLimits().catch(console.error);