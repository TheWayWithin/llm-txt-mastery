import { Page, expect } from '@playwright/test';
import { MockUser, createMockUser, createCoffeeUser } from './auth-helpers';

/**
 * Smart Reset Test Utilities
 * 
 * Specialized utilities for testing the START_NEW_ANALYSIS event and smart reset
 * functionality. These helpers ensure consistent testing patterns across the
 * smart reset test suite.
 */

// Test data constants
export const SMART_RESET_TEST_DATA = {
  FREE_TIER_EMAIL: 'idaltddlpaxgqjrecs@enotj.com',
  COFFEE_TIER_EMAIL: 'coffee-test@example.com',
  TEST_URLS: [
    'https://example.com',
    'https://github.com/microsoft/vscode',
    'https://docs.npmjs.com',
    'https://stackoverflow.com/questions'
  ]
} as const;

// Comprehensive selector collection for smart reset testing
export const SMART_RESET_SELECTORS = {
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
  
  // Component states
  emailCaptureForm: 'form:has(input[type="email"])',
  tierLimitsDisplay: 'text=Choose Your Analysis Type',
  contentReviewCard: '[class*="card"]:has-text("Content Review")',
  fileGenerationCard: '[class*="card"]:has-text("File Generated Successfully")',
  analysisProgressIndicator: '[class*="progress"], text=/analyzing/i, text=/discovering/i',
  
  // Error states
  errorDisplay: 'text=/error/i, text=/failed/i, [role="alert"]',
  loadingSpinner: '[class*="spinner"], [class*="loading"], text=/loading/i',
  
  // Upgrade prompts
  upgradePrompts: 'text=/upgrade/i, text=/coffee/i, text=/buy me a coffee/i'
} as const;

/**
 * Snapshot of application state for comparison testing
 */
export interface SmartResetStateSnapshot {
  url: string;
  urlInputValue: string;
  usageText: string | null;
  tierText: string | null;
  isEmailCaptureVisible: boolean;
  isTierLimitsVisible: boolean;
  isContentReviewVisible: boolean;
  isFileGenerationVisible: boolean;
  hasErrors: boolean;
  hasUpgradePrompts: boolean;
  timestamp: number;
}

/**
 * Analysis completion options
 */
export interface AnalysisOptions {
  url?: string;
  requiresEmail?: boolean;
  generateFile?: boolean;
  email?: string;
  tier?: 'starter' | 'coffee';
}

/**
 * Capture comprehensive state snapshot for comparison
 */
export async function captureStateSnapshot(page: Page): Promise<SmartResetStateSnapshot> {
  const snapshot: SmartResetStateSnapshot = {
    url: page.url(),
    urlInputValue: await page.locator(SMART_RESET_SELECTORS.urlInput).inputValue().catch(() => ''),
    usageText: await page.locator(SMART_RESET_SELECTORS.usageCounter).textContent().catch(() => null),
    tierText: await page.locator(SMART_RESET_SELECTORS.tierBadge).textContent().catch(() => null),
    isEmailCaptureVisible: await page.locator(SMART_RESET_SELECTORS.emailCaptureForm).isVisible().catch(() => false),
    isTierLimitsVisible: await page.locator(SMART_RESET_SELECTORS.tierLimitsDisplay).isVisible().catch(() => false),
    isContentReviewVisible: await page.locator(SMART_RESET_SELECTORS.contentReviewCard).isVisible().catch(() => false),
    isFileGenerationVisible: await page.locator(SMART_RESET_SELECTORS.fileGenerationCard).isVisible().catch(() => false),
    hasErrors: await page.locator(SMART_RESET_SELECTORS.errorDisplay).isVisible().catch(() => false),
    hasUpgradePrompts: await page.locator(SMART_RESET_SELECTORS.upgradePrompts).isVisible().catch(() => false),
    timestamp: Date.now()
  };
  
  console.log('📸 Smart reset state captured:', {
    url: snapshot.url,
    urlInput: snapshot.urlInputValue,
    usage: snapshot.usageText,
    tier: snapshot.tierText,
    emailCapture: snapshot.isEmailCaptureVisible,
    tierLimits: snapshot.isTierLimitsVisible,
    contentReview: snapshot.isContentReviewVisible,
    fileGeneration: snapshot.isFileGenerationVisible
  });
  
  return snapshot;
}

