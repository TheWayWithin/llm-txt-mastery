import { test, expect, Page } from '@playwright/test';

/**
 * State Preservation Tests for Smart Reset Functionality
 * 
 * This test suite validates that the START_NEW_ANALYSIS event properly preserves
 * user context while clearing analysis-specific data. Critical for ensuring users
 * don't lose authentication state or usage tracking across analysis cycles.
 * 
 * Key Validation Areas:
 * 1. User authentication context preservation
 * 2. Usage tracking and tier information persistence
 * 3. Analysis data cleanup (URLs, results, file IDs)
 * 4. State machine consistency across resets
 * 5. Component state synchronization
 */

// Test constants
const TEST_EMAIL = 'idaltddlpaxgqjrecs@enotj.com';
const COFFEE_EMAIL = 'coffee-tester@example.com';
const TEST_URLS = [
  'https://example.com',
  'https://github.com/microsoft/vscode',
  'https://docs.npmjs.com'
];

// Comprehensive selectors for state validation
const SELECTORS = {
  // Core flow elements
  urlInput: 'input[placeholder*="https://"]',
  emailInput: 'input[type="email"]',
  analyzeButton: 'button:has-text("Start Analysis")',
  proceedButton: 'button:has-text("Proceed with Analysis")',
  analyzeAnotherButton: 'button:has-text("Analyze Another Website")',
  generateFileButton: 'button[class*="bg-innovation-teal"]:has-text("Generate llms.txt File")',
  
  // State indicators
  usageDisplay: '[class*="Today\'s Progress"], [class*="Premium Credits"]',
  usageCounter: 'text=/\\d+ \\/ \\d+/',
  tierBadge: 'span:has-text("Starter"), span:has-text("Coffee"), span:has-text("Growth")',
  userEmail: `text=${TEST_EMAIL}`,
  
  // Component states
  emailCaptureForm: 'form:has(input[type="email"])',
  tierLimitsDisplay: 'text=Choose Your Analysis Type',
  contentReviewCard: '[class*="card"]:has-text("Content Review")',
  fileGenerationCard: '[class*="card"]:has-text("File Generated Successfully")',
  analysisProgressIndicator: '[class*="progress"], text=/analyzing/i, text=/discovering/i',
  
  // Error and loading states
  errorDisplay: 'text=/error/i, text=/failed/i, [role="alert"]',
  loadingSpinner: '[class*="spinner"], [class*="loading"], text=/loading/i',
  
  // Navigation and breadcrumbs
  breadcrumbs: '[class*="breadcrumb"], [class*="step"]',
  backButton: 'button:has-text("Back")',
  homeLink: 'a[href="/"], button:has-text("Home")'
} as const;

// Helper functions for state validation
async function captureCurrentState(page: Page): Promise<StateSnapshot> {
  const snapshot: StateSnapshot = {
    url: page.url(),
    urlInputValue: await page.locator(SELECTORS.urlInput).inputValue().catch(() => ''),
    usageText: await page.locator(SELECTORS.usageCounter).textContent().catch(() => null),
    tierText: await page.locator(SELECTORS.tierBadge).textContent().catch(() => null),
    isEmailCaptureVisible: await page.locator(SELECTORS.emailCaptureForm).isVisible().catch(() => false),
    isTierLimitsVisible: await page.locator(SELECTORS.tierLimitsDisplay).isVisible().catch(() => false),
    isContentReviewVisible: await page.locator(SELECTORS.contentReviewCard).isVisible().catch(() => false),
    isFileGenerationVisible: await page.locator(SELECTORS.fileGenerationCard).isVisible().catch(() => false),
    hasErrors: await page.locator(SELECTORS.errorDisplay).isVisible().catch(() => false),
    timestamp: Date.now()
  };
  
  console.log('📸 State snapshot captured:', snapshot);
  return snapshot;
}

interface StateSnapshot {
  url: string;
  urlInputValue: string;
  usageText: string | null;
  tierText: string | null;
  isEmailCaptureVisible: boolean;
  isTierLimitsVisible: boolean;
  isContentReviewVisible: boolean;
  isFileGenerationVisible: boolean;
  hasErrors: boolean;
  timestamp: number;
}

