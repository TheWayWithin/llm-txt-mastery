import { test, expect, Page } from '@playwright/test';

/**
 * Multi-Analysis Flow Tests
 * 
 * This test suite validates the ability to perform multiple analyses
 * in sequence while maintaining accurate usage tracking and user context.
 * Focus areas:
 * 1. Free tier usage limits (3 analyses per day)
 * 2. Usage counter accuracy across multiple smart resets
 * 3. Coffee tier unlimited analysis capability
 * 4. Proper tier-based flow differentiation
 */

// Test constants
const FREE_TIER_EMAIL = 'idaltddlpaxgqjrecs@enotj.com';
const COFFEE_TIER_EMAIL = 'coffee-test@example.com';
const TEST_URLS = [
  'https://example.com',
  'https://github.com',
  'https://stackoverflow.com',
  'https://developer.mozilla.org'
];

// Reusable selectors
const SELECTORS = {
  urlInput: 'input[placeholder*="https://"]',
  emailInput: 'input[type="email"]',
  analyzeButton: 'button:has-text("Start Analysis")',
  proceedButton: 'button:has-text("Proceed with Analysis")',
  analyzeAnotherButton: 'button:has-text("Analyze Another Website")',
  generateFileButton: 'button[class*="bg-innovation-teal"]:has-text("Generate llms.txt File")',
  usageDisplay: '[class*="Today\'s Progress"], [class*="Premium Credits"]',
  dailyAnalysisText: 'text=/\\d+ \\/ \\d+/',
  tierBadge: 'span:has-text("Starter"), span:has-text("Coffee")',
  emailCaptureForm: 'form:has(input[type="email"])',
  contentReviewCard: '[class*="card"]:has-text("Content Review")',
  fileGenerationCard: '[class*="card"]:has-text("File Generated Successfully")',
  limitReachedMessage: 'text=/daily limit/i, text=/limit reached/i',
  upgradePrompt: 'text=/upgrade/i, text=/coffee/i'
} as const;