/**
 * Complete a full analysis flow from URL input to file generation
 */
export async function completeAnalysisFlow(
  page: Page, 
  options: AnalysisOptions = {}
): Promise<SmartResetStateSnapshot> {
  const {
    url = SMART_RESET_TEST_DATA.TEST_URLS[0],
    requiresEmail = false,
    generateFile = true,
    email = SMART_RESET_TEST_DATA.FREE_TIER_EMAIL,
    tier = 'starter'
  } = options;
  
  console.log(`🧪 Starting complete analysis flow for ${url}`);
  
  // Step 1: URL Input
  await page.fill(SMART_RESET_SELECTORS.urlInput, url);
  await page.click(SMART_RESET_SELECTORS.analyzeButton);
  
  // Step 2: Email Capture (if required)
  if (requiresEmail) {
    await expect(page.locator(SMART_RESET_SELECTORS.emailCaptureForm)).toBeVisible({ timeout: 10000 });
    await page.fill(SMART_RESET_SELECTORS.emailInput, email);
    
    // Select tier if not coffee
    if (tier !== 'coffee') {
      const tierButton = page.locator(`button:has-text("${tier === 'starter' ? 'Free' : tier}")`);
      if (await tierButton.isVisible()) {
        await tierButton.click();
      }
    }
    
    await page.click('button[type="submit"]');
  }
  
  // Step 3: Tier Limits (skip for coffee tier)
  if (tier !== 'coffee') {
    await expect(page.locator(SMART_RESET_SELECTORS.proceedButton)).toBeVisible({ timeout: 15000 });
    await page.click(SMART_RESET_SELECTORS.proceedButton);
  }
  
  // Step 4: Analysis Completion
  await expect(page.locator(SMART_RESET_SELECTORS.contentReviewCard)).toBeVisible({ timeout: 60000 });
  
  // Step 5: File Generation (optional)
  if (generateFile) {
    await page.click(SMART_RESET_SELECTORS.generateFileButton);
    await expect(page.locator(SMART_RESET_SELECTORS.fileGenerationCard)).toBeVisible({ timeout: 30000 });
  }
  
  const finalState = await captureStateSnapshot(page);
  console.log('✅ Analysis flow completed successfully');
  return finalState;
}

/**
 * Perform smart reset by clicking "Analyze Another Website"
 */
export async function performSmartReset(page: Page): Promise<SmartResetStateSnapshot> {
  console.log('🔄 Performing smart reset');
  
  await expect(page.locator(SMART_RESET_SELECTORS.analyzeAnotherButton)).toBeVisible({ timeout: 10000 });
  await page.click(SMART_RESET_SELECTORS.analyzeAnotherButton);
  
  // Wait for reset to complete
  await expect(page.locator(SMART_RESET_SELECTORS.urlInput)).toBeVisible({ timeout: 5000 });
  
  const postResetState = await captureStateSnapshot(page);
  console.log('✅ Smart reset completed');
  return postResetState;
}

/**
 * Verify that user context is preserved after smart reset
 */
