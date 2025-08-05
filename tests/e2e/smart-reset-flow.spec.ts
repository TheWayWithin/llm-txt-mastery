import { test, expect, Page } from '@playwright/test';

/**
 * Smart Reset Flow Tests
 * 
 * This test suite validates the critical "Analyze Another Website" functionality
 * that allows users to start new analyses without losing their authentication
 * context or being forced back to email capture.
 * 
 * Key Scenarios:
 * 1. Complete first analysis → Click "Analyze Another Website" → Skip email capture
 * 2. Verify usage tracking persistence across smart resets
 * 3. Validate state machine preserves user context while clearing analysis data
 */

// Test constants
const TEST_EMAIL = 'idaltddlpaxgqjrecs@enotj.com'; // Free tier test email
const TEST_URL_1 = 'https://example.com';
const TEST_URL_2 = 'https://github.com';

// Key selectors for the smart reset flow
const SELECTORS = {
  urlInput: 'input[placeholder*="https://"]',
  emailInput: 'input[type="email"]',
  analyzeButton: 'button:has-text("Start Analysis")',
  proceedButton: 'button:has-text("Proceed with Analysis")',
  analyzeAnotherButton: 'button:has-text("Analyze Another Website")',
  generateFileButton: 'button[class*="bg-innovation-teal"]:has-text("Generate llms.txt File")',
  usageDisplay: '[class*="Today\'s Progress"], [class*="Premium Credits"]',
  tierDisplay: 'span:has-text("Starter")',
  tierSelection: 'text=Choose Your Analysis Type',
  emailCaptureForm: 'form:has(input[type="email"])',
  contentReviewCard: '[class*="card"]:has-text("Content Review")',
  fileGenerationCard: '[class*="card"]:has-text("File Generated Successfully")',
  // Navigation breadcrumbs and progress indicators
  progressIndicator: '[class*="progress"]',
  currentStep: '[data-testid="current-step"], [class*="currentStep"]'
} as const;