// Helper functions
async function completeAnalysisFlow(page: Page, url: string, expectEmailCapture: boolean = false) {
  console.log(`🧪 Starting analysis for ${url}, expectEmailCapture: ${expectEmailCapture}`);
  
  // Enter URL and start analysis
  await page.fill(SELECTORS.urlInput, url);
  await page.click(SELECTORS.analyzeButton);
  
  if (expectEmailCapture) {
    // Handle email capture for new users
    await expect(page.locator(SELECTORS.emailCaptureForm)).toBeVisible({ timeout: 10000 });
    await page.fill(SELECTORS.emailInput, FREE_TIER_EMAIL);
    await page.click('button[type="submit"]');
  }
  
  // Proceed through tier limits
  await expect(page.locator(SELECTORS.proceedButton)).toBeVisible({ timeout: 15000 });
  await page.click(SELECTORS.proceedButton);
  
  // Wait for analysis completion
  await expect(page.locator(SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
  
  console.log(`✅ Analysis completed for ${url}`);
}

async function verifyUsageCount(page: Page, expectedCurrent: number, maxCount: number = 3) {
  const expectedText = `${expectedCurrent} / ${maxCount}`;
  await expect(page.locator(`text=${expectedText}`)).toBeVisible({ timeout: 10000 });
  console.log(`✅ Usage verified: ${expectedText}`);
}

async function performSmartReset(page: Page) {
  await expect(page.locator(SELECTORS.analyzeAnotherButton)).toBeVisible();
  await page.click(SELECTORS.analyzeAnotherButton);
  await expect(page.locator(SELECTORS.urlInput)).toBeVisible({ timeout: 5000 });
  console.log('✅ Smart reset completed - back to URL input');
}

test.describe('Multi-Analysis Flow - Free Tier Usage Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
  });

  test('should accurately track usage through multiple analysis cycles', async ({ page }) => {
    console.log('🧪 Testing usage tracking accuracy across multiple analyses');
    
    // First analysis (new user)
    await completeAnalysisFlow(page, TEST_URLS[0], true);
    await verifyUsageCount(page, 1, 3);
    
    // Smart reset and second analysis
    await performSmartReset(page);
    await verifyUsageCount(page, 1, 3); // Should maintain count during reset
    
    await completeAnalysisFlow(page, TEST_URLS[1], false);
    await verifyUsageCount(page, 2, 3);
    
    // Smart reset and third analysis
    await performSmartReset(page);
    await verifyUsageCount(page, 2, 3); // Should maintain count during reset
    
    await completeAnalysisFlow(page, TEST_URLS[2], false);
    await verifyUsageCount(page, 3, 3);
    
    console.log('✅ Usage tracking accuracy validated through 3 analysis cycles');
  });

  test('should handle daily limit enforcement correctly', async ({ page }) => {
    console.log('🧪 Testing daily limit enforcement');
    
    // Complete 3 analyses to reach limit
    await completeAnalysisFlow(page, TEST_URLS[0], true);
    await verifyUsageCount(page, 1, 3);
    
    await performSmartReset(page);
    await completeAnalysisFlow(page, TEST_URLS[1], false);
    await verifyUsageCount(page, 2, 3);
    
    await performSmartReset(page);
    await completeAnalysisFlow(page, TEST_URLS[2], false);
    await verifyUsageCount(page, 3, 3);
    
    // Try to start fourth analysis
    await performSmartReset(page);
    await page.fill(SELECTORS.urlInput, TEST_URLS[3]);
    await page.click(SELECTORS.analyzeButton);
    
    // Should show limit reached message or upgrade prompt
    const limitOrUpgrade = page.locator(SELECTORS.limitReachedMessage).or(
      page.locator(SELECTORS.upgradePrompt)
    );
    await expect(limitOrUpgrade).toBeVisible({ timeout: 10000 });
    
    // Verify usage count still shows 3/3
    await verifyUsageCount(page, 3, 3);
    
    console.log('✅ Daily limit enforcement working correctly');
  });

  test('should show appropriate upgrade prompts when approaching limits', async ({ page }) => {
    console.log('🧪 Testing upgrade prompt display logic');
    
    // Complete 2 analyses (80% of limit)
    await completeAnalysisFlow(page, TEST_URLS[0], true);
    await verifyUsageCount(page, 1, 3);
    
    await performSmartReset(page);
    await completeAnalysisFlow(page, TEST_URLS[1], false);
    await verifyUsageCount(page, 2, 3);
    
    // At 2/3 usage (66%), should show upgrade prompts
    await expect(page.locator('text=/almost at your daily limit/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/buy me a coffee/i')).toBeVisible();
    
    // Complete third analysis
    await performSmartReset(page);
    await completeAnalysisFlow(page, TEST_URLS[2], false);
    await verifyUsageCount(page, 3, 3);
    
    // At 3/3 usage, should show more prominent upgrade messaging
    await expect(page.locator('text=/ready for another/i, text=/keep the momentum/i')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Upgrade prompts displayed appropriately');
  });

  test('should maintain usage tracking across browser sessions', async ({ page }) => {
    console.log('🧪 Testing usage persistence across browser sessions');
    
    // Complete first analysis
    await completeAnalysisFlow(page, TEST_URLS[0], true);
    await verifyUsageCount(page, 1, 3);
    
    // Simulate session break by refreshing and navigating
    await page.reload();
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
    await verifyUsageCount(page, 1, 3);
    
    // Navigate away and back
    await page.goto('/pricing');
    await page.goBack();
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
    await verifyUsageCount(page, 1, 3);
    
    // Should still be able to continue with second analysis
    await completeAnalysisFlow(page, TEST_URLS[1], false);
    await verifyUsageCount(page, 2, 3);
    
    console.log('✅ Usage tracking persisted across browser sessions');
  });
});

