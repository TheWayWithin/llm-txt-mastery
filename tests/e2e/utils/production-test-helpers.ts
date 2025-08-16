import { Page, Locator, expect } from '@playwright/test';
import { TemporaryEmailService } from './temp-email-service';

/**
 * Production Test Helpers
 * 
 * Specialized utilities for testing the double-increment bug fix
 * and email verification flow against the production site.
 */

export class ProductionTestHelpers {
  private page: Page;
  private emailService: TemporaryEmailService;

  constructor(page: Page) {
    this.page = page;
    this.emailService = new TemporaryEmailService();
  }

  /**
   * Generate unique test data for each test run
   */
  generateTestData() {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    
    return {
      testUrl: 'https://example.com',
      uniqueId: `${timestamp}-${randomId}`,
      timestamp,
    };
  }

  /**
   * Navigate to homepage and wait for it to load
   */
  async navigateToHomepage() {
    await this.page.goto('/', { waitUntil: 'networkidle' });
    await expect(this.page).toHaveTitle(/LLM\.txt Mastery/);
  }

  /**
   * Navigate to signup page and wait for form to load
   */
  async navigateToSignup() {
    await this.page.goto('/signup', { waitUntil: 'networkidle' });
    await expect(this.page.locator('form')).toBeVisible();
  }

  /**
   * Fill and submit signup form with temporary email
   */
  async signupWithTemporaryEmail(): Promise<string> {
    const email = await this.emailService.createTemporaryEmail();
    const password = `TestPass123!${Date.now()}`;

    // Fill signup form
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    
    // Submit form
    await this.page.click('button[type="submit"]');
    
    return email;
  }

  /**
   * Wait for redirect to check-email page and validate content
   */
  async validateCheckEmailPage() {
    // Wait for redirect to check-email page
    await this.page.waitForURL('**/check-email', { timeout: 15000 });
    
    // Validate page content
    await expect(this.page.locator('h1, h2')).toContainText(/check.*email/i);
    await expect(this.page.locator('text=verification')).toBeVisible();
    
    // Ensure we're not on analyze page
    expect(this.page.url()).not.toContain('/analyze');
  }

  /**
   * Navigate to analyze page directly (simulating email verification)
   */
  async navigateToAnalyze() {
    await this.page.goto('/analyze', { waitUntil: 'networkidle' });
    await expect(this.page.locator('input[placeholder*="URL"]')).toBeVisible();
  }

  /**
   * Perform website analysis and return analysis ID
   */
  async performAnalysis(url: string = 'https://example.com'): Promise<string> {
    // Enter URL and start analysis
    await this.page.fill('input[placeholder*="URL"]', url);
    await this.page.click('button:has-text("Analyze")');
    
    // Wait for analysis to start
    await this.page.waitForSelector('text=Analysis in progress', { timeout: 15000 });
    
    // Wait for analysis to complete (up to 2 minutes)
    await this.page.waitForSelector('text=Analysis Complete', { timeout: 120000 });
    
    // Extract analysis ID from URL or page content
    const url_current = this.page.url();
    const analysisIdMatch = url_current.match(/analysis[\/=]([a-f0-9-]+)/i);
    return analysisIdMatch ? analysisIdMatch[1] : 'unknown';
  }

  /**
   * Check usage counter display and extract current count
   */
  async getCurrentUsageCount(): Promise<{ current: number, total: number }> {
    // Look for usage counter patterns like "2/3" or "2 of 3"
    const counterElement = this.page.locator('text=/\\d+\s*[\/of]\s*\\d+/');
    await expect(counterElement).toBeVisible({ timeout: 10000 });
    
    const counterText = await counterElement.textContent();
    
    // Parse counter text (supports "2/3" or "2 of 3" formats)
    const match = counterText?.match(/(\d+)\s*[\/of]\s*(\d+)/);
    if (!match) {
      throw new Error(`Could not parse usage counter: ${counterText}`);
    }
    
    return {
      current: parseInt(match[1]),
      total: parseInt(match[2])
    };
  }

  /**
   * Validate that usage counter shows expected progression
   */
  async validateUsageProgression(expectedCurrent: number, expectedTotal: number = 3) {
    const usage = await this.getCurrentUsageCount();
    
    expect(usage.current).toBe(expectedCurrent);
    expect(usage.total).toBe(expectedTotal);
    
    console.log(`✓ Usage counter correctly shows: ${usage.current}/${usage.total}`);
  }

  /**
   * Check if daily limit modal is displayed
   */
  async checkForDailyLimitModal(): Promise<boolean> {
    try {
      await this.page.waitForSelector('text=daily limit', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for daily limit modal and validate content
   */
  async validateDailyLimitModal() {
    await expect(this.page.locator('text=daily limit')).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator('text=upgrade')).toBeVisible();
    console.log('✓ Daily limit modal appeared as expected');
  }

  /**
   * Take screenshot with timestamp for debugging
   */
  async takeDebugScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({
      path: `debug-${name}-${timestamp}.png`,
      fullPage: true
    });
    console.log(`📸 Debug screenshot saved: debug-${name}-${timestamp}.png`);
  }

  /**
   * Login with existing credentials (for authenticated testing)
   */
  async loginWithCredentials(email: string, password: string) {
    await this.page.goto('/login', { waitUntil: 'networkidle' });
    
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    
    // Wait for successful login redirect
    await this.page.waitForURL('**/analyze', { timeout: 15000 });
  }

  /**
   * Logout current user
   */
  async logout() {
    // Look for logout button or menu
    const logoutButton = this.page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Sign Out")');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await this.page.waitForURL('**/', { timeout: 10000 });
    }
  }

  /**
   * Wait for specific text to appear with timeout
   */
  async waitForText(text: string | RegExp, timeout: number = 30000) {
    await expect(this.page.locator(`text=${text}`)).toBeVisible({ timeout });
  }

  /**
   * Clear browser storage and cookies
   */
  async clearBrowserData() {
    try {
      await this.page.context().clearCookies();
      await this.page.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {
          console.log('Storage access restricted, skipping clear');
        }
      });
    } catch (error) {
      console.log('Browser data clear failed (may be restricted):', error.message);
    }
  }

  /**
   * Cleanup method for test teardown
   */
  async cleanup() {
    this.emailService.cleanup();
    await this.clearBrowserData();
  }

  /**
   * Get debug information about the current page state
   */
  async getDebugInfo() {
    const url = this.page.url();
    const title = await this.page.title();
    
    let localStorage = {};
    let sessionStorage = {};
    
    try {
      localStorage = await this.page.evaluate(() => ({ ...localStorage }));
      sessionStorage = await this.page.evaluate(() => ({ ...sessionStorage }));
    } catch (error) {
      console.log('Storage access restricted for debug info');
    }
    
    return {
      url,
      title,
      localStorage,
      sessionStorage,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Browser detection helper
 */
export function getBrowserName(page: Page): string {
  const userAgent = page.context().browser()?.browserType().name() || 'unknown';
  return userAgent;
}

/**
 * Retry helper for flaky operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error.message);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError!;
}