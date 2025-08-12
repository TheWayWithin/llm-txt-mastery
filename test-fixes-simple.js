#!/usr/bin/env node

import { chromium } from 'playwright';

async function testLLMTxtMastery() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Generate unique test email
  const timestamp = Date.now();
  const email = `test${timestamp}@guerrillamail.com`;
  
  const testUrl = 'https://www.llmtxtmastery.com';
  console.log(`🧪 Testing ${testUrl}`);
  console.log(`📧 Using email: ${email}\n`);
  
  const results = {
    emailCapture: false,
    firstAnalysis: false,
    scrollToTop: false,
    secondAnalysis: false,
    thirdAnalysis: false,
    dailyLimitEnforced: false,
    usageCounter: false,
    pageLimit: false
  };
  
  try {
    // 1. Navigate to the site
    console.log('1️⃣ Navigating to LLM.txt Mastery...');
    await page.goto(testUrl);
    await page.waitForTimeout(3000);
    
    // 2. Click Get Started
    console.log('2️⃣ Testing email capture flow...');
    const getStartedButton = page.getByRole('button', { name: /get started/i }).first();
    await getStartedButton.click();
    await page.waitForTimeout(2000);
    
    // 3. Enter email
    await page.fill('input[type="email"]', email);
    await page.waitForTimeout(1000);
    
    // 4. Click Quick Start
    const quickStartButton = page.getByRole('button', { name: /quick start|continue without|no password/i }).first();
    if (await quickStartButton.isVisible()) {
      await quickStartButton.click();
      results.emailCapture = true;
      console.log('   ✅ Email capture successful\n');
    }
    await page.waitForTimeout(3000);
    
    // 5. First Analysis
    console.log('3️⃣ Testing FIRST analysis (1/3)...');
    const analysis1 = await performAnalysis(page, 'https://example.com');
    results.firstAnalysis = analysis1.success;
    results.pageLimit = analysis1.pageCount <= 20;
    console.log(`   ${analysis1.success ? '✅' : '❌'} Analysis completed`);
    console.log(`   📄 Pages: ${analysis1.pageCount} ${analysis1.pageCount <= 20 ? '✅' : '❌'}\n`);
    
    // 6. Test scrolling
    console.log('4️⃣ Testing "Analyze Another Website" scrolling...');
    await page.waitForTimeout(2000);
    
    // Scroll down first to test the scroll-to-top
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    const scrollBefore = await page.evaluate(() => window.scrollY);
    console.log(`   Scroll before: ${scrollBefore}px`);
    
    const analyzeAnotherButton = page.getByRole('button', { name: /analyze another website/i }).first();
    await analyzeAnotherButton.click();
    await page.waitForTimeout(2000);
    
    const scrollAfter = await page.evaluate(() => window.scrollY);
    console.log(`   Scroll after: ${scrollAfter}px`);
    results.scrollToTop = scrollAfter < 100;
    console.log(`   ${results.scrollToTop ? '✅ Scrolled to top' : '❌ Did not scroll to top'}\n`);
    
    // 7. Second Analysis
    console.log('5️⃣ Testing SECOND analysis (2/3)...');
    const analysis2 = await performAnalysis(page, 'https://github.com');
    results.secondAnalysis = analysis2.success;
    console.log(`   ${analysis2.success ? '✅' : '❌'} Analysis completed\n`);
    
    // 8. Third Analysis
    console.log('6️⃣ Testing THIRD analysis (3/3)...');
    await analyzeAnotherButton.click();
    await page.waitForTimeout(1000);
    const analysis3 = await performAnalysis(page, 'https://docs.python.org');
    results.thirdAnalysis = analysis3.success;
    console.log(`   ${analysis3.success ? '✅' : '❌'} Analysis completed\n`);
    
    // 9. Fourth Analysis (should be blocked)
    console.log('7️⃣ Testing FOURTH analysis (should be BLOCKED)...');
    await analyzeAnotherButton.click();
    await page.waitForTimeout(1000);
    
    await page.fill('input[placeholder*="website"]', 'https://www.npmjs.com');
    const analyzeButton = page.getByRole('button', { name: /analyze website/i }).first();
    await analyzeButton.click();
    await page.waitForTimeout(3000);
    
    // Check for limit message
    const limitIndicators = [
      page.locator('text=/daily limit/i'),
      page.locator('text=/used your 3 free/i'),
      page.locator('text=/limit reached/i'),
      page.locator('text=/You\'ve used all/i')
    ];
    
    for (const indicator of limitIndicators) {
      if (await indicator.isVisible({ timeout: 3000 }).catch(() => false)) {
        results.dailyLimitEnforced = true;
        const text = await indicator.textContent();
        console.log(`   ✅ Daily limit enforced: "${text.substring(0, 50)}..."\n`);
        break;
      }
    }
    
    if (!results.dailyLimitEnforced) {
      // Check if analysis started (which would be wrong)
      const analysisStarted = await page.locator('text=/analyzing|discovering|processing/i').isVisible({ timeout: 3000 }).catch(() => false);
      if (analysisStarted) {
        console.log('   ❌ Daily limit NOT enforced (4th analysis started)\n');
      } else {
        console.log('   ⚠️ Could not determine if limit was enforced\n');
      }
    }
    
    // 10. Check usage counter
    console.log('8️⃣ Checking usage counter...');
    const usagePatterns = [
      page.locator('text=/3\\s*\\/\\s*3/'),
      page.locator('text=/Daily.*3.*3/i'),
      page.locator('text=/analyses.*3.*3/i')
    ];
    
    for (const pattern of usagePatterns) {
      if (await pattern.isVisible({ timeout: 3000 }).catch(() => false)) {
        results.usageCounter = true;
        const text = await pattern.textContent();
        console.log(`   ✅ Usage counter found: "${text}"\n`);
        break;
      }
    }
    
    if (!results.usageCounter) {
      console.log('   ❌ Usage counter not found\n');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS SUMMARY:');
    console.log('='.repeat(50));
    
    let passed = 0;
    let failed = 0;
    
    for (const [test, result] of Object.entries(results)) {
      const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`${result ? '✅' : '❌'} ${testName}`);
      if (result) passed++; else failed++;
    }
    
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passed}/${passed + failed}`);
    console.log(`❌ Failed: ${failed}/${passed + failed}`);
    console.log('='.repeat(50));
    
    await page.waitForTimeout(5000); // Keep browser open to see results
    await browser.close();
  }
}

async function performAnalysis(page, url) {
  try {
    // Enter URL
    const urlInput = page.locator('input[placeholder*="website"], input[placeholder*="URL"], input[type="url"]').first();
    await urlInput.fill(url);
    await page.waitForTimeout(1000);
    
    // Click Analyze
    const analyzeButton = page.getByRole('button', { name: /analyze website/i }).first();
    await analyzeButton.click();
    
    // Wait for analysis to complete
    await page.waitForTimeout(5000);
    
    // Check if analysis completed
    const successIndicators = [
      page.locator('text=/review.*select/i'),
      page.locator('text=/pages.*discovered/i'),
      page.locator('text=/Generate.*LLM/i')
    ];
    
    for (const indicator of successIndicators) {
      if (await indicator.isVisible({ timeout: 20000 }).catch(() => false)) {
        // Try to get page count
        const pageCountText = await page.locator('text=/\\d+\\s*pages?/i').first().textContent().catch(() => '0 pages');
        const match = pageCountText.match(/(\d+)\s*pages?/i);
        const pageCount = match ? parseInt(match[1]) : 0;
        
        return { success: true, pageCount };
      }
    }
    
    // Check if blocked by limit
    const limitError = await page.locator('text=/limit|exceeded/i').isVisible({ timeout: 2000 }).catch(() => false);
    if (limitError) {
      return { success: false, pageCount: 0, reason: 'limit' };
    }
    
    return { success: false, pageCount: 0 };
    
  } catch (error) {
    console.error('   Analysis error:', error.message);
    return { success: false, pageCount: 0 };
  }
}

// Run the test
testLLMTxtMastery().catch(console.error);