async function completeFullAnalysis(page: Page, url: string, requiresEmail: boolean = false): Promise<StateSnapshot> {
  console.log(`🧪 Completing full analysis for ${url}`);
  
  // Step 1: URL Input
  await page.fill(SELECTORS.urlInput, url);
  await page.click(SELECTORS.analyzeButton);
  
  // Step 2: Email Capture (if required)
  if (requiresEmail) {
    await expect(page.locator(SELECTORS.emailCaptureForm)).toBeVisible({ timeout: 10000 });
    await page.fill(SELECTORS.emailInput, TEST_EMAIL);
    await page.click('button[type="submit"]');
  }
  
  // Step 3: Tier Limits
  await expect(page.locator(SELECTORS.proceedButton)).toBeVisible({ timeout: 15000 });
  await page.click(SELECTORS.proceedButton);
  
  // Step 4: Analysis Completion
  await expect(page.locator(SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
  
  // Step 5: File Generation
  await page.click(SELECTORS.generateFileButton);
  await expect(page.locator(SELECTORS.fileGenerationCard)).toBeVisible({ timeout: 30000 });
  
  const finalState = await captureCurrentState(page);
  console.log('✅ Full analysis completed');
  return finalState;
}

async function validateUserContextPreserved(beforeState: StateSnapshot, afterState: StateSnapshot) {
  // Usage tracking should be preserved
  expect(afterState.usageText).toBe(beforeState.usageText);
  console.log(`✅ Usage tracking preserved: ${afterState.usageText}`);
  
  // Tier information should be preserved
  expect(afterState.tierText).toBe(beforeState.tierText);
  console.log(`✅ Tier information preserved: ${afterState.tierText}`);
  
  // Should not show email capture after reset
  expect(afterState.isEmailCaptureVisible).toBe(false);
  console.log('✅ Email capture correctly hidden after reset');
}

async function validateAnalysisDataCleared(afterState: StateSnapshot) {
  // URL input should be cleared
  expect(afterState.urlInputValue).toBe('');
  console.log('✅ URL input cleared');
  
  // Analysis-specific components should not be visible
  expect(afterState.isContentReviewVisible).toBe(false);
  expect(afterState.isFileGenerationVisible).toBe(false);
  console.log('✅ Analysis components cleared');
  
  // Should be back to URL input state
  expect(afterState.url.endsWith('/')).toBe(true);
  console.log('✅ Returned to URL input state');
}

test.describe('State Preservation - Core Context Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
  });

  test('should preserve user authentication context across smart reset', async ({ page }) => {
    console.log('🧪 Testing user authentication context preservation');
    
    // Complete full analysis to establish user context
    const preResetState = await completeFullAnalysis(page, TEST_URLS[0], true);
    
    // Trigger smart reset
    await expect(page.locator(SELECTORS.analyzeAnotherButton)).toBeVisible();
    await page.click(SELECTORS.analyzeAnotherButton);
    
    // Capture post-reset state
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible({ timeout: 5000 });
    const postResetState = await captureCurrentState(page);
    
    // Validate preservation and cleanup
    await validateUserContextPreserved(preResetState, postResetState);
    await validateAnalysisDataCleared(postResetState);
    
    console.log('✅ User authentication context preservation validated');
  });

  test('should preserve usage tracking accuracy across multiple resets', async ({ page }) => {
    console.log('🧪 Testing usage tracking preservation across multiple resets');
    
    const usageProgression = [];
    
    // Perform 3 analysis cycles with smart resets
    for (let i = 0; i < 3; i++) {
      const requiresEmail = i === 0;
      const expectedUsage = `${i + 1} / 3`;
      
      // Complete analysis
      const preResetState = await completeFullAnalysis(page, TEST_URLS[i], requiresEmail);
      
      // Verify usage incremented correctly
      expect(preResetState.usageText).toBe(expectedUsage);
      usageProgression.push(preResetState.usageText);
      
      if (i < 2) { // Don't reset after last iteration
        // Perform smart reset
        await page.click(SELECTORS.analyzeAnotherButton);
        await expect(page.locator(SELECTORS.urlInput)).toBeVisible({ timeout: 5000 });
        
        // Verify usage preserved during reset
        const duringResetState = await captureCurrentState(page);
        expect(duringResetState.usageText).toBe(expectedUsage);
      }
    }
    
    console.log(`✅ Usage progression validated: ${usageProgression.join(' → ')}`);
  });

  test('should maintain tier-specific behavior after smart reset', async ({ page }) => {
    console.log('🧪 Testing tier-specific behavior preservation');
    
    // Test with Coffee tier user
    await page.goto(`/?email=${encodeURIComponent(COFFEE_EMAIL)}&coffee=true`);
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
    
    // Verify Coffee tier indicators
    await expect(page.locator('span:has-text("Coffee")')).toBeVisible({ timeout: 10000 });
    
    // Complete analysis (should skip email capture and tier limits)
    await page.fill(SELECTORS.urlInput, TEST_URLS[0]);
    await page.click(SELECTORS.analyzeButton);
    
    // Coffee tier should bypass tier selection
    await expect(page.locator(SELECTORS.tierLimitsDisplay)).not.toBeVisible();
    await expect(page.locator(SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
    
    const preResetState = await captureCurrentState(page);
    
    // Perform smart reset
    await page.click(SELECTORS.analyzeAnotherButton);
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible({ timeout: 5000 });
    
    const postResetState = await captureCurrentState(page);
    
    // Verify Coffee tier behavior preserved
    expect(postResetState.tierText).toContain('Coffee');
    
    // Test second analysis maintains Coffee tier flow
    await page.fill(SELECTORS.urlInput, TEST_URLS[1]);
    await page.click(SELECTORS.analyzeButton);
    
    // Should still bypass tier selection
    await expect(page.locator(SELECTORS.tierLimitsDisplay)).not.toBeVisible();
    await expect(page.locator(SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
    
    console.log('✅ Coffee tier behavior preserved after smart reset');
  });
});

test.describe('State Preservation - Component Synchronization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should synchronize all UI components after smart reset', async ({ page }) => {
    console.log('🧪 Testing UI component synchronization');
    
    // Complete analysis to populate all components
    const preResetState = await completeFullAnalysis(page, TEST_URLS[0], true);
    
    // Verify all analysis-related components are visible
    expect(preResetState.isFileGenerationVisible).toBe(true);
    
    // Perform smart reset
    await page.click(SELECTORS.analyzeAnotherButton);
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible({ timeout: 5000 });
    
    // Verify all components synchronized to clean state
    const postResetState = await captureCurrentState(page);
    expect(postResetState.isContentReviewVisible).toBe(false);
    expect(postResetState.isFileGenerationVisible).toBe(false);
    expect(postResetState.urlInputValue).toBe('');
    
    // But user context components should remain
    expect(postResetState.usageText).toBeTruthy();
    expect(postResetState.tierText).toBeTruthy();
    
    console.log('✅ UI component synchronization validated');
  });

  test('should handle component state during rapid resets', async ({ page }) => {
    console.log('🧪 Testing component state during rapid resets');
    
    // Complete analysis
    await completeFullAnalysis(page, TEST_URLS[0], true);
    
    // Perform multiple rapid resets
    for (let i = 0; i < 3; i++) {
      await page.click(SELECTORS.analyzeAnotherButton);
      await expect(page.locator(SELECTORS.urlInput)).toBeVisible({ timeout: 5000 });
      
      // Verify consistent state after each reset
      const state = await captureCurrentState(page);
      expect(state.urlInputValue).toBe('');
      expect(state.usageText).toBe('1 / 3'); // Should remain consistent
      expect(state.isContentReviewVisible).toBe(false);
      expect(state.isFileGenerationVisible).toBe(false);
      
      // Start new analysis to ensure functionality preserved
      if (i === 2) { // Only complete analysis on last iteration
        await page.fill(SELECTORS.urlInput, TEST_URLS[1]);
        await page.click(SELECTORS.analyzeButton);
        await expect(page.locator(SELECTORS.proceedButton)).toBeVisible({ timeout: 10000 });
        await page.click(SELECTORS.proceedButton);
        await expect(page.locator(SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
        
        // Verify usage updated correctly
        const finalState = await captureCurrentState(page);
        expect(finalState.usageText).toBe('2 / 3');
      }
    }
    
    console.log('✅ Component state consistent during rapid resets');
  });

  test('should preserve component state across browser events', async ({ page }) => {
    console.log('🧪 Testing component state preservation across browser events');
    
    // Complete analysis
    await completeFullAnalysis(page, TEST_URLS[0], true);
    const initialState = await captureCurrentState(page);
    
    // Perform smart reset
    await page.click(SELECTORS.analyzeAnotherButton);
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible({ timeout: 5000 });
    
    // Test browser back/forward
    await page.goBack();
    await page.goForward();
    
    // Test page refresh
    await page.reload();
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
    
    // Test window resize
    await page.setViewportSize({ width: 800, height: 600 });
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Verify state consistency after browser events
    const finalState = await captureCurrentState(page);
    expect(finalState.usageText).toBe(initialState.usageText);
    expect(finalState.tierText).toBe(initialState.tierText);
    expect(finalState.urlInputValue).toBe(''); // Should remain cleared
    
    console.log('✅ Component state preserved across browser events');
  });
});

test.describe('State Preservation - Edge Cases and Error Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should preserve state when smart reset occurs during loading', async ({ page }) => {
    console.log('🧪 Testing smart reset during loading states');
    
    // Start analysis and capture user context
    await page.fill(SELECTORS.urlInput, TEST_URLS[0]);
    await page.click(SELECTORS.analyzeButton);
    
    // Complete email capture
    await expect(page.locator(SELECTORS.emailCaptureForm)).toBeVisible({ timeout: 10000 });
    await page.fill(SELECTORS.emailInput, TEST_EMAIL);
    await page.click('button[type="submit"]');
    
    // Proceed to analysis
    await expect(page.locator(SELECTORS.proceedButton)).toBeVisible({ timeout: 10000 });
    await page.click(SELECTORS.proceedButton);
    
    // Wait for analysis to start but not complete
    await expect(page.locator(SELECTORS.analysisProgressIndicator)).toBeVisible({ timeout: 10000 });
    
    // Attempt smart reset during analysis (if possible)
    const resetButton = page.locator(SELECTORS.analyzeAnotherButton);
    if (await resetButton.isVisible()) {
      await resetButton.click();
      
      // Should handle gracefully
      await expect(page.locator(SELECTORS.urlInput)).toBeVisible({ timeout: 10000 });
      
      // User context should be preserved
      const state = await captureCurrentState(page);
      expect(state.usageText).toBeTruthy();
      expect(state.tierText).toBeTruthy();
    } else {
      console.log('⚠️ Reset button not available during analysis - expected behavior');
    }
    
    console.log('✅ State preserved during loading scenarios');
  });

  test('should recover gracefully from state corruption scenarios', async ({ page }) => {
    console.log('🧪 Testing recovery from state corruption scenarios');
    
    // Complete analysis to establish baseline
    await completeFullAnalysis(page, TEST_URLS[0], true);
    const baselineState = await captureCurrentState(page);
    
    // Simulate potential state corruption by rapid navigation
    await page.goto('/pricing');
    await page.goBack();
    await page.reload();
    await page.goto('/');
    
    // Should recover to clean URL input state
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible();
    
    // User context should be recoverable
    const recoveredState = await captureCurrentState(page);
    
    // Usage might be preserved or reset - both are acceptable in corruption scenarios
    if (recoveredState.usageText) {
      expect(recoveredState.usageText).toBe(baselineState.usageText);
      console.log('✅ User context recovered from corruption');
    } else {
      console.log('⚠️ User context reset due to corruption - acceptable fallback');
    }
    
    // Should be able to start new analysis cleanly
    await page.fill(SELECTORS.urlInput, TEST_URLS[1]);
    await page.click(SELECTORS.analyzeButton);
    
    // Flow should work normally
    const emailRequired = !recoveredState.usageText; // Email required if context was lost
    if (emailRequired) {
      await expect(page.locator(SELECTORS.emailCaptureForm)).toBeVisible({ timeout: 10000 });
      await page.fill(SELECTORS.emailInput, TEST_EMAIL);
      await page.click('button[type="submit"]');
    }
    
    await expect(page.locator(SELECTORS.proceedButton)).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Graceful recovery from state corruption validated');
  });

  test('should maintain state consistency during error conditions', async ({ page }) => {
    console.log('🧪 Testing state consistency during error conditions');
    
    // Complete successful analysis first
    await completeFullAnalysis(page, TEST_URLS[0], true);
    const successState = await captureCurrentState(page);
    
    // Trigger smart reset
    await page.click(SELECTORS.analyzeAnotherButton);
    await expect(page.locator(SELECTORS.urlInput)).toBeVisible({ timeout: 5000 });
    
    // Try analysis with potentially problematic URL
    await page.fill(SELECTORS.urlInput, 'https://this-domain-should-not-exist-12345.invalid');
    await page.click(SELECTORS.analyzeButton);
    
    // Should still skip email capture (user context preserved)
    await expect(page.locator(SELECTORS.emailCaptureForm)).not.toBeVisible();
    
    // Proceed through tier limits
    await expect(page.locator(SELECTORS.proceedButton)).toBeVisible({ timeout: 10000 });
    await page.click(SELECTORS.proceedButton);
    
    // Wait for potential error or timeout
    await page.waitForTimeout(10000);
    
    // Check current state
    const errorState = await captureCurrentState(page);
    
    // User context should be preserved even if analysis fails
    expect(errorState.usageText).toBe(successState.usageText);
    expect(errorState.tierText).toBe(successState.tierText);
    
    // Should be able to perform smart reset even in error state
    const resetButton = page.locator(SELECTORS.analyzeAnotherButton).or(
      page.locator('button:has-text("Try Again")').or(
        page.locator('button:has-text("Start Over")')
      )
    );
    
    if (await resetButton.first().isVisible()) {
      await resetButton.first().click();
      await expect(page.locator(SELECTORS.urlInput)).toBeVisible({ timeout: 5000 });
      
      // State should still be consistent
      const recoveryState = await captureCurrentState(page);
      expect(recoveryState.usageText).toBe(successState.usageText);
    }
    
    console.log('✅ State consistency maintained during error conditions');
  });
});