#!/usr/bin/env node

import { chromium } from 'playwright';

async function getTemporaryEmail() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('📧 Getting temporary email from 10minutemail...');
  await page.goto('https://10minutemail.com');
  await page.waitForTimeout(3000);

  // Get the email address
  const email = (await page.inputValue('#mail')) || (await page.inputValue('input[type="email"]'));
  console.log(`✅ Got temporary email: ${email}`);

  return { page, browser, context, email };
}

async function testLLMTxtMastery(email, emailPage) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const testUrl = 'https://www.llmtxtmastery.com';
  console.log(`\n🧪 Testing ${testUrl} with email: ${email}`);

  try {
    // 1. Navigate to the site
    console.log('\n1️⃣ Navigating to LLM.txt Mastery...');
    await page.goto(testUrl);
    await page.waitForTimeout(2000);

    // 2. Click Get Started
    console.log('2️⃣ Clicking Get Started...');
    const getStartedButton = page.getByRole('button', { name: /get started/i }).first();
    await getStartedButton.click();
    await page.waitForTimeout(2000);

    // 3. Enter email
    console.log('3️⃣ Entering email address...');
    await page.fill('input[type="email"]', email);
    await page.waitForTimeout(1000);

    // 4. Select Free tier
    console.log('4️⃣ Selecting Free tier...');
    const freeTierButton = page
      .locator('button')
      .filter({ hasText: /free.*starter/i })
      .first();
    if (await freeTierButton.isVisible()) {
      await freeTierButton.click();
    }
    await page.waitForTimeout(1000);

    // 5. Click Quick Start (no password)
    console.log('5️⃣ Clicking Quick Start...');
    const quickStartButton = page.getByRole('button', { name: /quick start/i }).first();
    await quickStartButton.click();
    await page.waitForTimeout(3000);

    // 6. Test First Analysis
    console.log('\n📊 TEST 1: First Analysis (should work)');
    await testAnalysis(page, 'https://example.com', 1);

    // 7. Test "Analyze Another Website" scrolling
    console.log('\n📊 TEST 2: Testing "Analyze Another Website" button scrolling...');
    const analyzeAnotherButton = page
      .getByRole('button', { name: /analyze another website/i })
      .first();

    // Record scroll position before clicking
    const scrollBefore = await page.evaluate(() => window.scrollY);
    console.log(`   Scroll position before: ${scrollBefore}px`);

    await analyzeAnotherButton.click();
    await page.waitForTimeout(2000);

    // Check scroll position after clicking
    const scrollAfter = await page.evaluate(() => window.scrollY);
    console.log(`   Scroll position after: ${scrollAfter}px`);

    if (scrollAfter < 100) {
      console.log('   ✅ PASS: Page scrolled to top correctly!');
    } else {
      console.log('   ❌ FAIL: Page did not scroll to top (still at ' + scrollAfter + 'px)');
    }

    // 8. Test Second Analysis
    console.log('\n📊 TEST 3: Second Analysis (should work, 2/3)');
    await testAnalysis(page, 'https://github.com', 2);

    // 9. Test Third Analysis
    console.log('\n📊 TEST 4: Third Analysis (should work, 3/3)');
    await analyzeAnotherButton.click();
    await page.waitForTimeout(1000);
    await testAnalysis(page, 'https://docs.python.org', 3);

    // 10. Test Fourth Analysis (should be blocked)
    console.log('\n📊 TEST 5: Fourth Analysis (should be BLOCKED)');
    await analyzeAnotherButton.click();
    await page.waitForTimeout(1000);

    // Try to analyze
    await page.fill('input[placeholder*="website"]', 'https://www.npmjs.com');
    const analyzeButton = page.getByRole('button', { name: /analyze website/i }).first();
    await analyzeButton.click();
    await page.waitForTimeout(3000);

    // Check for daily limit modal or error
    const limitModal = page.locator('text=/daily limit|used your 3 free|limit reached/i');
    const errorMessage = page.locator('text=/limit|exceeded|not allowed/i');

    if ((await limitModal.isVisible()) || (await errorMessage.isVisible())) {
      console.log('   ✅ PASS: Daily limit correctly enforced! (blocked 4th analysis)');
      const message = (await limitModal.textContent()) || (await errorMessage.textContent());
      console.log(`   Message: ${message.substring(0, 100)}...`);
    } else {
      console.log('   ❌ FAIL: Daily limit NOT enforced (4th analysis was allowed)');
    }

    // 11. Check usage display
    console.log('\n📊 TEST 6: Checking usage counter...');
    const usageDisplay = page.locator('text=/\\d+\\s*\\/\\s*3/');
    if (await usageDisplay.isVisible()) {
      const usageText = await usageDisplay.textContent();
      console.log(`   ✅ Usage display found: ${usageText}`);

      if (usageText.includes('3/3') || usageText.includes('3 / 3')) {
        console.log('   ✅ PASS: Usage counter shows 3/3 correctly!');
      } else {
        console.log(`   ⚠️ WARNING: Usage counter shows ${usageText} instead of 3/3`);
      }
    } else {
      console.log('   ❌ FAIL: Usage counter not visible');
    }

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

async function testAnalysis(page, url, analysisNumber) {
  console.log(`   Testing analysis #${analysisNumber} with ${url}...`);

  // Enter URL
  await page.fill('input[placeholder*="website"]', url);
  await page.waitForTimeout(1000);

  // Click Analyze
  const analyzeButton = page.getByRole('button', { name: /analyze website/i }).first();
  await analyzeButton.click();

  // Wait for analysis to start
  await page.waitForTimeout(3000);

  // Check for tier limits display (should appear briefly)
  const tierLimits = page.locator('text=/starter tier|20 pages|HTML extraction/i');
  if (await tierLimits.isVisible({ timeout: 5000 })) {
    console.log('   ✅ Tier limits displayed');
  }

  // Wait for analysis to complete (timeout after 30s)
  console.log('   ⏳ Waiting for analysis to complete...');
  const reviewSection = page.locator('text=/review.*select|pages.*discovered/i');
  const errorMessage = page.locator('text=/error|failed|limit/i');

  try {
    await reviewSection.waitFor({ timeout: 30000 });
    console.log('   ✅ Analysis completed successfully!');

    // Check page count
    const pageCount = page.locator('text=/\\d+\\s*pages?\\s*(discovered|analyzed)/i');
    if (await pageCount.isVisible()) {
      const pageText = await pageCount.textContent();
      console.log(`   📄 Pages analyzed: ${pageText}`);

      // Extract number
      const match = pageText.match(/(\d+)\s*pages?/i);
      if (match) {
        const count = parseInt(match[1]);
        if (count <= 20) {
          console.log(`   ✅ Page limit working: ${count} pages (max 20 for starter)`);
        } else {
          console.log(`   ❌ Page limit exceeded: ${count} pages (should be max 20)`);
        }
      }
    }
  } catch (e) {
    if (await errorMessage.isVisible()) {
      const error = await errorMessage.textContent();
      console.log(`   ❌ Analysis failed: ${error}`);

      // Check if it's a daily limit error
      if (error.toLowerCase().includes('limit') && analysisNumber > 3) {
        console.log('   ✅ This is expected (daily limit reached)');
      }
    } else {
      console.log('   ❌ Analysis timed out or failed');
    }
  }
}

async function runTests() {
  console.log('🚀 Starting LLM.txt Mastery comprehensive test suite');
  console.log('================================================\n');

  let emailBrowser = null;
  let email = null;
  let emailPage = null;

  try {
    // Get temporary email
    const emailSetup = await getTemporaryEmail();
    emailBrowser = emailSetup.browser;
    emailPage = emailSetup.page;
    email = emailSetup.email;

    // Run tests
    await testLLMTxtMastery(email, emailPage);

    // Check for verification email
    console.log('\n📬 Checking for verification email...');
    await emailPage.bringToFront();
    await emailPage.reload();
    await emailPage.waitForTimeout(5000);

    const emailLink = emailPage.locator('a[href*="verify-email"]').first();
    if (await emailLink.isVisible()) {
      console.log('✅ Verification email received!');

      // Click the verification link
      await emailLink.click();
      await emailPage.waitForTimeout(5000);

      // Check if email was verified
      const verifiedMessage = emailPage.locator('text=/verified|success/i');
      if (await verifiedMessage.isVisible()) {
        console.log('✅ Email verified successfully!');
      }
    } else {
      console.log('⚠️ No verification email received (this is okay for quick start)');
    }
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    // Clean up
    if (emailBrowser) {
      await emailBrowser.close();
    }
  }

  console.log('\n================================================');
  console.log('🏁 Test suite completed!');
}

// Run the tests
runTests().catch(console.error);