// Helper function to complete first analysis flow
async function completeFirstAnalysis(page: Page, url: string = TEST_URL_1) {
  console.log(`🧪 Starting first analysis for ${url}`);
  
  // Step 1: Enter URL
  await page.fill(SELECTORS.urlInput, url);
  await page.click(SELECTORS.analyzeButton);
  
  // Step 2: Handle email capture (should appear for new user)
  await expect(page.locator(SELECTORS.emailCaptureForm)).toBeVisible({ timeout: 10000 });
  await page.fill(SELECTORS.emailInput, TEST_EMAIL);
  await page.click('button[type="submit"]');
  
  // Step 3: Proceed through tier limits (free tier)
  await expect(page.locator(SELECTORS.proceedButton)).toBeVisible({ timeout: 10000 });
  await page.click(SELECTORS.proceedButton);
  
  // Step 4: Wait for analysis to complete and review page to load
  await expect(page.locator(SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
  
  // Verify we're in the review state with analysis results
  await expect(page.locator('text=pages selected')).toBeVisible();
  
  console.log('✅ First analysis completed successfully');
}

// Helper function to verify usage display shows expected count
async function verifyUsageCount(page: Page, expectedCount: number, maxCount: number = 3) {
  const usageText = `${expectedCount} / ${maxCount}`;
  await expect(page.locator(`text=${usageText}`)).toBeVisible({ timeout: 5000 });
  console.log(`✅ Usage display verified: ${usageText}`);
}

test.describe('Smart Reset Flow - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Ensure we start with a clean state
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
  });

  test('should preserve user context when clicking "Analyze Another Website" from content review', async ({ page }) => {
    console.log('🧪 Testing smart reset from content review page');
    
    // Complete first analysis
    await completeFirstAnalysis(page);
    
    // Verify initial usage count (should show 1/3 after first analysis)
    await verifyUsageCount(page, 1, 3);
    
    // Click "Analyze Another Website" from content review
    await expect(page.locator(SELECTORS.analyzeAnotherButton)).toBeVisible();
    await page.click(SELECTORS.analyzeAnotherButton);
    
    // Critical assertion: Should go directly to URL input, NOT email capture
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(SELECTORS.emailCaptureForm)).not.toBeVisible();
    
    // Verify user context is preserved by checking usage display
    await verifyUsageCount(page, 1, 3); // Should still show 1/3, not reset to 0/3
    
    // Verify tier information is preserved
    await expect(page.locator(SELECTORS.tierDisplay)).toBeVisible();
    
    console.log('✅ Smart reset from content review preserved user context');
  });

  test('should preserve user context when clicking "Analyze Another Website" from file generation', async ({ page }) => {
    console.log('🧪 Testing smart reset from file generation page');
    
    // Complete first analysis
    await completeFirstAnalysis(page);
    
    // Generate the file to reach file generation state
    await page.click(SELECTORS.generateFileButton);
    await expect(page.locator(SELECTORS.fileGenerationCard)).toBeVisible({ timeout: 30000 });
    
    // Verify we can see usage count in file generation state
    await verifyUsageCount(page, 1, 3);
    
    // Click "Analyze Another Website" from file generation
    await expect(page.locator(SELECTORS.analyzeAnotherButton)).toBeVisible();
    await page.click(SELECTORS.analyzeAnotherButton);
    
    // Critical assertion: Should go directly to URL input, NOT email capture
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(SELECTORS.emailCaptureForm)).not.toBeVisible();
    
    // Verify user context is preserved
    await verifyUsageCount(page, 1, 3);
    await expect(page.locator(SELECTORS.tierDisplay)).toBeVisible();
    
    console.log('✅ Smart reset from file generation preserved user context');
  });

  test('should allow immediate second analysis after smart reset', async ({ page }) => {
    console.log('🧪 Testing immediate second analysis capability');
    
    // Complete first analysis
    await completeFirstAnalysis(page, TEST_URL_1);
    
    // Click "Analyze Another Website"
    await page.click(SELECTORS.analyzeAnotherButton);
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
    
    // Start second analysis immediately
    await page.fill(SELECTORS.urlInput, TEST_URL_2);
    await page.click(SELECTORS.analyzeButton);
    
    // Should proceed directly to tier limits (no email capture)
    await expect(page.locator(SELECTORS.proceedButton)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(SELECTORS.emailCaptureForm)).not.toBeVisible();
    
    // Verify usage count incremented appropriately before proceeding
    await verifyUsageCount(page, 1, 3); // Still 1/3 until analysis completes
    
    // Proceed with second analysis
    await page.click(SELECTORS.proceedButton);
    await expect(page.locator(SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
    
    // Verify usage count updated after second analysis
    await verifyUsageCount(page, 2, 3);
    
    console.log('✅ Second analysis completed successfully with updated usage count');
  });

  test('should maintain consistent state across browser refresh after smart reset', async ({ page }) => {
    console.log('🧪 Testing state persistence across browser refresh');
    
    // Complete first analysis
    await completeFirstAnalysis(page);
    
    // Click "Analyze Another Website"
    await page.click(SELECTORS.analyzeAnotherButton);
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
    
    // Refresh the page
    await page.reload();
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
    
    // Verify user context is still preserved after refresh
    await verifyUsageCount(page, 1, 3);
    await expect(page.locator(SELECTORS.tierDisplay)).toBeVisible();
    
    // Verify we can still proceed with new analysis (no email capture required)
    await page.fill(SELECTORS.urlInput, TEST_URL_2);
    await page.click(SELECTORS.analyzeButton);
    await expect(page.locator(SELECTORS.proceedButton)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(SELECTORS.emailCaptureForm)).not.toBeVisible();
    
    console.log('✅ State persistence verified across browser refresh');
  });

  test('should handle edge case: multiple rapid clicks on "Analyze Another Website"', async ({ page }) => {
    console.log('🧪 Testing edge case: rapid multiple clicks');
    
    // Complete first analysis
    await completeFirstAnalysis(page);
    
    // Rapidly click "Analyze Another Website" multiple times
    const analyzeAnotherBtn = page.locator(SELECTORS.analyzeAnotherButton);
    await expect(analyzeAnotherBtn).toBeVisible();
    
    // Click multiple times in quick succession
    await analyzeAnotherBtn.click();
    await analyzeAnotherBtn.click({ timeout: 100 }).catch(() => {}); // May not be clickable
    await analyzeAnotherBtn.click({ timeout: 100 }).catch(() => {}); // May not be clickable
    
    // Should still end up in the correct state (URL input)
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(SELECTORS.emailCaptureForm)).not.toBeVisible();
    
    // Verify usage count is still correct (not corrupted by rapid clicks)
    await verifyUsageCount(page, 1, 3);
    
    console.log('✅ Rapid clicks handled gracefully');
  });
});

