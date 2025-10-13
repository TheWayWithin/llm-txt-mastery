import { Page, expect } from '@playwright/test';
import { UAT_CONFIG, TIER_CONFIGS } from './uat-test-data';

/**
 * UAT Helper Functions
 * Reusable utilities for User Acceptance Testing
 */
export class UATHelpers {
  constructor(
    private page: Page,
    private baseUrl: string
  ) {}

  // ============================================================================
  // NAVIGATION HELPERS
  // ============================================================================

  async navigateToHome(): Promise<void> {
    await this.page.goto(this.baseUrl);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToPricing(): Promise<void> {
    await this.page.goto(`${this.baseUrl}/pricing`);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToDashboard(): Promise<void> {
    await this.page.goto(`${this.baseUrl}/dashboard`);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToLogin(): Promise<void> {
    await this.page.goto(`${this.baseUrl}/login`);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToSignup(): Promise<void> {
    await this.page.goto(`${this.baseUrl}/signup`);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToAccountSettings(): Promise<void> {
    await this.page.goto(`${this.baseUrl}/account/settings`);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToSubscriptionManagement(): Promise<void> {
    await this.page.goto(`${this.baseUrl}/account/subscription`);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToAnalytics(): Promise<void> {
    await this.page.goto(`${this.baseUrl}/analytics`);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToSignupFromLanding(): Promise<void> {
    // Look for any CTA button that redirects to signup
    const ctaButtons = [
      'button:has-text("Start Free Analysis")',
      'button:has-text("Get Started Free")',
      'a:has-text("Sign Up")',
      '[data-testid="cta-signup"]',
      '.cta-button',
    ];
    
    for (const selector of ctaButtons) {
      const button = this.page.locator(selector);
      if (await button.isVisible()) {
        await button.click();
        await this.page.waitForLoadState('networkidle');
        break;
      }
    }
    
    // Verify we're on signup page
    await this.page.waitForURL(/signup/);
  }

  async navigateToAuthenticatedAnalysis(): Promise<void> {
    // Navigate to the analysis page that requires authentication
    await this.page.goto(`${this.baseUrl}/analysis`);
    await this.page.waitForLoadState('networkidle');
    
    // Alternative paths if /analysis doesn't exist
    const alternativePaths = ['/dashboard/analysis', '/app/analysis', '/dashboard'];
    
    for (const path of alternativePaths) {
      if (this.page.url().includes('login') || this.page.url().includes('signup')) {
        await this.page.goto(`${this.baseUrl}${path}`);
        await this.page.waitForLoadState('networkidle');
        break;
      }
    }
  }

  // ============================================================================
  // AUTHENTICATION HELPERS
  // ============================================================================

  async login(email: string, password: string): Promise<boolean> {
    await this.navigateToLogin();
    
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    
    try {
      await this.page.waitForURL(/dashboard|home/, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    const userMenu = this.page.locator('[data-testid="user-menu"], .user-menu, button:has-text("Account")');
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await this.page.click('button:has-text("Logout"), a:has-text("Logout")');
      await this.page.waitForURL(/login|home/);
    }
  }

  async isLoggedIn(): Promise<boolean> {
    const indicators = [
      '[data-testid="user-menu"]',
      '.user-menu',
      'button:has-text("Dashboard")',
      'a:has-text("Dashboard")',
    ];
    
    for (const selector of indicators) {
      if (await this.page.locator(selector).isVisible()) {
        return true;
      }
    }
    
    return false;
  }

  async fillRegistrationForm(data: {
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<void> {
    await this.page.fill('input[name="email"], input[type="email"]', data.email);
    await this.page.fill('input[name="password"], input[type="password"]:first', data.password);
    await this.page.fill('input[name="confirmPassword"], input[type="password"]:last', data.confirmPassword);
  }

  async simulateEmailVerification(email: string): Promise<void> {
    // In test environment, simulate clicking verification link
    const verificationToken = 'test-verification-token';
    await this.page.goto(`${this.baseUrl}/verify-email?token=${verificationToken}&email=${email}`);
    await this.page.waitForLoadState('networkidle');
  }

  async simulatePasswordReset(email: string, newPassword: string): Promise<void> {
    // In test environment, simulate password reset
    const resetToken = 'test-reset-token';
    await this.page.goto(`${this.baseUrl}/reset-password?token=${resetToken}`);
    await this.page.fill('input[name="newPassword"], input[type="password"]:first', newPassword);
    await this.page.fill('input[name="confirmPassword"], input[type="password"]:last', newPassword);
    await this.page.click('button[type="submit"]');
  }

  async completeSignupFlow(data: {
    email: string;
    password: string;
    tier: string;
  }): Promise<void> {
    // Fill in the signup form
    await this.fillRegistrationForm({
      email: data.email,
      password: data.password,
      confirmPassword: data.password,
    });
    
    // Select tier if tier selection is available on signup page
    const tierSelector = `[data-tier="${data.tier}"], button:has-text("${data.tier}")`;
    const tierButton = this.page.locator(tierSelector);
    if (await tierButton.isVisible({ timeout: 3000 })) {
      await tierButton.click();
    }
    
    // Submit the signup form
    await this.page.click('button[type="submit"], button:has-text("Sign Up"), button:has-text("Create Account")');
    
    // Wait for response/redirect
    await this.page.waitForLoadState('networkidle');
    
    // Handle email verification if required
    const verificationMessage = this.page.locator('text=/verification email/i, text=/check your email/i');
    if (await verificationMessage.isVisible({ timeout: 3000 })) {
      // In test environment, simulate email verification
      await this.simulateEmailVerification(data.email);
    }
  }

  // ============================================================================
  // ANALYSIS HELPERS
  // ============================================================================

  async enterWebsiteURL(url: string): Promise<void> {
    const urlInput = this.page.locator('input[type="url"], input[placeholder*="URL"], input[placeholder*="website"]').first();
    await urlInput.fill(url);
  }

  async clickAnalyzeButton(): Promise<void> {
    const button = this.page.locator('button:has-text("Analyze"), button:has-text("Start"), button[type="submit"]').first();
    await button.click();
  }

  async handleEmailCapture(email: string, tier: string = 'starter'): Promise<void> {
    // Check if email capture modal appears
    const emailInput = this.page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill(email);
      
      // Select tier if options are shown
      const tierButtons = await this.page.locator(`button:has-text("${tier}"), [data-tier="${tier}"]`).count();
      if (tierButtons > 0) {
        await this.page.locator(`button:has-text("${tier}"), [data-tier="${tier}"]`).first().click();
      }
      
      // Submit email capture
      await this.page.click('button:has-text("Continue"), button:has-text("Start"), button[type="submit"]');
    }
  }

  async waitForAnalysis(timeout: number = 60000): Promise<boolean> {
    try {
      // Wait for analysis completion indicators
      const completionIndicators = [
        'text=/analysis complete/i',
        'text=/download.*llms\\.txt/i',
        '[data-testid="download-button"]',
        'button:has-text("Download")',
      ];
      
      await this.page.waitForSelector(completionIndicators.join(', '), { timeout });
      return true;
    } catch {
      return false;
    }
  }

  async performAnalysis(url: string): Promise<void> {
    await this.navigateToHome();
    await this.enterWebsiteURL(url);
    await this.clickAnalyzeButton();
    await this.waitForAnalysis();
  }

  async performTierSpecificAnalysis(tier: string, url: string): Promise<void> {
    // Ensure we're on the authenticated analysis page
    await this.navigateToAuthenticatedAnalysis();
    
    // Enter the URL for analysis
    await this.enterWebsiteURL(url);
    
    // Click analyze button
    await this.clickAnalyzeButton();
    
    // Wait for analysis to complete
    await this.waitForAnalysis();
  }

  async performQuickAuthenticatedAnalysis(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.performTierSpecificAnalysis('free', url);
      return { success: true };
    } catch (error) {
      const errorMessage = await this.page.locator('.error-message, [role="alert"]').textContent();
      return { success: false, error: errorMessage || 'unknown' };
    }
  }

  async performAuthenticatedBulkAnalysis(urls: string[]): Promise<{ success: boolean; analyzed: number }> {
    let analyzed = 0;
    
    for (const url of urls) {
      try {
        await this.performTierSpecificAnalysis('scale', url);
        analyzed++;
        
        // Add small delay between analyses
        await this.page.waitForTimeout(2000);
      } catch {
        // Continue with next URL
      }
    }
    
    return {
      success: analyzed > 0,
      analyzed,
    };
  }

  async performQuickAnalysis(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.performAnalysis(url);
      return { success: true };
    } catch (error) {
      const errorMessage = await this.page.locator('.error-message, [role="alert"]').textContent();
      return { success: false, error: errorMessage || 'unknown' };
    }
  }

  async performBulkAnalysis(urls: string[]): Promise<{ success: boolean; analyzed: number }> {
    let analyzed = 0;
    
    for (const url of urls) {
      try {
        await this.performAnalysis(url);
        analyzed++;
      } catch {
        // Continue with next URL
      }
    }
    
    return {
      success: analyzed > 0,
      analyzed,
    };
  }

  async downloadLLMsFile(): Promise<boolean> {
    try {
      const downloadButton = this.page.locator('button:has-text("Download"), a:has-text("Download")').first();
      
      // Start waiting for download before clicking
      const downloadPromise = this.page.waitForEvent('download');
      await downloadButton.click();
      const download = await downloadPromise;
      
      // Save to specific path for testing
      const path = `tests/downloads/${Date.now()}-llms.txt`;
      await download.saveAs(path);
      
      return true;
    } catch {
      return false;
    }
  }

  async downloadAndReadLLMsFile(): Promise<string> {
    const downloadButton = this.page.locator('button:has-text("Download"), a:has-text("Download")').first();
    
    const downloadPromise = this.page.waitForEvent('download');
    await downloadButton.click();
    const download = await downloadPromise;
    
    // Read the downloaded file content
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    
    return new Promise((resolve) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
  }

  async getAnalysisMetadata(): Promise<any> {
    // Try to extract metadata from the page
    const metadata = await this.page.evaluate(() => {
      // Look for metadata in various locations
      const metadataElement = document.querySelector('[data-testid="analysis-metadata"]');
      if (metadataElement) {
        return JSON.parse(metadataElement.textContent || '{}');
      }
      
      // Fallback: extract from page content
      return {
        analysisMethod: document.querySelector('[data-method]')?.getAttribute('data-method'),
        totalPagesFound: parseInt(document.querySelector('[data-pages-found]')?.textContent || '0'),
        siteType: document.querySelector('[data-site-type]')?.getAttribute('data-site-type'),
      };
    });
    
    return metadata;
  }

  // ============================================================================
  // TIER & USAGE HELPERS
  // ============================================================================

  async checkDailyLimit(tier: string): Promise<string> {
    const limitMessage = await this.page.locator('.usage-limit, [data-testid="usage-limit"]').textContent();
    return limitMessage || '';
  }

  async getDailyLimit(): Promise<number> {
    const limitText = await this.page.locator('[data-testid="daily-limit"], .daily-limit').textContent();
    const match = limitText?.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  async getCoffeeCredits(): Promise<number> {
    const creditsText = await this.page.locator('[data-testid="coffee-credits"], .coffee-credits').textContent();
    const match = creditsText?.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  async checkEnhancedFeatures(): Promise<{
    aiQualityScoring: boolean;
    sixPhaseGeneration: boolean;
  }> {
    const features = {
      aiQualityScoring: await this.page.locator('[data-testid="quality-score"], .quality-score').isVisible(),
      sixPhaseGeneration: await this.page.locator('[data-testid="six-phase"], text=/phase/i').isVisible(),
    };
    
    return features;
  }

  async simulateDailyLimitReached(tier: string): Promise<void> {
    // Simulate reaching daily limit by setting a flag or making multiple requests
    await this.page.evaluate((tierName) => {
      localStorage.setItem(`dailyLimitReached_${tierName}`, 'true');
    }, tier);
    
    await this.page.reload();
  }

  // ============================================================================
  // PAYMENT HELPERS
  // ============================================================================

  async handleStripeCheckout(options: {
    tier: string;
    testCard: any;
  }): Promise<boolean> {
    try {
      // Wait for Stripe iframe
      await this.page.waitForSelector('iframe[name*="stripe"]', { timeout: 10000 });
      
      const stripeFrame = this.page.frameLocator('iframe[name*="stripe"]').first();
      
      // Fill card details
      await stripeFrame.locator('[placeholder="Card number"]').fill(options.testCard.number);
      await stripeFrame.locator('[placeholder="MM / YY"]').fill(options.testCard.exp);
      await stripeFrame.locator('[placeholder="CVC"]').fill(options.testCard.cvc);
      await stripeFrame.locator('[placeholder="ZIP"]').fill(options.testCard.zip);
      
      // Submit payment
      await this.page.click('button:has-text("Pay"), button:has-text("Subscribe")');
      
      // Wait for success redirect
      await this.page.waitForURL(/success|dashboard/, { timeout: 15000 });
      
      return true;
    } catch {
      return false;
    }
  }

  async handleStripeSubscription(options: {
    tier: string;
    testCard: any;
  }): Promise<boolean> {
    return this.handleStripeCheckout(options);
  }

  async updatePaymentMethod(testCard: any): Promise<boolean> {
    try {
      await this.page.click('button:has-text("Update Payment Method")');
      
      // Wait for Stripe elements
      await this.page.waitForSelector('iframe[name*="stripe"]');
      
      const stripeFrame = this.page.frameLocator('iframe[name*="stripe"]').first();
      
      // Update card
      await stripeFrame.locator('[placeholder="Card number"]').fill(testCard.number);
      await stripeFrame.locator('[placeholder="MM / YY"]').fill(testCard.exp);
      await stripeFrame.locator('[placeholder="CVC"]').fill(testCard.cvc);
      
      await this.page.click('button:has-text("Update"), button:has-text("Save")');
      
      // Wait for success message
      await this.page.waitForSelector('text=/successfully updated/i', { timeout: 5000 });
      
      return true;
    } catch {
      return false;
    }
  }

  async getSubscriptionDetails(): Promise<{
    tier: string;
    status: string;
    price: string;
  }> {
    const details = {
      tier: await this.page.locator('[data-testid="subscription-tier"]').textContent() || '',
      status: await this.page.locator('[data-testid="subscription-status"]').textContent() || '',
      price: await this.page.locator('[data-testid="subscription-price"]').textContent() || '',
    };
    
    return details;
  }

  // ============================================================================
  // TESTING UTILITIES
  // ============================================================================

  async simulateNetworkError(): Promise<void> {
    await this.page.route('**/api/**', route => route.abort('failed'));
  }

  async restoreNetwork(): Promise<void> {
    await this.page.unroute('**/api/**');
  }

  async measureAPIResponse(endpoint: string): Promise<{ time: number; status: number }> {
    const startTime = Date.now();
    const response = await this.page.request.get(`${this.baseUrl}${endpoint}`);
    const endTime = Date.now();
    
    return {
      time: endTime - startTime,
      status: response.status(),
    };
  }

  async checkAccessibility(): Promise<{
    violations: any[];
    passes: number;
  }> {
    // Basic accessibility checks
    const violations: any[] = [];
    
    // Check for alt text on images
    const imagesWithoutAlt = await this.page.locator('img:not([alt])').count();
    if (imagesWithoutAlt > 0) {
      violations.push({
        rule: 'images-alt-text',
        count: imagesWithoutAlt,
      });
    }
    
    // Check for form labels
    const inputsWithoutLabels = await this.page.locator('input:not([aria-label]):not([id])').count();
    if (inputsWithoutLabels > 0) {
      violations.push({
        rule: 'form-labels',
        count: inputsWithoutLabels,
      });
    }
    
    // Check for heading hierarchy
    const h1Count = await this.page.locator('h1').count();
    if (h1Count !== 1) {
      violations.push({
        rule: 'heading-hierarchy',
        message: `Found ${h1Count} h1 tags, expected 1`,
      });
    }
    
    // Check for keyboard navigation
    const focusableElements = await this.page.locator('a, button, input, select, textarea, [tabindex]').count();
    
    return {
      violations,
      passes: focusableElements,
    };
  }

  async captureScreenshot(name: string): Promise<string> {
    const screenshotPath = `tests/screenshots/uat-${name}-${Date.now()}.png`;
    await this.page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
    return screenshotPath;
  }

  async getPerformanceMetrics(): Promise<any> {
    return this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      };
    });
  }

  async checkConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit to collect any errors
    await this.page.waitForTimeout(1000);
    
    return errors;
  }

  async checkBrokenLinks(): Promise<string[]> {
    const brokenLinks: string[] = [];
    
    const links = await this.page.locator('a[href]').all();
    
    for (const link of links.slice(0, 10)) { // Check first 10 links
      const href = await link.getAttribute('href');
      if (href && href.startsWith('http')) {
        const response = await this.page.request.head(href).catch(() => null);
        if (!response || response.status() >= 400) {
          brokenLinks.push(href);
        }
      }
    }
    
    return brokenLinks;
  }
}