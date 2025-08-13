#!/usr/bin/env node

import { chromium } from 'playwright';

async function testAllFixes() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down for visibility
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Generate unique test email
  const timestamp = Date.now();
  const testEmail = `playwright-test-${timestamp}@guerrillamail.com`;
  
  console.log('🧪 COMPREHENSIVE FIX TESTING');
  console.log('📧 Test Email:', testEmail);
  console.log('🌐 Site: https://www.llmtxtmastery.com\n');
  console.log('=' .repeat(60));
  
  const results = {
    emailCapture: false,
    usageTracking: { first: false, second: false, third: false },
    dailyLimit: false,
    pageCount: false,
    scrollPosition: false,
    bannerDismiss: false
  };
  
  try {
    // ============================================
    // SETUP: Navigate and capture email
    // ============================================
    console.log('\n📝 SETUP: Email Capture');
    console.log('-'.repeat(40));
    
    await page.goto('https://www.llmtxtmastery.com');
    await page.waitForTimeout(2000);
    
    // Click Get Started
    const getStartedButton = page.getByRole('button', { name: /get started/i }).first();
    await getStartedButton.click();
    await page.waitForTimeout(1000);
    
    // Enter email
    await page.fill('input[type="email"]', testEmail);
    console.log('   ✓ Email entered:', testEmail);
    
    // Click Quick Start
    const quickStartButton = page.getByRole('button', { name: /quick start|continue without/i }).first();
    if (await quickStartButton.isVisible()) {
      await quickStartButton.click();
      results.emailCapture = true;
      console.log('   ✅ Email captured successfully');
    }
    await page.waitForTimeout(2000);
    
    // ============================================
    // TEST 1: Usage Tracking (0/3 → 1/3 → 2/3 → 3/3)
    // ============================================
    console.log('\n🔢 TEST 1: Usage Tracking');
    console.log('-'.repeat(40));
    
    // Helper function to get usage count
    async function getUsageCount() {
      const usageTexts = [
        page.locator('text=/\\d+\\s*\\/\\s*3/'),
        page.locator('text=/Daily.*analyses.*\\d+.*3/i')
      ];
      
      for (const locator of usageTexts) {
        if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
          const text = await locator.textContent();
          const match = text.match(/(\d+)\s*\/\s*3/);
          return match ? parseInt(match[1]) : null;
        }
      }
      return null;
    }
    
    // First Analysis
    console.log('\n   Analysis #1:');
    let initialUsage = await getUsageCount();
    console.log(`   Before: ${initialUsage !== null ? initialUsage + '/3' : 'not visible'}`);
    
    await page.fill('input[placeholder*="website"], input[type="url"]', 'https://example.com');
    await page.getByRole('button', { name: /analyze website/i }).first().click();
    
    // Wait for analysis to complete
    await page.waitForSelector('text=/review.*select|pages.*discovered/i', { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    let afterUsage = await getUsageCount();
    console.log(`   After: ${afterUsage !== null ? afterUsage + '/3' : 'not visible'}`);
    results.usageTracking.first = (afterUsage === 1);
    console.log(`   ${results.usageTracking.first ? '✅ PASS' : '❌ FAIL'}: Usage tracking for first analysis`);
    
    // Second Analysis
    console.log('\n   Analysis #2:');
    await page.getByRole('button', { name: /analyze another website/i }).first().click();
    await page.waitForTimeout(1000);
    
    await page.fill('input[placeholder*="website"], input[type="url"]', 'https://github.com');
    await page.getByRole('button', { name: /analyze website/i }).first().click();
    
    await page.waitForSelector('text=/review.*select|pages.*discovered/i', { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    afterUsage = await getUsageCount();
    console.log(`   After: ${afterUsage !== null ? afterUsage + '/3' : 'not visible'}`);
    results.usageTracking.second = (afterUsage === 2);
    console.log(`   ${results.usageTracking.second ? '✅ PASS' : '❌ FAIL'}: Usage tracking for second analysis`);
    
    // Third Analysis
    console.log('\n   Analysis #3:');
    await page.getByRole('button', { name: /analyze another website/i }).first().click();
    await page.waitForTimeout(1000);
    
    await page.fill('input[placeholder*="website"], input[type="url"]', 'https://docs.python.org');
    await page.getByRole('button', { name: /analyze website/i }).first().click();
    
    await page.waitForSelector('text=/review.*select|pages.*discovered/i', { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    afterUsage = await getUsageCount();
    console.log(`   After: ${afterUsage !== null ? afterUsage + '/3' : 'not visible'}`);
    results.usageTracking.third = (afterUsage === 3);
    console.log(`   ${results.usageTracking.third ? '✅ PASS' : '❌ FAIL'}: Usage tracking for third analysis`);
    
    // ============================================
    // TEST 2: Daily Limit Enforcement (4th should be blocked)
    // ============================================
    console.log('\n🚫 TEST 2: Daily Limit Enforcement');
    console.log('-'.repeat(40));
    
    await page.getByRole('button', { name: /analyze another website/i }).first().click();
    await page.waitForTimeout(1000);
    
    await page.fill('input[placeholder*="website"], input[type="url"]', 'https://npmjs.com');
    await page.getByRole('button', { name: /analyze website/i }).first().click();
    await page.waitForTimeout(3000);
    
    // Check for limit message
    const limitIndicators = [
      page.locator('text=/daily limit/i'),
      page.locator('text=/limit reached/i'),
      page.locator('text=/used.*3.*free/i'),
      page.locator('text=/maximum.*analyses/i')
    ];
    
    let limitBlocked = false;
    for (const indicator of limitIndicators) {
      if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        limitBlocked = true;
        const text = await indicator.textContent();
        console.log(`   ✅ PASS: Daily limit enforced`);
        console.log(`   Message: "${text.substring(0, 60)}..."`);
        break;
      }
    }
    
    if (!limitBlocked) {
      // Check if analysis started (which would be wrong)
      const analysisStarted = await page.locator('text=/analyzing|discovering/i').isVisible({ timeout: 2000 }).catch(() => false);
      if (analysisStarted) {
        console.log('   ❌ FAIL: 4th analysis was allowed (should be blocked)');
      } else {
        console.log('   ⚠️ UNCLEAR: Could not determine if limit was enforced');
      }
    }
    results.dailyLimit = limitBlocked;
    
    // ============================================
    // TEST 3: Scroll Position (should scroll to URL input)
    // ============================================
    console.log('\n📍 TEST 3: Scroll Position');
    console.log('-'.repeat(40));
    
    // First scroll to bottom to test
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    const scrollBefore = await page.evaluate(() => window.scrollY);
    console.log(`   Scroll before: ${scrollBefore}px (at bottom)`);
    
    // Click "Analyze Another Website" if visible
    const analyzeAnotherBtn = page.getByRole('button', { name: /analyze another website/i }).first();
    if (await analyzeAnotherBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await analyzeAnotherBtn.click();
      await page.waitForTimeout(2000);
      
      const scrollAfter = await page.evaluate(() => window.scrollY);
      const urlInputInView = await page.evaluate(() => {
        const input = document.getElementById('website-url');
        if (!input) return false;
        const rect = input.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= window.innerHeight;
      });
      
      console.log(`   Scroll after: ${scrollAfter}px`);
      console.log(`   URL input in view: ${urlInputInView}`);
      
      results.scrollPosition = urlInputInView;
      console.log(`   ${results.scrollPosition ? '✅ PASS' : '❌ FAIL'}: Scrolled to URL input field`);
    } else {
      console.log('   ⚠️ SKIP: "Analyze Another Website" button not available');
    }
    
    // ============================================
    // TEST 4: Page Count (test with freecalchub.com)
    // ============================================
    console.log('\n📄 TEST 4: Page Count for freecalchub.com');
    console.log('-'.repeat(40));
    
    // Create a new email for fresh daily limit
    const email2 = `test2-${timestamp}@guerrillamail.com`;
    console.log(`   Using fresh email: ${email2}`);
    
    // Start fresh
    await page.goto('https://www.llmtxtmastery.com');
    await page.waitForTimeout(2000);
    
    await page.getByRole('button', { name: /get started/i }).first().click();
    await page.fill('input[type="email"]', email2);
    await page.getByRole('button', { name: /quick start|continue without/i }).first().click();
    await page.waitForTimeout(2000);
    
    // Analyze freecalchub
    await page.fill('input[placeholder*="website"], input[type="url"]', 'https://freecalchub.com');
    await page.getByRole('button', { name: /analyze website/i }).first().click();
    
    // Wait for analysis
    await page.waitForSelector('text=/review.*select|pages.*discovered/i', { timeout: 40000 });
    
    // Get page count
    const pageCountElement = page.locator('text=/\\d+\\s*pages?\\s*(discovered|analyzed)/i').first();
    if (await pageCountElement.isVisible({ timeout: 2000 }).catch(() => false)) {
      const pageText = await pageCountElement.textContent();
      const match = pageText.match(/(\d+)\s*pages?/i);
      const pageCount = match ? parseInt(match[1]) : 0;
      
      console.log(`   Pages analyzed: ${pageCount}`);
      results.pageCount = (pageCount >= 19 && pageCount <= 20);
      console.log(`   ${results.pageCount ? '✅ PASS' : '❌ FAIL'}: Expected 19-20 pages, got ${pageCount}`);
    } else {
      console.log('   ⚠️ Could not find page count');
    }
    
    // ============================================
    // TEST 5: Email Banner Dismiss
    // ============================================
    console.log('\n❌ TEST 5: Email Banner Dismiss');
    console.log('-'.repeat(40));
    
    // Look for email verification banner
    const banner = page.locator('text=/verify.*email.*address/i').first();
    if (await banner.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   ✓ Email verification banner found');
      
      // Look for dismiss button (X)
      const dismissButton = page.locator('button[aria-label*="Dismiss"], button[title*="Dismiss"], .absolute button').first();
      if (await dismissButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dismissButton.click();
        console.log('   ✓ Clicked dismiss button');
        
        await page.waitForTimeout(1000);
        
        // Check if banner is gone
        const bannerGone = !(await banner.isVisible({ timeout: 1000 }).catch(() => false));
        
        if (bannerGone) {
          // Refresh and check if still hidden
          await page.reload();
          await page.waitForTimeout(2000);
          
          const stillHidden = !(await banner.isVisible({ timeout: 2000 }).catch(() => false));
          results.bannerDismiss = stillHidden;
          
          console.log(`   ${results.bannerDismiss ? '✅ PASS' : '❌ FAIL'}: Banner stays dismissed after refresh`);
        } else {
          console.log('   ❌ FAIL: Banner did not disappear after clicking dismiss');
        }
      } else {
        console.log('   ⚠️ Dismiss button not found');
      }
    } else {
      console.log('   ⚠️ Email verification banner not visible (user may be verified)');
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    // ============================================
    // RESULTS SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    console.log('\n✅ PASSED:');
    if (results.emailCapture) console.log('   • Email capture');
    if (results.usageTracking.first) console.log('   • Usage tracking 0→1');
    if (results.usageTracking.second) console.log('   • Usage tracking 1→2');
    if (results.usageTracking.third) console.log('   • Usage tracking 2→3');
    if (results.dailyLimit) console.log('   • Daily limit enforcement');
    if (results.pageCount) console.log('   • Page count (19-20 pages)');
    if (results.scrollPosition) console.log('   • Scroll to URL input');
    if (results.bannerDismiss) console.log('   • Banner dismiss function');
    
    console.log('\n❌ FAILED:');
    if (!results.emailCapture) console.log('   • Email capture');
    if (!results.usageTracking.first) console.log('   • Usage tracking 0→1');
    if (!results.usageTracking.second) console.log('   • Usage tracking 1→2');
    if (!results.usageTracking.third) console.log('   • Usage tracking 2→3');
    if (!results.dailyLimit) console.log('   • Daily limit enforcement');
    if (!results.pageCount) console.log('   • Page count (expected 19-20)');
    if (!results.scrollPosition) console.log('   • Scroll to URL input');
    if (!results.bannerDismiss) console.log('   • Banner dismiss function');
    
    // Calculate totals
    const passed = [
      results.emailCapture,
      results.usageTracking.first,
      results.usageTracking.second,
      results.usageTracking.third,
      results.dailyLimit,
      results.pageCount,
      results.scrollPosition,
      results.bannerDismiss
    ].filter(Boolean).length;
    
    const total = 8;
    const failed = total - passed;
    
    console.log('\n' + '='.repeat(60));
    console.log(`TOTAL: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 ALL TESTS PASSED! All fixes are working correctly.');
    } else {
      console.log(`⚠️ ${failed} test(s) failed. Review the issues above.`);
    }
    console.log('='.repeat(60));
    
    // Keep browser open for 10 seconds to review
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the comprehensive test
console.log('🚀 Starting comprehensive fix testing...\n');
testAllFixes().catch(console.error);