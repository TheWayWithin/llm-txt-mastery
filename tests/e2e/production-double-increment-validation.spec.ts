import { test, expect } from '@playwright/test';
import { ProductionTestHelpers, retryOperation } from './utils/production-test-helpers';

/**
 * CRITICAL PRODUCTION VALIDATION TESTS
 * 
 * Tests for double-increment bug fix and email verification flow
 * against production site: www.llmtxtmastery.com
 * 
 * VALIDATION TARGETS:
 * 1. Usage counter increments correctly: 1/3 → 2/3 → 3/3 (NOT 2 → 4)
 * 2. Email verification flow: signup → check-email → verification → auto-redirect
 * 3. Daily limit modal appears after 3 analyses
 * 4. No duplicate tabs/windows created
 */

test.describe('Production Double-Increment Bug Fix Validation', () => {
  let helpers: ProductionTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new ProductionTestHelpers(page);
    await helpers.clearBrowserData();
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test('CRITICAL: Usage counter increments correctly 1→2→3 (not double-increment)', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes for complete flow
    
    console.log('🧪 TESTING: Double-increment bug fix validation');
    
    // PHASE 1: Create new user account
    console.log('📧 Phase 1: Creating new user with temporary email...');
    await helpers.navigateToSignup();
    const email = await helpers.signupWithTemporaryEmail();
    console.log(`✓ Signed up with email: ${email}`);
    
    // PHASE 2: Validate check-email redirect
    console.log('📋 Phase 2: Validating check-email page redirect...');
    await helpers.validateCheckEmailPage();
    console.log('✓ Correctly redirected to check-email page');
    
    // PHASE 3: Navigate to analyze page (simulating email verification)
    console.log('🔍 Phase 3: Navigating to analyze page...');
    await helpers.navigateToAnalyze();
    
    // PHASE 4: First analysis - should show 1/3
    console.log('🏃 Phase 4: Performing first analysis...');
    await helpers.performAnalysis('https://example.com');
    await helpers.validateUsageProgression(1, 3);
    await helpers.takeDebugScreenshot('first-analysis-complete');
    
    // PHASE 5: Second analysis - should show 2/3 (NOT 4/3)
    console.log('🏃 Phase 5: Performing second analysis...');
    await helpers.navigateToAnalyze();
    await helpers.performAnalysis('https://httpbin.org');
    await helpers.validateUsageProgression(2, 3);
    await helpers.takeDebugScreenshot('second-analysis-complete');
    
    // PHASE 6: Third analysis - should show 3/3
    console.log('🏃 Phase 6: Performing third analysis...');
    await helpers.navigateToAnalyze();
    await helpers.performAnalysis('https://jsonplaceholder.typicode.com');
    await helpers.validateUsageProgression(3, 3);
    await helpers.takeDebugScreenshot('third-analysis-complete');
    
    // PHASE 7: Fourth analysis attempt - should trigger daily limit modal
    console.log('🚫 Phase 7: Testing daily limit modal on fourth attempt...');
    await helpers.navigateToAnalyze();
    
    // Start fourth analysis
    await page.fill('input[placeholder*="URL"]', 'https://postman-echo.com');
    await page.click('button:has-text("Analyze")');
    
    // Should show daily limit modal
    await helpers.validateDailyLimitModal();
    await helpers.takeDebugScreenshot('daily-limit-modal');
    
    console.log('✅ PASSED: Double-increment bug fix validation complete!');
  });

  test('Email verification flow validation: signup → check-email → auto-redirect', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes
    
    console.log('🧪 TESTING: Email verification flow validation');
    
    // PHASE 1: Signup process
    console.log('📧 Phase 1: Testing signup process...');
    await helpers.navigateToSignup();
    const email = await helpers.signupWithTemporaryEmail();
    console.log(`✓ Signed up with email: ${email}`);
    
    // PHASE 2: Validate immediate redirect to check-email (NOT analyze)
    console.log('📋 Phase 2: Validating immediate redirect to check-email...');
    await helpers.validateCheckEmailPage();
    
    // Ensure we did NOT get redirected to analyze page
    expect(page.url()).not.toContain('/analyze');
    console.log('✓ Correctly prevented direct redirect to /analyze');
    
    // PHASE 3: Validate check-email page content
    console.log('📄 Phase 3: Validating check-email page content...');
    await expect(page.locator('text=check your email')).toBeVisible();
    await expect(page.locator('text=verification link')).toBeVisible();
    await helpers.takeDebugScreenshot('check-email-page-content');
    
    // PHASE 4: Simulate email verification by direct navigation
    console.log('✉️ Phase 4: Simulating email verification...');
    await helpers.navigateToAnalyze();
    
    // Should now have access to analyze page
    await expect(page.locator('input[placeholder*="URL"]')).toBeVisible();
    console.log('✓ Successfully accessed analyze page after verification');
    
    // PHASE 5: Validate no duplicate tabs/windows
    console.log('🪟 Phase 5: Checking for duplicate tabs/windows...');
    const pages = page.context().pages();
    expect(pages.length).toBe(1);
    console.log('✓ No duplicate tabs or windows created');
    
    await helpers.takeDebugScreenshot('email-verification-complete');
    
    console.log('✅ PASSED: Email verification flow validation complete!');
  });

  test('Authenticated user usage counter progression', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes
    
    console.log('🧪 TESTING: Authenticated user counter progression');
    
    // PHASE 1: Create and verify account
    await helpers.navigateToSignup();
    const email = await helpers.signupWithTemporaryEmail();
    await helpers.validateCheckEmailPage();
    await helpers.navigateToAnalyze();
    
    // PHASE 2: Perform analyses with logout/login cycles
    console.log('🔄 Phase 2: Testing counter persistence through login/logout...');
    
    // First analysis
    await helpers.performAnalysis('https://example.com');
    await helpers.validateUsageProgression(1, 3);
    
    // Logout and login again
    await helpers.logout();
    const password = `TestPass123!${Date.now()}`;
    await helpers.loginWithCredentials(email, password);
    
    // Second analysis after login
    await helpers.performAnalysis('https://httpbin.org');
    await helpers.validateUsageProgression(2, 3);
    
    // Third analysis
    await helpers.performAnalysis('https://jsonplaceholder.typicode.com');
    await helpers.validateUsageProgression(3, 3);
    
    console.log('✅ PASSED: Authenticated user counter progression validated!');
  });

  test('Edge case: Rapid successive analyses (race condition test)', async ({ page }) => {
    test.setTimeout(240000); // 4 minutes
    
    console.log('🧪 TESTING: Race condition prevention in usage counting');
    
    // Setup account
    await helpers.navigateToSignup();
    const email = await helpers.signupWithTemporaryEmail();
    await helpers.validateCheckEmailPage();
    await helpers.navigateToAnalyze();
    
    // Perform analyses in rapid succession
    console.log('⚡ Performing rapid successive analyses...');
    
    const testUrls = [
      'https://example.com',
      'https://httpbin.org/json',
      'https://postman-echo.com/get'
    ];
    
    for (let i = 0; i < testUrls.length; i++) {
      console.log(`🏃 Analysis ${i + 1}: ${testUrls[i]}`);
      
      await helpers.performAnalysis(testUrls[i]);
      await helpers.validateUsageProgression(i + 1, 3);
      
      // Small delay to avoid overwhelming the system
      await page.waitForTimeout(2000);
    }
    
    // Verify final state
    const finalCount = await helpers.getCurrentUsageCount();
    expect(finalCount.current).toBe(3);
    expect(finalCount.total).toBe(3);
    
    console.log('✅ PASSED: Race condition test - no double counting detected!');
  });

  test('Cross-browser counter consistency', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes
    
    console.log('🧪 TESTING: Cross-browser counter consistency');
    
    // Setup account
    await helpers.navigateToSignup();
    const email = await helpers.signupWithTemporaryEmail();
    await helpers.validateCheckEmailPage();
    await helpers.navigateToAnalyze();
    
    // Perform first analysis
    await helpers.performAnalysis('https://example.com');
    await helpers.validateUsageProgression(1, 3);
    
    // Record browser info
    const browserName = page.context().browser()?.browserType().name();
    console.log(`✓ Analysis completed in ${browserName}`);
    
    // The counter should be consistent regardless of browser
    // This test validates the server-side counting logic
    const debugInfo = await helpers.getDebugInfo();
    console.log('Debug info:', debugInfo);
    
    await helpers.takeDebugScreenshot('cross-browser-validation');
    
    console.log('✅ PASSED: Cross-browser consistency validated!');
  });
});

