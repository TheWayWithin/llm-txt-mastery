import { test, expect } from '@playwright/test';
import { 
  captureStateSnapshot, 
  completeAnalysisFlow, 
  performSmartReset,
  validateUserContextPreserved,
  validateAnalysisDataCleared,
  verifyUsageCount,
  setupCoffeeTierUser,
  testMultipleAnalysisCycles,
  validateSmartResetFunctionality,
  SMART_RESET_TEST_DATA,
  SMART_RESET_SELECTORS
} from './utils/smart-reset-helpers';

import {
  completeAnalysisForSmartReset,
  performValidatedSmartReset,
  validateSmartResetBehavior,
  createAuthTestContext
} from './utils/auth-helpers';

/**
 * Smart Reset Test Runner
 * 
 * Comprehensive test suite that validates the complete smart reset functionality
 * across all user scenarios. This runner executes critical validation tests
 * to ensure the "Analyze Another Website" feature works correctly.
 * 
 * Test Coverage:
 * - Basic smart reset functionality
 * - Free tier usage tracking preservation
 * - Coffee tier unlimited analysis
 * - State machine consistency
 * - Error recovery scenarios
 * - Edge cases and rapid interactions
 */

test.describe('Smart Reset Test Runner - Complete Validation Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean starting state
    await page.goto('/');
    await expect(page.locator(SMART_RESET_SELECTORS.urlInput)).toBeVisible();
  });

  test('CRITICAL: End-to-end smart reset flow validation', async ({ page }) => {
    console.log('🎯 CRITICAL TEST: Validating complete smart reset functionality');
    
    const testContext = await createAuthTestContext(page);
    
    try {
      // Phase 1: Complete first analysis with email capture
      console.log('📝 Phase 1: First analysis with email capture');
      const firstAnalysisState = await completeAnalysisFlow(page, {
        url: SMART_RESET_TEST_DATA.TEST_URLS[0],
        requiresEmail: true,
        email: SMART_RESET_TEST_DATA.FREE_TIER_EMAIL,
        generateFile: true
      });
      
      // Verify initial usage tracking
      await verifyUsageCount(page, 1, 3);
      
      // Phase 2: Perform smart reset and validate preservation
      console.log('🔄 Phase 2: Smart reset and context preservation');
      const resetState = await performSmartReset(page);
      
      // Critical validations
      await validateUserContextPreserved(firstAnalysisState, resetState);
      await validateAnalysisDataCleared(resetState);
      await validateSmartResetBehavior(page);
      
      // Phase 3: Second analysis without email capture
      console.log('🚀 Phase 3: Second analysis (should skip email capture)');
      const secondAnalysisState = await completeAnalysisFlow(page, {
        url: SMART_RESET_TEST_DATA.TEST_URLS[1],
        requiresEmail: false, // CRITICAL: Should skip email capture
        generateFile: true
      });
      
      // Verify usage increment
      await verifyUsageCount(page, 2, 3);
      
      // Phase 4: Final smart reset validation
      console.log('✅ Phase 4: Final validation');
      const finalResetState = await performSmartReset(page);
      await validateUserContextPreserved(secondAnalysisState, finalResetState);
      await validateAnalysisDataCleared(finalResetState);
      
      // Verify smart reset events occurred
      expect(testContext.smartResetEvents.length).toBeGreaterThan(0);
      console.log(`📊 Smart reset events captured: ${testContext.smartResetEvents.length}`);
      
    } finally {
      testContext.cleanup();
    }
    
    console.log('🎉 CRITICAL TEST PASSED: Smart reset functionality validated');
  });

  test('VALIDATION: Free tier usage tracking across multiple smart resets', async ({ page }) => {
    console.log('📊 VALIDATION: Testing usage tracking across multiple resets');
    
    // Test 3 complete analysis cycles with smart resets
    const states = await testMultipleAnalysisCycles(page, 3, SMART_RESET_TEST_DATA.FREE_TIER_EMAIL);
    
    // Validate state progression
    expect(states.length).toBeGreaterThanOrEqual(5); // 3 analyses + 2 resets minimum
    
    // Verify final state shows correct usage
    await verifyUsageCount(page, 3, 3);
    
    // Try to exceed limit
    await page.fill(SMART_RESET_SELECTORS.urlInput, SMART_RESET_TEST_DATA.TEST_URLS[3]);
    await page.click(SMART_RESET_SELECTORS.analyzeButton);
    
    // Should show upgrade prompts or limit messaging
    const upgradeVisible = await page.locator(SMART_RESET_SELECTORS.upgradePrompts).isVisible({ timeout: 10000 });
    expect(upgradeVisible).toBe(true);
    
    console.log('✅ VALIDATION PASSED: Usage tracking accuracy confirmed');
  });

  test('COFFEE TIER: Unlimited analysis with smart reset preservation', async ({ page }) => {
    console.log('☕ COFFEE TIER: Testing unlimited analysis capability');
    
    // Setup Coffee tier user
    await setupCoffeeTierUser(page, SMART_RESET_TEST_DATA.COFFEE_TIER_EMAIL);
    
    // Perform 5 analyses (exceeding free tier limit)
    for (let i = 0; i < 5; i++) {
      console.log(`☕ Coffee analysis ${i + 1}/5`);
      
      const url = SMART_RESET_TEST_DATA.TEST_URLS[i % SMART_RESET_TEST_DATA.TEST_URLS.length];
      
      // Start analysis
      await page.fill(SMART_RESET_SELECTORS.urlInput, url);
      await page.click(SMART_RESET_SELECTORS.analyzeButton);
      
      // Coffee tier should skip tier limits and email capture
      await expect(page.locator(SMART_RESET_SELECTORS.emailCaptureForm)).not.toBeVisible();
      await expect(page.locator(SMART_RESET_SELECTORS.tierLimitsDisplay)).not.toBeVisible();
      
      // Should proceed directly to analysis
      await expect(page.locator(SMART_RESET_SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
      
      // Generate file
      await page.click(SMART_RESET_SELECTORS.generateFileButton);
      await expect(page.locator(SMART_RESET_SELECTORS.fileGenerationCard)).toBeVisible({ timeout: 30000 });
      
      // Verify Coffee tier indicators remain
      await expect(page.locator('span:has-text("Coffee")')).toBeVisible();
      
      if (i < 4) { // Don't reset on last iteration
        await performSmartReset(page);
      }
    }
    
    console.log('✅ COFFEE TIER PASSED: Unlimited analysis with smart reset confirmed');
  });

  test('EDGE CASES: Rapid interactions and error recovery', async ({ page }) => {
    console.log('⚡ EDGE CASES: Testing rapid interactions and error scenarios');
    
    // Complete initial analysis
    await completeAnalysisForSmartReset(page, SMART_RESET_TEST_DATA.TEST_URLS[0], true, true);
    
    // Test rapid smart resets
    console.log('🔄 Testing rapid smart reset clicks');
    for (let i = 0; i < 3; i++) {
      const beforeState = await captureStateSnapshot(page);
      
      // Perform rapid reset
      await expect(page.locator(SMART_RESET_SELECTORS.analyzeAnotherButton)).toBeVisible();
      await page.click(SMART_RESET_SELECTORS.analyzeAnotherButton);
      
      // Additional rapid clicks (should be handled gracefully)
      await page.click(SMART_RESET_SELECTORS.analyzeAnotherButton).catch(() => {
        console.log('⚠️ Additional click ignored - expected behavior');
      });
      
      await expect(page.locator(SMART_RESET_SELECTORS.urlInput)).toBeVisible({ timeout: 5000 });
      
      const afterState = await captureStateSnapshot(page);
      await validateUserContextPreserved(beforeState, afterState);
      await validateAnalysisDataCleared(afterState);
      
      // Start new analysis to reset for next iteration
      if (i < 2) {
        await completeAnalysisForSmartReset(page, SMART_RESET_TEST_DATA.TEST_URLS[i + 1], false, true);
      }
    }
    
    // Test browser navigation during smart reset
    console.log('🌐 Testing browser navigation scenarios');
    await page.fill(SMART_RESET_SELECTORS.urlInput, SMART_RESET_TEST_DATA.TEST_URLS[0]);
    await page.click(SMART_RESET_SELECTORS.analyzeButton);
    
    // Navigate away and back
    await page.goto('/pricing');
    await page.goBack();
    
    // Should maintain state or gracefully recover
    await expect(page.locator(SMART_RESET_SELECTORS.urlInput)).toBeVisible();
    
    // Verify user context recovery
    const hasUsage = await page.locator(SMART_RESET_SELECTORS.usageCounter).isVisible().catch(() => false);
    const hasTier = await page.locator(SMART_RESET_SELECTORS.tierBadge).isVisible().catch(() => false);
    
    expect(hasUsage || hasTier).toBe(true);
    
    console.log('✅ EDGE CASES PASSED: Rapid interactions handled gracefully');
  });

  test('STATE CONSISTENCY: Cross-browser and persistence validation', async ({ page }) => {
    console.log('🔒 STATE CONSISTENCY: Testing persistence and consistency');
    
    // Complete analysis and capture initial state
    await completeAnalysisForSmartReset(page, SMART_RESET_TEST_DATA.TEST_URLS[0], true, true);
    const initialState = await captureStateSnapshot(page);
    
    // Perform smart reset
    const resetResult = await performValidatedSmartReset(page);
    expect(resetResult.beforeUsage).toBe(resetResult.afterUsage);
    
    // Test browser refresh
    console.log('🔄 Testing browser refresh persistence');
    await page.reload();
    await expect(page.locator(SMART_RESET_SELECTORS.urlInput)).toBeVisible();
    
    const postRefreshState = await captureStateSnapshot(page);
    
    // Usage should be preserved or gracefully recovered
    if (postRefreshState.usageText) {
      expect(postRefreshState.usageText).toBe(initialState.usageText);
    }
    
    // Test window resize and viewport changes
    console.log('📱 Testing responsive behavior');
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(1000);
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Smart reset should still work
    if (await page.locator(SMART_RESET_SELECTORS.analyzeAnotherButton).isVisible()) {
      await page.click(SMART_RESET_SELECTORS.analyzeAnotherButton);
      await expect(page.locator(SMART_RESET_SELECTORS.urlInput)).toBeVisible();
    } else {
      // Start new analysis to test smart reset capability
      await completeAnalysisForSmartReset(page, SMART_RESET_TEST_DATA.TEST_URLS[1], false, false);
      await page.click(SMART_RESET_SELECTORS.analyzeAnotherButton);
      await expect(page.locator(SMART_RESET_SELECTORS.urlInput)).toBeVisible();
    }
    
    console.log('✅ STATE CONSISTENCY PASSED: Persistence and consistency validated');
  });

  test('INTEGRATION: Complete user journey simulation', async ({ page }) => {
    console.log('🎭 INTEGRATION: Simulating complete user journey');
    
    const testContext = await createAuthTestContext(page);
    
    try {
      // Journey: New user discovers the tool
      console.log('👤 New user starts first analysis');
      await page.fill(SMART_RESET_SELECTORS.urlInput, 'https://docs.github.com');
      await page.click(SMART_RESET_SELECTORS.analyzeButton);
      
      // Email capture
      await expect(page.locator(SMART_RESET_SELECTORS.emailCaptureForm)).toBeVisible({ timeout: 10000 });
      await page.fill(SMART_RESET_SELECTORS.emailInput, 'user-journey@example.com');
      await page.click('button[type="submit"]');
      
      // Proceed with free tier
      await expect(page.locator(SMART_RESET_SELECTORS.proceedButton)).toBeVisible({ timeout: 15000 });
      await page.click(SMART_RESET_SELECTORS.proceedButton);
      
      // Complete analysis
      await expect(page.locator(SMART_RESET_SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
      await page.click(SMART_RESET_SELECTORS.generateFileButton);
      await expect(page.locator(SMART_RESET_SELECTORS.fileGenerationCard)).toBeVisible({ timeout: 30000 });
      
      await verifyUsageCount(page, 1, 3);
      
      // Journey: User wants to analyze another site
      console.log('🔄 User clicks "Analyze Another Website"');
      await page.click(SMART_RESET_SELECTORS.analyzeAnotherButton);
      await expect(page.locator(SMART_RESET_SELECTORS.urlInput)).toBeVisible();
      
      // Should skip email capture (smart reset working)
      await page.fill(SMART_RESET_SELECTORS.urlInput, 'https://www.npmjs.com');
      await page.click(SMART_RESET_SELECTORS.analyzeButton);
      await expect(page.locator(SMART_RESET_SELECTORS.emailCaptureForm)).not.toBeVisible();
      
      // Complete second analysis
      await expect(page.locator(SMART_RESET_SELECTORS.proceedButton)).toBeVisible({ timeout: 15000 });
      await page.click(SMART_RESET_SELECTORS.proceedButton);
      await expect(page.locator(SMART_RESET_SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
      
      await verifyUsageCount(page, 2, 3);
      
      // Journey: Third analysis to approach limit
      console.log('📈 User performs third analysis (approaching limit)');
      await page.click(SMART_RESET_SELECTORS.analyzeAnotherButton);
      await page.fill(SMART_RESET_SELECTORS.urlInput, 'https://stackoverflow.com');
      await page.click(SMART_RESET_SELECTORS.analyzeButton);
      
      await expect(page.locator(SMART_RESET_SELECTORS.proceedButton)).toBeVisible({ timeout: 15000 });
      await page.click(SMART_RESET_SELECTORS.proceedButton);
      await expect(page.locator(SMART_RESET_SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
      
      await verifyUsageCount(page, 3, 3);
      
      // Should show upgrade prompts
      const upgradePromptVisible = await page.locator(SMART_RESET_SELECTORS.upgradePrompts).isVisible({ timeout: 5000 });
      expect(upgradePromptVisible).toBe(true);
      
      // Journey: User hits limit
      console.log('🚫 User attempts fourth analysis (should hit limit)');
      await page.click(SMART_RESET_SELECTORS.analyzeAnotherButton);
      await page.fill(SMART_RESET_SELECTORS.urlInput, 'https://developer.mozilla.org');
      await page.click(SMART_RESET_SELECTORS.analyzeButton);
      
      // Should show limit or upgrade messaging
      const limitReached = await page.locator(
        'text=/daily limit/i, text=/limit reached/i, text=/upgrade/i'
      ).isVisible({ timeout: 10000 });
      expect(limitReached).toBe(true);
      
      // Verify smart reset events were captured
      expect(testContext.smartResetEvents.length).toBeGreaterThan(0);
      expect(testContext.errors.length).toBe(0);
      
    } finally {
      testContext.cleanup();
    }
    
    console.log('🎉 INTEGRATION PASSED: Complete user journey validated');
  });

  test('REGRESSION: Validate no existing functionality broken', async ({ page }) => {
    console.log('🔧 REGRESSION: Ensuring existing functionality unchanged');
    
    // Test 1: Basic analysis still works
    await page.fill(SMART_RESET_SELECTORS.urlInput, SMART_RESET_TEST_DATA.TEST_URLS[0]);
    await page.click(SMART_RESET_SELECTORS.analyzeButton);
    
    await expect(page.locator(SMART_RESET_SELECTORS.emailCaptureForm)).toBeVisible({ timeout: 10000 });
    await page.fill(SMART_RESET_SELECTORS.emailInput, 'regression-test@example.com');
    await page.click('button[type="submit"]');
    
    await expect(page.locator(SMART_RESET_SELECTORS.proceedButton)).toBeVisible({ timeout: 15000 });
    await page.click(SMART_RESET_SELECTORS.proceedButton);
    
    await expect(page.locator(SMART_RESET_SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
    
    // Test 2: File generation still works
    await page.click(SMART_RESET_SELECTORS.generateFileButton);
    await expect(page.locator(SMART_RESET_SELECTORS.fileGenerationCard)).toBeVisible({ timeout: 30000 });
    
    // Test 3: Download functionality (if available)
    const downloadButton = page.locator('button:has-text("Download")');
    if (await downloadButton.isVisible()) {
      console.log('✅ Download button available');
    }
    
    // Test 4: Navigation still works
    await page.goto('/pricing');
    await expect(page.locator('text=/pricing/i, text=/plan/i')).toBeVisible();
    
    await page.goBack();
    await expect(page.locator(SMART_RESET_SELECTORS.fileGenerationCard)).toBeVisible();
    
    console.log('✅ REGRESSION PASSED: Existing functionality preserved');
  });
});

// Summary test to report overall smart reset health
test.describe('Smart Reset Health Check', () => {
  test('HEALTH CHECK: Smart reset system status', async ({ page }) => {
    console.log('🏥 HEALTH CHECK: Validating smart reset system health');
    
    const healthMetrics = {
      basicFunctionality: false,
      userContextPreservation: false,
      analysisDataClearing: false,
      usageTracking: false,
      errorFree: true
    };
    
    const testContext = await createAuthTestContext(page);
    
    try {
      await page.goto('/');
      
      // Test basic functionality
      await completeAnalysisForSmartReset(page, SMART_RESET_TEST_DATA.TEST_URLS[0], true, true);
      const beforeState = await captureStateSnapshot(page);
      
      await performSmartReset(page);
      const afterState = await captureStateSnapshot(page);
      
      // Evaluate health metrics
      healthMetrics.basicFunctionality = afterState.url.endsWith('/') && afterState.urlInputValue === '';
      healthMetrics.userContextPreservation = beforeState.usageText === afterState.usageText;
      healthMetrics.analysisDataClearing = !afterState.isContentReviewVisible && !afterState.isFileGenerationVisible;
      healthMetrics.usageTracking = afterState.usageText !== null;
      healthMetrics.errorFree = testContext.errors.length === 0;
      
    } finally {
      testContext.cleanup();
    }
    
    // Report health status
    console.log('📊 SMART RESET HEALTH REPORT:');
    console.log(`   Basic Functionality: ${healthMetrics.basicFunctionality ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   User Context Preservation: ${healthMetrics.userContextPreservation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Analysis Data Clearing: ${healthMetrics.analysisDataClearing ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Usage Tracking: ${healthMetrics.usageTracking ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Error Free: ${healthMetrics.errorFree ? '✅ PASS' : '❌ FAIL'}`);
    
    // Overall health assessment
    const healthScore = Object.values(healthMetrics).filter(Boolean).length;
    const totalMetrics = Object.keys(healthMetrics).length;
    const healthPercentage = (healthScore / totalMetrics) * 100;
    
    console.log(`📈 OVERALL HEALTH: ${healthScore}/${totalMetrics} (${healthPercentage}%)`);
    
    // Assert minimum health threshold
    expect(healthScore).toBeGreaterThanOrEqual(4); // At least 80% health required
    
    if (healthPercentage === 100) {
      console.log('🎉 SMART RESET SYSTEM: FULLY OPERATIONAL');
    } else {
      console.log('⚠️ SMART RESET SYSTEM: PARTIAL FUNCTIONALITY - REVIEW FAILED METRICS');
    }
  });
});