export async function validateUserContextPreserved(
  beforeState: SmartResetStateSnapshot,
  afterState: SmartResetStateSnapshot
): Promise<void> {
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

/**
 * Verify that analysis data is properly cleared after smart reset
 */
export async function validateAnalysisDataCleared(afterState: SmartResetStateSnapshot): Promise<void> {
  // URL input should be cleared
  expect(afterState.urlInputValue).toBe('');
  console.log('✅ URL input cleared');
  
  // Analysis-specific components should not be visible
  expect(afterState.isContentReviewVisible).toBe(false);
  expect(afterState.isFileGenerationVisible).toBe(false);
  console.log('✅ Analysis components cleared');
  
  // Should not show tier limits (since user context is preserved)
  expect(afterState.isTierLimitsVisible).toBe(false);
  console.log('✅ Tier limits correctly hidden (user context preserved)');
  
  // Should be back to URL input state
  expect(afterState.url.endsWith('/')).toBe(true);
  console.log('✅ Returned to URL input state');
}

/**
 * Verify usage count accuracy
 */
export async function verifyUsageCount(
  page: Page, 
  expectedCurrent: number, 
  maxCount: number = 3
): Promise<void> {
  const expectedText = `${expectedCurrent} / ${maxCount}`;
  await expect(page.locator(`text=${expectedText}`)).toBeVisible({ timeout: 10000 });
  console.log(`✅ Usage count verified: ${expectedText}`);
}

/**
 * Verify Coffee tier indicators and behavior
 */
export async function verifyCoffeeTierBehavior(page: Page): Promise<void> {
  // Should show Coffee tier badge
  await expect(page.locator('span:has-text("Coffee")')).toBeVisible({ timeout: 10000 });
  console.log('✅ Coffee tier badge visible');
  
  // Should show premium credits instead of daily limits
  await expect(page.locator('text=/premium credits/i, text=/credit/i')).toBeVisible({ timeout: 5000 });
  console.log('✅ Premium credits display verified');
}

/**
 * Setup Coffee tier user context via URL parameters
 */
export async function setupCoffeeTierUser(page: Page, email?: string): Promise<void> {
  const coffeeEmail = email || SMART_RESET_TEST_DATA.COFFEE_TIER_EMAIL;
  await page.goto(`/?email=${encodeURIComponent(coffeeEmail)}&coffee=true`);
  await expect(page.locator(SMART_RESET_SELECTORS.urlInput)).toBeVisible();
  await verifyCoffeeTierBehavior(page);
  console.log('✅ Coffee tier user setup completed');
}

/**
 * Monitor state machine transitions during smart reset
 */
export async function monitorSmartResetTransitions(page: Page): Promise<string[]> {
  const transitions: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('START_NEW_ANALYSIS') || 
        text.includes('State transition') ||
        text.includes('🔄') ||
        text.includes('Smart reset') ||
        text.includes('Preserving user context')) {
      transitions.push(text);
    }
  });
  
  return transitions;
}

/**
 * Validate smart reset transitions occurred correctly
 */
export function validateSmartResetTransitions(transitions: string[]): void {
  const hasStartNewAnalysis = transitions.some(t => t.includes('START_NEW_ANALYSIS'));
  const hasUserContextPreservation = transitions.some(t => 
    t.includes('Preserving user context') || t.includes('preserved')
  );
  
  expect(hasStartNewAnalysis).toBe(true);
  console.log('✅ START_NEW_ANALYSIS transition detected');
  
  if (hasUserContextPreservation) {
    console.log('✅ User context preservation confirmed via console logs');
  }
}

/**
 * Test multiple analysis cycles with usage tracking
 */
export async function testMultipleAnalysisCycles(
  page: Page,
  cycleCount: number = 3,
  startingEmail?: string
): Promise<SmartResetStateSnapshot[]> {
  const states: SmartResetStateSnapshot[] = [];
  const email = startingEmail || SMART_RESET_TEST_DATA.FREE_TIER_EMAIL;
  
  for (let i = 0; i < cycleCount; i++) {
    const requiresEmail = i === 0; // Only first cycle needs email
    const url = SMART_RESET_TEST_DATA.TEST_URLS[i % SMART_RESET_TEST_DATA.TEST_URLS.length];
    
    console.log(`🔄 Starting analysis cycle ${i + 1}/${cycleCount}`);
    
    // Complete analysis
    const analysisState = await completeAnalysisFlow(page, {
      url,
      requiresEmail,
      email,
      generateFile: true
    });
    
    // Verify usage count incremented
    await verifyUsageCount(page, i + 1, 3);
    states.push(analysisState);
    
    // Perform smart reset (except on last iteration)
    if (i < cycleCount - 1) {
      const resetState = await performSmartReset(page);
      states.push(resetState);
      
      // Verify usage count preserved during reset
      await verifyUsageCount(page, i + 1, 3);
    }
  }
  
  console.log(`✅ Completed ${cycleCount} analysis cycles`);
  return states;
}

/**
 * Test rapid smart reset scenarios
 */
export async function testRapidSmartResets(
  page: Page,
  resetCount: number = 5
): Promise<void> {
  // Complete initial analysis
  await completeAnalysisFlow(page, { requiresEmail: true });
  
  // Perform multiple rapid resets
  for (let i = 0; i < resetCount; i++) {
    console.log(`🔄 Rapid reset ${i + 1}/${resetCount}`);
    
    const beforeState = await captureStateSnapshot(page);
    await performSmartReset(page);
    const afterState = await captureStateSnapshot(page);
    
    // Validate each reset
    await validateUserContextPreserved(beforeState, afterState);
    await validateAnalysisDataCleared(afterState);
  }
  
  console.log(`✅ Completed ${resetCount} rapid resets successfully`);
}