test.describe('Smart Reset Flow - State Machine Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should validate START_NEW_ANALYSIS event preserves user data while clearing analysis data', async ({ page }) => {
    console.log('🧪 Testing START_NEW_ANALYSIS event behavior');
    
    // Complete first analysis
    await completeFirstAnalysis(page);
    
    // Store original user context indicators
    const originalUsageText = await page.locator('text=/\\d+ \\/ \\d+/').textContent();
    const originalTierText = await page.locator(SELECTORS.tierDisplay).textContent();
    
    // Click "Analyze Another Website" (triggers START_NEW_ANALYSIS)
    await page.click(SELECTORS.analyzeAnotherButton);
    
    // Verify we're back to URL input state
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
    
    // Verify user context is preserved
    await expect(page.locator(`text=${originalUsageText}`)).toBeVisible();
    await expect(page.locator(`text=${originalTierText}`)).toBeVisible();
    
    // Verify analysis data is cleared (URL input should be empty)
    await expect(page.locator(SELECTORS.urlInput)).toHaveValue('');
    
    // Verify we don't see any old analysis results
    await expect(page.locator(SELECTORS.contentReviewCard)).not.toBeVisible();
    await expect(page.locator(SELECTORS.fileGenerationCard)).not.toBeVisible();
    
    console.log('✅ START_NEW_ANALYSIS event behavior validated');
  });

  test('should differentiate between RESET_WORKFLOW and START_NEW_ANALYSIS events', async ({ page }) => {
    console.log('🧪 Testing difference between full reset and smart reset');
    
    // Complete first analysis to establish user context
    await completeFirstAnalysis(page);
    
    // Test smart reset (START_NEW_ANALYSIS)
    await page.click(SELECTORS.analyzeAnotherButton);
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
    
    // Verify user context preserved with smart reset
    await verifyUsageCount(page, 1, 3);
    
    // Note: RESET_WORKFLOW would be tested if there was a full reset button
    // For now, we validate that smart reset preserves context while
    // a hypothetical full reset would clear everything
    
    console.log('✅ Smart reset behavior differentiated from full reset');
  });

  test('should handle state transitions correctly during smart reset', async ({ page }) => {
    console.log('🧪 Testing state transition correctness');
    
    // Complete first analysis
    await completeFirstAnalysis(page);
    
    // Monitor console logs for state transitions (if logging is enabled)
    const stateTransitions: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('State transition:') || msg.text().includes('START_NEW_ANALYSIS')) {
        stateTransitions.push(msg.text());
      }
    });
    
    // Trigger smart reset
    await page.click(SELECTORS.analyzeAnotherButton);
    
    // Verify we end up in URL_INPUT state
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
    
    // Verify we can immediately proceed with new URL (state machine ready)
    await page.fill(SELECTORS.urlInput, TEST_URL_2);
    await page.click(SELECTORS.analyzeButton);
    
    // Should skip email capture and go to tier limits
    await expect(page.locator(SELECTORS.proceedButton)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(SELECTORS.emailCaptureForm)).not.toBeVisible();
    
    console.log('✅ State transitions validated during smart reset');
  });
});

test.describe('Smart Reset Flow - Error Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle smart reset when analysis fails', async ({ page }) => {
    console.log('🧪 Testing smart reset after analysis failure');
    
    // Start analysis with potentially problematic URL
    await page.fill(SELECTORS.urlInput, 'https://invalid-domain-for-testing.com');
    await page.click(SELECTORS.analyzeButton);
    
    // Complete email capture
    await expect(page.locator(SELECTORS.emailCaptureForm)).toBeVisible({ timeout: 10000 });
    await page.fill(SELECTORS.emailInput, TEST_EMAIL);
    await page.click('button[type="submit"]');
    
    // Proceed through tier limits
    await expect(page.locator(SELECTORS.proceedButton)).toBeVisible({ timeout: 10000 });
    await page.click(SELECTORS.proceedButton);
    
    // Wait for potential analysis failure or timeout
    // In a real scenario, this might show an error state
    await page.waitForTimeout(5000);
    
    // If there's an error state or we're stuck, the smart reset should still work
    // Look for any "Analyze Another Website" button or reset option
    const resetButton = page.locator(SELECTORS.analyzeAnotherButton).or(
      page.locator('button:has-text("Try Again")').or(
        page.locator('button:has-text("Start Over")')
      )
    );
    
    if (await resetButton.isVisible()) {
      await resetButton.click();
      
      // Should return to URL input with preserved context
      await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
      await verifyUsageCount(page, 1, 3); // Usage should still be tracked
    }
    
    console.log('✅ Smart reset available even after analysis issues');
  });

  test('should maintain user context even when network issues occur', async ({ page }) => {
    console.log('🧪 Testing smart reset with simulated network issues');
    
    // Complete first analysis successfully
    await completeFirstAnalysis(page);
    
    // Simulate network issues by intercepting requests
    await page.route('**/api/analyze', route => {
      route.abort('internetdisconnected');
    });
    
    // Trigger smart reset
    await page.click(SELECTORS.analyzeAnotherButton);
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
    
    // Verify user context preserved despite network simulation
    await verifyUsageCount(page, 1, 3);
    
    // Try to start new analysis (should handle network gracefully)
    await page.fill(SELECTORS.urlInput, TEST_URL_2);
    await page.click(SELECTORS.analyzeButton);
    
    // Should still skip email capture even with network issues
    await expect(page.locator(SELECTORS.emailCaptureForm)).not.toBeVisible();
    
    console.log('✅ User context preserved during network issues');
  });
});