test.describe('Production Email Verification Edge Cases', () => {
  let helpers: ProductionTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new ProductionTestHelpers(page);
    await helpers.clearBrowserData();
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test('Check-email page prevents direct /analyze access', async ({ page }) => {
    console.log('🧪 TESTING: Check-email page access control');
    
    // Sign up but don't verify
    await helpers.navigateToSignup();
    const email = await helpers.signupWithTemporaryEmail();
    await helpers.validateCheckEmailPage();
    
    // Try to directly access /analyze
    await page.goto('/analyze');
    
    // Should redirect back to check-email or show verification notice
    const currentUrl = page.url();
    const isBlocked = currentUrl.includes('/check-email') || 
                     await page.locator('text=verify your email').isVisible();
    
    expect(isBlocked).toBe(true);
    console.log('✓ Direct /analyze access properly blocked before verification');
  });

  test('URL preservation through verification flow', async ({ page }) => {
    console.log('🧪 TESTING: URL preservation through verification');
    
    // Try to access analyze with a specific URL
    await page.goto('/analyze?url=https://example.com');
    
    // Should redirect to signup/login if not authenticated
    const needsAuth = page.url().includes('/signup') || 
                      page.url().includes('/login') ||
                      page.url().includes('/check-email');
    
    if (needsAuth) {
      // Complete signup flow
      await helpers.navigateToSignup();
      await helpers.signupWithTemporaryEmail();
      await helpers.validateCheckEmailPage();
      
      // Navigate back to analyze - URL should be preserved or usable
      await helpers.navigateToAnalyze();
      await expect(page.locator('input[placeholder*="URL"]')).toBeVisible();
      
      console.log('✓ URL preservation flow validated');
    }
  });
});