test.describe('Multi-Analysis Flow - Coffee Tier Premium Experience', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should allow unlimited analyses for Coffee tier users', async ({ page }) => {
    console.log('🧪 Testing Coffee tier unlimited analysis capability');
    
    // Simulate Coffee tier user by navigating with coffee parameter
    await page.goto(`/?email=${encodeURIComponent(COFFEE_TIER_EMAIL)}&coffee=true`);
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
    
    // Verify Coffee tier badge/indicator
    await expect(page.locator('span:has-text("Coffee")')).toBeVisible({ timeout: 10000 });
    
    // Perform multiple analyses (more than free tier limit)
    for (let i = 0; i < 4; i++) {
      console.log(`☕ Starting Coffee tier analysis ${i + 1}`);
      
      await page.fill(SELECTORS.urlInput, TEST_URLS[i % TEST_URLS.length]);
      await page.click(SELECTORS.analyzeButton);
      
      // Should skip email capture and tier limits for Coffee users
      await expect(page.locator(SELECTORS.emailCaptureForm)).not.toBeVisible();
      
      // Coffee tier should proceed directly to analysis
      await expect(page.locator(SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
      
      // Verify Coffee tier usage display (credits, not daily limits)
      const coffeeUsageIndicator = page.locator('text=/credit/i, text=/premium/i');
      await expect(coffeeUsageIndicator).toBeVisible();
      
      if (i < 3) { // Don't reset after last iteration
        await performSmartReset(page);
      }
    }
    
    console.log('✅ Coffee tier unlimited analysis capability verified');
  });

  test('should differentiate Coffee tier flow from free tier flow', async ({ page }) => {
    console.log('🧪 Testing Coffee vs Free tier flow differences');
    
    // Test free tier flow first
    await completeAnalysisFlow(page, TEST_URLS[0], true);
    await verifyUsageCount(page, 1, 3);
    
    // Now simulate Coffee tier return
    await page.goto(`/?email=${encodeURIComponent(COFFEE_TIER_EMAIL)}&coffee=true`);
    
    // Start analysis
    await page.fill(SELECTORS.urlInput, TEST_URLS[1]);
    await page.click(SELECTORS.analyzeButton);
    
    // Coffee tier should bypass tier selection entirely
    await expect(page.locator('text=Choose Your Analysis Type')).not.toBeVisible();
    await expect(page.locator(SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
    
    // Verify Coffee tier indicators
    await expect(page.locator('text=/premium/i, text=/coffee/i')).toBeVisible();
    
    console.log('✅ Coffee tier flow differentiation validated');
  });
});

test.describe('Multi-Analysis Flow - Data Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should maintain data consistency across rapid analysis cycles', async ({ page }) => {
    console.log('🧪 Testing data consistency with rapid analysis cycles');
    
    // Perform rapid analysis cycles
    for (let i = 0; i < 3; i++) {
      const expectEmail = i === 0; // Only first analysis needs email
      
      await completeAnalysisFlow(page, TEST_URLS[i], expectEmail);
      await verifyUsageCount(page, i + 1, 3);
      
      if (i < 2) { // Don't reset after last iteration
        await performSmartReset(page);
        
        // Verify consistency immediately after reset
        await verifyUsageCount(page, i + 1, 3);
      }
    }
    
    console.log('✅ Data consistency maintained across rapid cycles');
  });

  test('should handle concurrent analysis attempts gracefully', async ({ page }) => {
    console.log('🧪 Testing concurrent analysis attempt handling');
    
    // Start first analysis
    await page.fill(SELECTORS.urlInput, TEST_URLS[0]);
    await page.click(SELECTORS.analyzeButton);
    
    // Complete email capture
    await expect(page.locator(SELECTORS.emailCaptureForm)).toBeVisible({ timeout: 10000 });
    await page.fill(SELECTORS.emailInput, FREE_TIER_EMAIL);
    await page.click('button[type="submit"]');
    
    // While in tier limits, try to trigger another analysis (edge case)
    await expect(page.locator(SELECTORS.proceedButton)).toBeVisible({ timeout: 10000 });
    
    // Open new tab and try to start concurrent analysis
    const newPage = await page.context().newPage();
    await newPage.goto('/');
    await newPage.fill(SELECTORS.urlInput, TEST_URLS[1]);
    await newPage.click(SELECTORS.analyzeButton);
    
    // Should handle gracefully - either queue or show existing analysis
    await expect(newPage.locator(SELECTORS.emailCaptureForm).or(
      newPage.locator('text=/analysis in progress/i')
    )).toBeVisible({ timeout: 10000 });
    
    await newPage.close();
    
    // Complete original analysis
    await page.click(SELECTORS.proceedButton);
    await expect(page.locator(SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
    await verifyUsageCount(page, 1, 3);
    
    console.log('✅ Concurrent analysis attempts handled gracefully');
  });

  test('should recover from interrupted analysis cycles', async ({ page }) => {
    console.log('🧪 Testing recovery from interrupted analysis cycles');
    
    // Start analysis
    await page.fill(SELECTORS.urlInput, TEST_URLS[0]);
    await page.click(SELECTORS.analyzeButton);
    
    // Complete email capture
    await expect(page.locator(SELECTORS.emailCaptureForm)).toBeVisible({ timeout: 10000 });
    await page.fill(SELECTORS.emailInput, FREE_TIER_EMAIL);
    await page.click('button[type="submit"]');
    
    // Proceed to analysis
    await expect(page.locator(SELECTORS.proceedButton)).toBeVisible({ timeout: 10000 });
    await page.click(SELECTORS.proceedButton);
    
    // Simulate interruption by navigating away during analysis
    await page.goto('/pricing');
    await page.waitForTimeout(2000);
    
    // Navigate back
    await page.goto('/');
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
    
    // Check if usage was tracked despite interruption
    const usageVisible = page.locator(SELECTORS.dailyAnalysisText);
    if (await usageVisible.isVisible()) {
      const usageText = await usageVisible.textContent();
      console.log(`📊 Usage after interruption: ${usageText}`);
      
      // Usage should be 0/3 or 1/3 depending on when interruption occurred
      await expect(page.locator('text=/[01] / 3/')).toBeVisible();
    }
    
    // Should be able to start new analysis cleanly
    await completeAnalysisFlow(page, TEST_URLS[1], false);
    
    console.log('✅ Recovery from interrupted analysis validated');
  });
});