import { chromium } from 'playwright';

async function testUserFlows() {
  console.log('🚀 Starting User Flow Tests...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  try {
    // TEST 1: Free Tier Flow
    console.log('📋 TEST 1: Free Tier Flow');
    console.log('Testing with email: hqqjrihrswklhynsby@enotj.com\n');
    
    await page.goto('https://www.llmtxtmastery.com');
    await page.waitForLoadState('networkidle');
    console.log('✅ Loaded homepage');
    
    // Scroll down to the URL input section
    await page.evaluate(() => {
      document.querySelector('input[placeholder*="example.com"]')?.scrollIntoView();
    });
    
    // Enter a test URL - using the actual placeholder text
    const testUrl = 'https://example.com';
    await page.fill('input[placeholder*="example.com"]', testUrl);
    console.log(`✅ Entered URL: ${testUrl}`);
    
    // Click analyze button
    await page.click('button:has-text("Analyze Website")');
    console.log('✅ Clicked Analyze button');
    
    // Wait for navigation or modal
    await page.waitForTimeout(2000);
    
    // Check if we see tier selection
    const hasTierSelection = await page.locator('text=/Choose Your Tier/i').count() > 0;
    if (hasTierSelection) {
      console.log('✅ Tier selection displayed');
      
      // Look for FREE tier option
      const freeButton = page.locator('button:has-text("Select FREE")').first();
      if (await freeButton.count() > 0) {
        await freeButton.click();
        console.log('✅ Selected FREE tier');
      } else {
        // Try alternative selector
        await page.click('text=/FREE.*Select/i');
        console.log('✅ Selected FREE tier (alt)');
      }
    }
    
    // Wait for email input
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'hqqjrihrswklhynsby@enotj.com');
    console.log('✅ Entered free tier test email');
    
    // Look for continue/submit button
    const continueButton = page.locator('button:has-text("Continue")').first();
    const quickStartButton = page.locator('button:has-text("Quick Start")').first();
    const getStartedButton = page.locator('button:has-text("Get Started")').first();
    
    if (await quickStartButton.count() > 0) {
      await quickStartButton.click();
      console.log('✅ Clicked Quick Start');
    } else if (await continueButton.count() > 0) {
      await continueButton.click();
      console.log('✅ Clicked Continue');
    } else if (await getStartedButton.count() > 0) {
      await getStartedButton.click();
      console.log('✅ Clicked Get Started');
    } else {
      // Try to find any submit button
      await page.click('button[type="submit"]');
      console.log('✅ Clicked Submit');
    }
    
    // Wait for analysis to start
    await page.waitForSelector('text=/Analyzing|Processing|Discovering|Fetching/i', { timeout: 15000 });
    console.log('✅ Analysis started');
    
    // Wait for analysis to complete (with timeout)
    const analysisComplete = await page.waitForSelector('text=/Review|Complete|Select|found/i', { 
      timeout: 60000 // 1 minute timeout for analysis
    }).catch(() => null);
    
    if (analysisComplete) {
      console.log('✅ Analysis completed');
    }
    
    // Check usage display
    const usageText = await page.locator('text=/1.*of.*1|1\/1|Daily limit/').textContent().catch(() => null);
    if (usageText) {
      console.log(`✅ Usage tracking shows: ${usageText}`);
    }
    
    // Take a screenshot of the result
    await page.screenshot({ 
      path: 'test-free-tier-result.png',
      fullPage: true 
    });
    console.log('📸 Free tier test screenshot saved');
    
    console.log('\n-------------------\n');
    
    // TEST 2: Coffee Tier Recognition
    console.log('📋 TEST 2: Coffee Tier Recognition');
    console.log('Testing with email: jamie.watters.mail@icloud.com\n');
    
    // Navigate back to home
    await page.goto('https://www.llmtxtmastery.com');
    await page.waitForLoadState('networkidle');
    console.log('✅ Back at homepage');
    
    // Scroll to URL input
    await page.evaluate(() => {
      document.querySelector('input[placeholder*="example.com"]')?.scrollIntoView();
    });
    
    // Enter URL again
    await page.fill('input[placeholder*="example.com"]', 'https://google.com');
    console.log('✅ Entered URL: https://google.com');
    
    // Click analyze
    await page.click('button:has-text("Analyze Website")');
    console.log('✅ Clicked Analyze button');
    
    // Wait for tier selection or email
    await page.waitForTimeout(2000);
    
    // Check if tier selection appears
    const hasTierSelection2 = await page.locator('text=/Choose Your Tier/i').count() > 0;
    if (hasTierSelection2) {
      console.log('✅ Tier selection displayed');
      
      // First select FREE tier to enter email
      const freeButton = page.locator('button:has-text("Select FREE")').first();
      if (await freeButton.count() > 0) {
        await freeButton.click();
        console.log('✅ Selected FREE tier to enter email');
      }
    }
    
    // Enter Coffee tier email
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'jamie.watters.mail@icloud.com');
    console.log('✅ Entered Coffee tier email');
    
    // Continue
    const continueButton2 = page.locator('button:has-text("Continue")').first();
    const quickStartButton2 = page.locator('button:has-text("Quick Start")').first();
    const getStartedButton2 = page.locator('button:has-text("Get Started")').first();
    
    if (await quickStartButton2.count() > 0) {
      await quickStartButton2.click();
      console.log('✅ Clicked Quick Start');
    } else if (await continueButton2.count() > 0) {
      await continueButton2.click();
      console.log('✅ Clicked Continue');
    } else if (await getStartedButton2.count() > 0) {
      await getStartedButton2.click();
      console.log('✅ Clicked Get Started');
    }
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Check for Coffee tier indicators
    const hasCoffeeBadge = await page.locator('text=/Coffee|Unlimited/i').count() > 0;
    const inAnalysis = await page.locator('text=/Analyzing|Processing/i').count() > 0;
    
    if (hasCoffeeBadge) {
      console.log('✅ Coffee tier recognized - badge displayed');
    }
    if (inAnalysis) {
      console.log('✅ Coffee tier recognized - proceeded to analysis');
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-coffee-tier-result.png',
      fullPage: true 
    });
    console.log('📸 Coffee tier test screenshot saved');
    
    // Check if analysis started or tier status shown
    const tierStatus = await page.locator('text=/Coffee|Unlimited daily analyses/i').first().textContent().catch(() => null);
    if (tierStatus) {
      console.log(`✅ Tier status: ${tierStatus}`);
    }
    
    console.log('\n-------------------\n');
    
    // TEST 3: Second Email Test
    console.log('📋 TEST 3: Second Free Tier Email');
    console.log('Testing with email: zxydxwuchiymwlamqa@xfavaj.com\n');
    
    // Navigate back to home
    await page.goto('https://www.llmtxtmastery.com');
    await page.waitForLoadState('networkidle');
    console.log('✅ Back at homepage');
    
    // Scroll to URL input
    await page.evaluate(() => {
      document.querySelector('input[placeholder*="example.com"]')?.scrollIntoView();
    });
    
    // Enter URL
    await page.fill('input[placeholder*="example.com"]', 'https://github.com');
    console.log('✅ Entered URL: https://github.com');
    
    // Click analyze
    await page.click('button:has-text("Analyze Website")');
    console.log('✅ Clicked Analyze button');
    
    // Wait and check for tier selection
    await page.waitForTimeout(2000);
    
    const hasTierSelection3 = await page.locator('text=/Choose Your Tier/i').count() > 0;
    if (hasTierSelection3) {
      console.log('✅ Tier selection displayed');
      const freeButton = page.locator('button:has-text("Select FREE")').first();
      if (await freeButton.count() > 0) {
        await freeButton.click();
        console.log('✅ Selected FREE tier');
      }
    }
    
    // Enter second test email
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'zxydxwuchiymwlamqa@xfavaj.com');
    console.log('✅ Entered second test email');
    
    // Continue
    const continueButton3 = page.locator('button:has-text("Continue")').first();
    const quickStartButton3 = page.locator('button:has-text("Quick Start")').first();
    
    if (await quickStartButton3.count() > 0) {
      await quickStartButton3.click();
      console.log('✅ Clicked Quick Start');
    } else if (await continueButton3.count() > 0) {
      await continueButton3.click();
      console.log('✅ Clicked Continue');
    }
    
    // Wait for result
    await page.waitForTimeout(5000);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-second-email-result.png',
      fullPage: true 
    });
    console.log('📸 Second email test screenshot saved');
    
    console.log('\n✨ All User Flow Tests Completed!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take screenshot on failure
    await page.screenshot({ 
      path: 'test-failure-screenshot.png',
      fullPage: true 
    });
    console.log('📸 Error screenshot saved as test-failure-screenshot.png');
  } finally {
    await browser.close();
    console.log('🏁 Browser closed');
  }
}

// Run the tests
testUserFlows().catch(console.error);