/**
 * Test smart reset error recovery
 */
export async function testSmartResetErrorRecovery(page: Page): Promise<void> {
  // Complete successful analysis first
  const successState = await completeAnalysisFlow(page, { requiresEmail: true });
  
  // Trigger smart reset
  const resetState = await performSmartReset(page);
  
  // Try analysis with problematic URL
  await page.fill(SMART_RESET_SELECTORS.urlInput, 'https://invalid-domain-for-testing.invalid');
  await page.click(SMART_RESET_SELECTORS.analyzeButton);
  
  // Should still skip email capture (user context preserved)
  await expect(page.locator(SMART_RESET_SELECTORS.emailCaptureForm)).not.toBeVisible();
  
  // Proceed through flow
  await expect(page.locator(SMART_RESET_SELECTORS.proceedButton)).toBeVisible({ timeout: 10000 });
  await page.click(SMART_RESET_SELECTORS.proceedButton);
  
  // Wait for potential error state
  await page.waitForTimeout(10000);
  
  // User context should still be preserved
  const errorState = await captureStateSnapshot(page);
  expect(errorState.usageText).toBe(successState.usageText);
  expect(errorState.tierText).toBe(successState.tierText);
  
  console.log('✅ Smart reset error recovery validated');
}

/**
 * Comprehensive smart reset validation
 */
export async function validateSmartResetFunctionality(
  page: Page,
  options: {
    multiCycle?: boolean;
    rapidReset?: boolean;
    errorRecovery?: boolean;
    coffeeTier?: boolean;
  } = {}
): Promise<void> {
  const { multiCycle = true, rapidReset = false, errorRecovery = false, coffeeTier = false } = options;
  
  console.log('🧪 Starting comprehensive smart reset validation');
  
  if (coffeeTier) {
    await setupCoffeeTierUser(page);
  }
  
  if (multiCycle) {
    await testMultipleAnalysisCycles(page, coffeeTier ? 4 : 3); // Coffee tier can do more
  }
  
  if (rapidReset) {
    await testRapidSmartResets(page);
  }
  
  if (errorRecovery) {
    await testSmartResetErrorRecovery(page);
  }
  
  console.log('✅ Comprehensive smart reset validation completed');
}

/**
 * Assert that smart reset maintains state consistency
 */
export async function assertSmartResetConsistency(
  beforeState: SmartResetStateSnapshot,
  afterState: SmartResetStateSnapshot
): Promise<void> {
  // User context preservation
  await validateUserContextPreserved(beforeState, afterState);
  
  // Analysis data cleanup
  await validateAnalysisDataCleared(afterState);
  
  // No errors should occur
  expect(afterState.hasErrors).toBe(false);
  console.log('✅ No errors detected after smart reset');
  
  // State should be ready for new analysis
  expect(afterState.url.endsWith('/')).toBe(true);
  expect(afterState.urlInputValue).toBe('');
  console.log('✅ Ready for new analysis after smart reset');
}

/**
 * Create test context for smart reset monitoring
 */
export async function createSmartResetTestContext(page: Page): Promise<{
  stateSnapshots: SmartResetStateSnapshot[];
  transitions: string[];
  errors: string[];
  addSnapshot: () => Promise<void>;
  cleanup: () => void;
}> {
  const stateSnapshots: SmartResetStateSnapshot[] = [];
  const transitions: string[] = [];
  const errors: string[] = [];
  
  const consoleHandler = (msg: any) => {
    const text = msg.text();
    if (text.includes('START_NEW_ANALYSIS') || 
        text.includes('State transition') ||
        text.includes('🔄') ||
        text.includes('Smart reset')) {
      transitions.push(text);
    }
  };
  
  const errorHandler = (error: Error) => {
    errors.push(error.message);
  };
  
  page.on('console', consoleHandler);
  page.on('pageerror', errorHandler);
  
  return {
    stateSnapshots,
    transitions,
    errors,
    addSnapshot: async () => {
      const snapshot = await captureStateSnapshot(page);
      stateSnapshots.push(snapshot);
    },
    cleanup: () => {
      page.off('console', consoleHandler);
      page.off('pageerror', errorHandler);
    }
  };
}