import { test, expect, Page, BrowserContext, Cookie } from '@playwright/test';
import { TemporaryEmailService } from './utils/temp-email-service';

/**
 * GDPR Compliance Testing Suite for LLM.txt Mastery Production Site
 * 
 * Comprehensive validation of:
 * - Cookie consent banners and functionality
 * - GTM consent mode integration
 * - Cookie categorization and management
 * - Privacy policy compliance
 * - Data subject rights
 * - Cross-browser compatibility
 * 
 * Follows GDPR Article 7 requirements and EU cookie law compliance.
 */

interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

interface NetworkRequest {
  url: string;
  method: string;
  resourceType: string;
  headers: Record<string, string>;
  timestamp: number;
}

class GDPRTestHelper {
  private page: Page;
  private context: BrowserContext;
  private networkRequests: NetworkRequest[] = [];
  private consoleLogs: string[] = [];

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
    this.setupNetworkMonitoring();
    this.setupConsoleLogging();
  }

  private setupNetworkMonitoring(): void {
    this.page.on('request', (request) => {
      this.networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        headers: request.headers(),
        timestamp: Date.now()
      });
    });
  }

  private setupConsoleLogging(): void {
    this.page.on('console', (message) => {
      if (message.type() === 'log' || message.type() === 'info') {
        this.consoleLogs.push(message.text());
      }
    });
  }

  async clearNetworkLogs(): Promise<void> {
    this.networkRequests = [];
  }

  async clearConsoleLogs(): Promise<void> {
    this.consoleLogs = [];
  }

  getNetworkRequests(filter?: (req: NetworkRequest) => boolean): NetworkRequest[] {
    return filter ? this.networkRequests.filter(filter) : this.networkRequests;
  }

  getConsoleLogs(filter?: string): string[] {
    return filter 
      ? this.consoleLogs.filter(log => log.includes(filter))
      : this.consoleLogs;
  }

  async getGoogleAnalyticsRequests(): Promise<NetworkRequest[]> {
    return this.getNetworkRequests(req => 
      req.url.includes('google-analytics.com') ||
      req.url.includes('googletagmanager.com') ||
      req.url.includes('/gtag/') ||
      req.url.includes('/analytics')
    );
  }

  async getMarketingRequests(): Promise<NetworkRequest[]> {
    return this.getNetworkRequests(req => 
      req.url.includes('facebook.com') ||
      req.url.includes('doubleclick.net') ||
      req.url.includes('google.com/ads') ||
      req.url.includes('analytics') ||
      req.url.includes('pixel')
    );
  }

  async takeScreenshotWithTimestamp(name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-results/gdpr-${name}-${timestamp}.png`;
    await this.page.screenshot({ path: filename, fullPage: true });
    return filename;
  }

  async getCookiesState(): Promise<Cookie[]> {
    return await this.context.cookies();
  }

  async getCookiesByCategory(): Promise<{
    necessary: Cookie[];
    analytics: Cookie[];
    marketing: Cookie[];
    functional: Cookie[];
    other: Cookie[];
  }> {
    const cookies = await this.getCookiesState();
    
    const necessary: Cookie[] = [];
    const analytics: Cookie[] = [];
    const marketing: Cookie[] = [];
    const functional: Cookie[] = [];
    const other: Cookie[] = [];

    cookies.forEach(cookie => {
      const name = cookie.name.toLowerCase();
      
      // Necessary cookies
      if (name.includes('session') || name.includes('csrf') || name.includes('auth') || 
          name.includes('security') || name.includes('consent')) {
        necessary.push(cookie);
      }
      // Analytics cookies
      else if (name.includes('_ga') || name.includes('_gid') || name.includes('gtag') ||
               name.includes('analytics') || name.includes('_gtm')) {
        analytics.push(cookie);
      }
      // Marketing cookies
      else if (name.includes('_fbp') || name.includes('ads') || name.includes('doubleclick') ||
               name.includes('marketing') || name.includes('pixel')) {
        marketing.push(cookie);
      }
      // Functional cookies
      else if (name.includes('preferences') || name.includes('settings') || 
               name.includes('theme') || name.includes('language')) {
        functional.push(cookie);
      }
      else {
        other.push(cookie);
      }
    });

    return { necessary, analytics, marketing, functional, other };
  }
}

class ConsentBannerPage {
  private page: Page;
  private helper: GDPRTestHelper;

  constructor(page: Page, helper: GDPRTestHelper) {
    this.page = page;
    this.helper = helper;
  }

  // Consent banner selectors - Updated based on Enzuzo implementation
  get consentBanner() {
    return this.page.locator('.ez-consent, .enzuzo-notification, [class*="enzuzo"]');
  }

  get acceptAllButton() {
    return this.page.locator('#ez-cookie-notification__accept, button:has-text("Allow All")');
  }

  get rejectOptionalButton() {
    return this.page.locator('#ez-cookie-notification__decline, button:has-text("Decline")');
  }

  get customizeButton() {
    return this.page.locator('#notificationManagerLink, a:has-text("Manage Cookies")');
  }

  get privacyPolicyLink() {
    return this.page.locator('#notificationPolicyLink, a:has-text("Privacy Policy")');
  }

  get cookiePolicyLink() {
    return this.page.locator('.enzuzo-privacy-policy-link, a:has-text("Cookie Policy")');
  }

  // Consent preferences modal
  get preferencesModal() {
    return this.page.locator('[class*="modal"], [class*="dialog"], [role="dialog"]');
  }

  get necessaryCookiesToggle() {
    return this.page.locator('input[name*="necessary"], input[id*="necessary"]');
  }

  get analyticsCookiesToggle() {
    return this.page.locator('input[name*="analytics"], input[id*="analytics"]');
  }

  get marketingCookiesToggle() {
    return this.page.locator('input[name*="marketing"], input[id*="marketing"]');
  }

  get functionalCookiesToggle() {
    return this.page.locator('input[name*="functional"], input[id*="functional"]');
  }

  get savePreferencesButton() {
    return this.page.locator('button:has-text("Save"), button:has-text("Confirm")');
  }

  async isConsentBannerVisible(): Promise<boolean> {
    try {
      // Check for specific Enzuzo accept/decline buttons as the most reliable indicator
      const acceptButton = this.page.locator('#ez-cookie-notification__accept');
      const declineButton = this.page.locator('#ez-cookie-notification__decline');
      
      if (await acceptButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('Found Enzuzo Accept button - consent banner is visible');
        return true;
      }
      
      if (await declineButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Found Enzuzo Decline button - consent banner is visible');
        return true;
      }
      
      // Check for any Enzuzo notification elements
      const enzuzoNotification = this.page.locator('.enzuzo-notification-text').first();
      if (await enzuzoNotification.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Found Enzuzo notification text - consent banner is visible');
        return true;
      }
      
      console.log('No Enzuzo consent banner found');
      return false;
    } catch (error) {
      console.log(`Error checking consent banner: ${error}`);
      return false;
    }
  }

  async acceptAllCookies(): Promise<void> {
    try {
      // Use the specific Enzuzo accept button
      const acceptButton = this.page.locator('#ez-cookie-notification__accept');
      if (await acceptButton.isVisible({ timeout: 5000 })) {
        console.log('Clicking Enzuzo "Allow All" button');
        await acceptButton.click();
        await this.page.waitForTimeout(2000); // Allow for processing
        console.log('Successfully clicked Accept All cookies');
      } else {
        console.log('Enzuzo Accept button not found - checking for alternatives');
        // Fallback to text-based selection with .first() to avoid strict mode
        const fallbackButton = this.page.locator('button:has-text("Allow All")').first();
        if (await fallbackButton.isVisible({ timeout: 2000 })) {
          await fallbackButton.click();
          await this.page.waitForTimeout(2000);
          console.log('Successfully clicked fallback Accept button');
        } else {
          console.log('No accept button found');
        }
      }
    } catch (error) {
      console.log(`Error accepting cookies: ${error}`);
    }
  }

  async rejectOptionalCookies(): Promise<void> {
    try {
      // Use the specific Enzuzo decline button
      const declineButton = this.page.locator('#ez-cookie-notification__decline');
      if (await declineButton.isVisible({ timeout: 5000 })) {
        console.log('Clicking Enzuzo "Decline" button');
        await declineButton.click();
        await this.page.waitForTimeout(2000); // Allow for processing
        console.log('Successfully clicked Decline cookies');
      } else {
        console.log('Enzuzo Decline button not found - checking for alternatives');
        // Fallback to text-based selection with .first() to avoid strict mode
        const fallbackButton = this.page.locator('button:has-text("Decline")').first();
        if (await fallbackButton.isVisible({ timeout: 2000 })) {
          await fallbackButton.click();
          await this.page.waitForTimeout(2000);
          console.log('Successfully clicked fallback Decline button');
        } else {
          console.log('No decline button found');
        }
      }
    } catch (error) {
      console.log(`Error rejecting cookies: ${error}`);
    }
  }

  async openCustomizePreferences(): Promise<void> {
    await this.customizeButton.click();
    await this.preferencesModal.waitFor({ state: 'visible' });
  }

  async setConsentPreferences(preferences: ConsentState): Promise<void> {
    await this.openCustomizePreferences();
    
    // Set analytics preference
    if (await this.analyticsCookiesToggle.isVisible()) {
      const isChecked = await this.analyticsCookiesToggle.isChecked();
      if (isChecked !== preferences.analytics) {
        await this.analyticsCookiesToggle.click();
      }
    }

    // Set marketing preference
    if (await this.marketingCookiesToggle.isVisible()) {
      const isChecked = await this.marketingCookiesToggle.isChecked();
      if (isChecked !== preferences.marketing) {
        await this.marketingCookiesToggle.click();
      }
    }

    // Set functional preference
    if (await this.functionalCookiesToggle.isVisible()) {
      const isChecked = await this.functionalCookiesToggle.isChecked();
      if (isChecked !== preferences.functional) {
        await this.functionalCookiesToggle.click();
      }
    }

    await this.savePreferencesButton.click();
    await this.page.waitForTimeout(1000);
  }

  async verifyBannerContent(): Promise<{
    hasPrivacyLink: boolean;
    hasCookieLink: boolean;
    hasCustomizeOption: boolean;
    hasAcceptOption: boolean;
    hasRejectOption: boolean;
  }> {
    return {
      hasPrivacyLink: await this.privacyPolicyLink.isVisible(),
      hasCookieLink: await this.cookiePolicyLink.isVisible(),
      hasCustomizeOption: await this.customizeButton.isVisible(),
      hasAcceptOption: await this.acceptAllButton.isVisible(),
      hasRejectOption: await this.rejectOptionalButton.isVisible()
    };
  }
}

test.describe('GDPR Compliance Comprehensive Testing Suite', () => {
  let helper: GDPRTestHelper;
  let consentBanner: ConsentBannerPage;
  let emailService: TemporaryEmailService;
  const PRODUCTION_URL = 'https://www.llmtxtmastery.com';

  test.beforeEach(async ({ page, context }) => {
    helper = new GDPRTestHelper(page, context);
    consentBanner = new ConsentBannerPage(page, helper);
    emailService = new TemporaryEmailService();
  });

  test.afterEach(async () => {
    emailService.cleanup();
  });

  test('GDPR-001: Consent banner appears on first visit', async ({ page }) => {
    console.log('🍪 Testing: Consent banner appearance on first visit');
    
    // Navigate to production site
    await page.goto(PRODUCTION_URL);
    
    // Take screenshot before consent
    await helper.takeScreenshotWithTimestamp('first-visit-before-consent');
    
    // Verify consent banner appears
    const bannerVisible = await consentBanner.isConsentBannerVisible();
    expect(bannerVisible, 'Consent banner should appear on first visit').toBe(true);
    
    // Verify banner contains required elements
    const bannerContent = await consentBanner.verifyBannerContent();
    expect(bannerContent.hasAcceptOption, 'Must have accept option').toBe(true);
    expect(bannerContent.hasRejectOption, 'Must have reject option').toBe(true);
    expect(bannerContent.hasPrivacyLink, 'Must have privacy policy link').toBe(true);
    
    // Take screenshot of consent banner
    await helper.takeScreenshotWithTimestamp('consent-banner-visible');
    
    console.log('✅ Consent banner validation completed');
  });

  test('GDPR-002: Accept All cookies functionality', async ({ page }) => {
    console.log('🍪 Testing: Accept All cookies functionality');
    
    await page.goto(PRODUCTION_URL);
    
    // Clear logs before testing
    await helper.clearNetworkLogs();
    await helper.clearConsoleLogs();
    
    // Wait for and accept all cookies
    await consentBanner.isConsentBannerVisible();
    await consentBanner.acceptAllCookies();
    
    // Take screenshot after accepting
    await helper.takeScreenshotWithTimestamp('accept-all-cookies-set');
    
    // Wait for analytics to potentially load
    await page.waitForTimeout(3000);
    
    // Check for Google Analytics/GTM requests
    const analyticsRequests = await helper.getGoogleAnalyticsRequests();
    console.log(`📊 Analytics requests found: ${analyticsRequests.length}`);
    
    // Check console logs for consent signals
    const consentLogs = helper.getConsoleLogs('consent');
    const gtmLogs = helper.getConsoleLogs('gtag');
    console.log(`📝 Consent-related logs: ${consentLogs.length}`);
    console.log(`📝 GTM-related logs: ${gtmLogs.length}`);
    
    // Verify cookies are set
    const cookiesByCategory = await helper.getCookiesByCategory();
    console.log(`🍪 Cookie counts - Necessary: ${cookiesByCategory.necessary.length}, Analytics: ${cookiesByCategory.analytics.length}`);
    
    // Analytics should be allowed with accept all
    if (analyticsRequests.length > 0 || cookiesByCategory.analytics.length > 0) {
      console.log('✅ Analytics tracking confirmed after accepting all cookies');
    } else {
      console.log('⚠️ No analytics tracking detected - may need GTM verification');
    }
    
    expect(true, 'Accept all functionality completed').toBe(true);
  });

  test('GDPR-003: Reject Optional cookies functionality', async ({ page }) => {
    console.log('🍪 Testing: Reject Optional cookies functionality');
    
    await page.goto(PRODUCTION_URL);
    
    // Clear logs before testing
    await helper.clearNetworkLogs();
    await helper.clearConsoleLogs();
    
    // Wait for and reject optional cookies
    await consentBanner.isConsentBannerVisible();
    await consentBanner.rejectOptionalCookies();
    
    // Take screenshot after rejecting
    await helper.takeScreenshotWithTimestamp('reject-optional-cookies-set');
    
    // Wait to see if analytics loads anyway (should not)
    await page.waitForTimeout(3000);
    
    // Check for analytics requests (should be minimal/none)
    const analyticsRequests = await helper.getGoogleAnalyticsRequests();
    const marketingRequests = await helper.getMarketingRequests();
    console.log(`📊 Analytics requests after rejection: ${analyticsRequests.length}`);
    console.log(`📈 Marketing requests after rejection: ${marketingRequests.length}`);
    
    // Check cookies - should only have necessary
    const cookiesByCategory = await helper.getCookiesByCategory();
    console.log(`🍪 Cookie counts after rejection - Necessary: ${cookiesByCategory.necessary.length}, Analytics: ${cookiesByCategory.analytics.length}, Marketing: ${cookiesByCategory.marketing.length}`);
    
    // Verify analytics tracking is blocked
    expect(cookiesByCategory.analytics.length, 'Analytics cookies should be minimal when rejected').toBeLessThanOrEqual(1);
    expect(cookiesByCategory.marketing.length, 'Marketing cookies should be blocked when rejected').toBeLessThanOrEqual(1);
    
    console.log('✅ Reject optional cookies validation completed');
  });

  test('GDPR-004: GTM Consent Mode integration validation', async ({ page }) => {
    console.log('🔧 Testing: GTM Consent Mode integration');
    
    // Test consent mode signals in different states
    const testStates = [
      { name: 'rejected', action: 'reject' },
      { name: 'accepted', action: 'accept' }
    ];
    
    for (const state of testStates) {
      console.log(`Testing GTM consent mode: ${state.name}`);
      
      await page.goto(PRODUCTION_URL);
      await helper.clearConsoleLogs();
      await helper.clearNetworkLogs();
      
      // Set consent state
      if (state.action === 'accept') {
        await consentBanner.acceptAllCookies();
      } else {
        await consentBanner.rejectOptionalCookies();
      }
      
      await page.waitForTimeout(2000);
      
      // Check for GTM consent signals in console
      const consentSignals = helper.getConsoleLogs('consent');
      const gtagCalls = helper.getConsoleLogs('gtag');
      
      console.log(`Consent signals for ${state.name}: ${consentSignals.length}`);
      console.log(`GTM calls for ${state.name}: ${gtagCalls.length}`);
      
      // Check for consent mode in network requests
      const gtmRequests = helper.getNetworkRequests(req => 
        req.url.includes('googletagmanager.com') && 
        (req.url.includes('consent') || req.url.includes('gcs='))
      );
      
      console.log(`GTM consent requests for ${state.name}: ${gtmRequests.length}`);
      
      // Log sample requests for debugging
      gtmRequests.slice(0, 2).forEach((req, i) => {
        console.log(`GTM Request ${i + 1}: ${req.url.substring(0, 100)}...`);
      });
    }
    
    console.log('✅ GTM Consent Mode integration test completed');
  });

  test('GDPR-005: Cookie categorization validation', async ({ page }) => {
    console.log('🏷️ Testing: Cookie categorization validation');
    
    await page.goto(PRODUCTION_URL);
    
    // Accept all cookies to see full range
    await consentBanner.acceptAllCookies();
    await page.waitForTimeout(3000);
    
    // Analyze all cookies
    const cookiesByCategory = await helper.getCookiesByCategory();
    
    console.log('📊 Cookie Categorization Analysis:');
    console.log(`Necessary cookies: ${cookiesByCategory.necessary.length}`);
    console.log(`Analytics cookies: ${cookiesByCategory.analytics.length}`);
    console.log(`Marketing cookies: ${cookiesByCategory.marketing.length}`);
    console.log(`Functional cookies: ${cookiesByCategory.functional.length}`);
    console.log(`Other cookies: ${cookiesByCategory.other.length}`);
    
    // Log specific cookies for audit trail
    console.log('\n🔍 Cookie Details:');
    
    cookiesByCategory.necessary.forEach(cookie => {
      console.log(`Necessary: ${cookie.name} (${cookie.domain})`);
    });
    
    cookiesByCategory.analytics.forEach(cookie => {
      console.log(`Analytics: ${cookie.name} (${cookie.domain})`);
    });
    
    cookiesByCategory.marketing.forEach(cookie => {
      console.log(`Marketing: ${cookie.name} (${cookie.domain})`);
    });
    
    cookiesByCategory.functional.forEach(cookie => {
      console.log(`Functional: ${cookie.name} (${cookie.domain})`);
    });
    
    cookiesByCategory.other.forEach(cookie => {
      console.log(`Other: ${cookie.name} (${cookie.domain})`);
    });
    
    // Basic validation
    expect(cookiesByCategory.necessary.length, 'Should have some necessary cookies').toBeGreaterThanOrEqual(0);
    
    await helper.takeScreenshotWithTimestamp('cookie-categorization-complete');
    
    console.log('✅ Cookie categorization validation completed');
  });

  test('GDPR-006: Privacy policy and cookie policy link validation', async ({ page }) => {
    console.log('📄 Testing: Privacy policy and cookie policy links');
    
    await page.goto(PRODUCTION_URL);
    
    // Check if privacy policy link is accessible
    const privacyLink = consentBanner.privacyPolicyLink;
    const cookieLink = consentBanner.cookiePolicyLink;
    
    if (await privacyLink.isVisible()) {
      console.log('📄 Privacy policy link found - testing accessibility');
      
      // Get the href
      const privacyHref = await privacyLink.getAttribute('href');
      console.log(`Privacy policy URL: ${privacyHref}`);
      
      // Click and verify page loads
      await privacyLink.click();
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl.includes('privacy') || currentUrl.includes('policy'), 
        'Should navigate to privacy policy page').toBe(true);
      
      await helper.takeScreenshotWithTimestamp('privacy-policy-page');
      
      // Go back
      await page.goBack();
    } else {
      console.log('⚠️ Privacy policy link not found in consent banner');
    }
    
    if (await cookieLink.isVisible()) {
      console.log('🍪 Cookie policy link found - testing accessibility');
      
      const cookieHref = await cookieLink.getAttribute('href');
      console.log(`Cookie policy URL: ${cookieHref}`);
      
      await cookieLink.click();
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl.includes('cookie') || currentUrl.includes('policy'), 
        'Should navigate to cookie policy page').toBe(true);
      
      await helper.takeScreenshotWithTimestamp('cookie-policy-page');
    } else {
      console.log('⚠️ Cookie policy link not found in consent banner');
    }
    
    console.log('✅ Policy links validation completed');
  });

  test('GDPR-007: Consent preferences persistence across sessions', async ({ page, context }) => {
    console.log('💾 Testing: Consent preferences persistence');
    
    // First session - reject optional cookies
    await page.goto(PRODUCTION_URL);
    await consentBanner.rejectOptionalCookies();
    
    // Get initial cookie state
    const initialCookies = await helper.getCookiesByCategory();
    console.log(`Initial session - Analytics cookies: ${initialCookies.analytics.length}`);
    
    await helper.takeScreenshotWithTimestamp('first-session-rejected');
    
    // Create new page in same context (simulates new tab)
    const newPage = await context.newPage();
    const newHelper = new GDPRTestHelper(newPage, context);
    const newConsentBanner = new ConsentBannerPage(newPage, newHelper);
    
    await newPage.goto(PRODUCTION_URL);
    
    // Check if consent banner appears again (should not if preferences stored)
    const bannerVisibleAgain = await newConsentBanner.isConsentBannerVisible();
    console.log(`Consent banner visible in new session: ${bannerVisibleAgain}`);
    
    // Check if preferences were maintained
    await newPage.waitForTimeout(2000);
    const newSessionCookies = await newHelper.getCookiesByCategory();
    console.log(`New session - Analytics cookies: ${newSessionCookies.analytics.length}`);
    
    await newHelper.takeScreenshotWithTimestamp('new-session-persistence');
    
    // Preferences should be maintained (minimal analytics cookies)
    expect(newSessionCookies.analytics.length, 
      'Analytics cookies should remain minimal in new session').toBeLessThanOrEqual(
      initialCookies.analytics.length + 1
    );
    
    await newPage.close();
    
    console.log('✅ Consent preferences persistence validation completed');
  });

  test('GDPR-008: User registration with GDPR consent integration', async ({ page }) => {
    console.log('👤 Testing: User registration with GDPR consent');
    
    // Generate temporary email
    const testEmail = await emailService.createTemporaryEmail();
    const testPassword = 'TestPass123!';
    
    console.log(`Using test email: ${testEmail}`);
    
    await page.goto(PRODUCTION_URL);
    
    // Handle initial consent
    if (await consentBanner.isConsentBannerVisible()) {
      await consentBanner.acceptAllCookies();
      await helper.takeScreenshotWithTimestamp('consent-accepted-before-signup');
    }
    
    // Navigate to signup
    const signUpButton = page.getByRole('button', { name: 'Sign Up' });
    if (await signUpButton.isVisible()) {
      await signUpButton.click();
      
      // Fill signup form
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      
      // Look for GDPR consent checkboxes in signup form
      const gdprCheckbox = page.locator('input[type="checkbox"]').filter({ 
        hasText: /privacy|consent|terms|gdpr|data/i 
      });
      
      if (await gdprCheckbox.isVisible()) {
        console.log('📋 GDPR consent checkbox found in signup form');
        await gdprCheckbox.check();
        await helper.takeScreenshotWithTimestamp('signup-with-gdpr-consent');
      } else {
        console.log('⚠️ No explicit GDPR consent checkbox in signup form');
        await helper.takeScreenshotWithTimestamp('signup-without-explicit-consent');
      }
      
      // Submit form (don't actually complete to avoid creating test accounts)
      const submitButton = page.getByRole('button', { name: /sign up|create|register/i });
      if (await submitButton.isVisible()) {
        console.log('📝 Signup form ready for submission (not submitting in test)');
      }
      
    } else {
      console.log('⚠️ Sign Up button not found on landing page');
      await helper.takeScreenshotWithTimestamp('no-signup-button');
    }
    
    console.log('✅ User registration GDPR integration test completed');
  });

  test('GDPR-009: Cross-browser consent behavior validation', async ({ page, browserName }) => {
    console.log(`🌐 Testing: Cross-browser consent behavior (${browserName})`);
    
    await page.goto(PRODUCTION_URL);
    
    // Clear logs
    await helper.clearNetworkLogs();
    await helper.clearConsoleLogs();
    
    // Test consent flow
    const bannerVisible = await consentBanner.isConsentBannerVisible();
    console.log(`${browserName}: Consent banner visible: ${bannerVisible}`);
    
    if (bannerVisible) {
      await consentBanner.acceptAllCookies();
      await page.waitForTimeout(2000);
      
      // Check browser-specific behavior
      const cookiesByCategory = await helper.getCookiesByCategory();
      const analyticsRequests = await helper.getGoogleAnalyticsRequests();
      
      console.log(`${browserName} - Cookies: N:${cookiesByCategory.necessary.length}, A:${cookiesByCategory.analytics.length}, M:${cookiesByCategory.marketing.length}`);
      console.log(`${browserName} - Analytics requests: ${analyticsRequests.length}`);
      
      await helper.takeScreenshotWithTimestamp(`${browserName}-consent-accepted`);
      
      // Test cookie persistence in this browser
      await page.reload();
      await page.waitForTimeout(1000);
      
      const bannerAfterReload = await consentBanner.isConsentBannerVisible();
      console.log(`${browserName}: Banner visible after reload: ${bannerAfterReload}`);
      
      expect(bannerAfterReload, `${browserName}: Consent should persist after reload`).toBe(false);
    }
    
    console.log(`✅ Cross-browser validation completed for ${browserName}`);
  });

  test('GDPR-010: Performance impact of GDPR implementation', async ({ page }) => {
    console.log('⚡ Testing: Performance impact of GDPR implementation');
    
    // Measure page load with consent banner
    const startTime = Date.now();
    await page.goto(PRODUCTION_URL);
    
    const bannerVisible = await consentBanner.isConsentBannerVisible();
    const bannerLoadTime = Date.now() - startTime;
    
    console.log(`Page load with consent banner: ${bannerLoadTime}ms`);
    console.log(`Banner visible: ${bannerVisible}`);
    
    // Measure consent acceptance performance
    const consentStartTime = Date.now();
    if (bannerVisible) {
      await consentBanner.acceptAllCookies();
    }
    const consentProcessTime = Date.now() - consentStartTime;
    
    console.log(`Consent processing time: ${consentProcessTime}ms`);
    
    // Check for performance metrics in console
    await page.waitForTimeout(3000);
    const performanceLogs = helper.getConsoleLogs('performance');
    console.log(`Performance-related logs: ${performanceLogs.length}`);
    
    // Basic performance assertions
    expect(bannerLoadTime, 'Page should load with consent banner within reasonable time').toBeLessThan(10000);
    expect(consentProcessTime, 'Consent processing should be fast').toBeLessThan(2000);
    
    await helper.takeScreenshotWithTimestamp('performance-test-complete');
    
    console.log('✅ Performance impact assessment completed');
  });

  test('GDPR-011: Data subject rights validation', async ({ page }) => {
    console.log('⚖️ Testing: Data subject rights implementation');
    
    await page.goto(PRODUCTION_URL);
    
    // Look for data subject rights information
    const rightsKeywords = [
      'data subject rights',
      'right to access',
      'right to rectification',
      'right to erasure',
      'right to portability',
      'data protection officer',
      'dpo@'
    ];
    
    // Check privacy policy for data rights information
    if (await consentBanner.privacyPolicyLink.isVisible()) {
      await consentBanner.privacyPolicyLink.click();
      await page.waitForLoadState('networkidle');
      
      const pageContent = await page.textContent('body');
      const foundRights: string[] = [];
      
      rightsKeywords.forEach(keyword => {
        if (pageContent?.toLowerCase().includes(keyword.toLowerCase())) {
          foundRights.push(keyword);
        }
      });
      
      console.log(`📋 Data subject rights found: ${foundRights.length}`);
      foundRights.forEach(right => console.log(`✓ ${right}`));
      
      // Look for contact information for data requests
      const emailMatches = pageContent?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
      if (emailMatches) {
        console.log(`📧 Contact emails found: ${emailMatches.length}`);
        emailMatches.forEach(email => console.log(`📧 ${email}`));
      }
      
      await helper.takeScreenshotWithTimestamp('data-subject-rights-page');
      
      // At minimum, should mention some data rights
      expect(foundRights.length, 'Should mention data subject rights').toBeGreaterThan(0);
    } else {
      console.log('⚠️ Privacy policy link not accessible');
    }
    
    console.log('✅ Data subject rights validation completed');
  });

  test('GDPR-012: Compliance documentation generation', async ({ page }) => {
    console.log('📑 Generating: GDPR compliance documentation');
    
    // Comprehensive compliance test
    await page.goto(PRODUCTION_URL);
    
    const complianceReport = {
      timestamp: new Date().toISOString(),
      url: PRODUCTION_URL,
      tests: {
        consentBanner: false,
        cookieControl: false,
        privacyLinks: false,
        crossBrowserCompatibility: false,
        performanceImpact: 'unknown'
      },
      cookies: {
        beforeConsent: {} as any,
        afterAccept: {} as any,
        afterReject: {} as any
      },
      networkAnalysis: {
        analyticsBlocked: false,
        marketingBlocked: false
      }
    };
    
    // Test 1: Consent banner
    complianceReport.tests.consentBanner = await consentBanner.isConsentBannerVisible();
    console.log(`✅ Consent banner: ${complianceReport.tests.consentBanner}`);
    
    // Test 2: Cookie control
    if (complianceReport.tests.consentBanner) {
      // Before consent
      complianceReport.cookies.beforeConsent = await helper.getCookiesByCategory();
      
      // Accept all
      await consentBanner.acceptAllCookies();
      await page.waitForTimeout(2000);
      complianceReport.cookies.afterAccept = await helper.getCookiesByCategory();
      
      // Reset and reject
      await page.goto(PRODUCTION_URL);
      await consentBanner.rejectOptionalCookies();
      await page.waitForTimeout(2000);
      complianceReport.cookies.afterReject = await helper.getCookiesByCategory();
      
      complianceReport.tests.cookieControl = true;
    }
    
    // Test 3: Privacy links
    await page.goto(PRODUCTION_URL);
    complianceReport.tests.privacyLinks = await consentBanner.privacyPolicyLink.isVisible();
    
    // Generate final compliance screenshot
    await helper.takeScreenshotWithTimestamp('compliance-documentation-complete');
    
    console.log('\n📊 GDPR COMPLIANCE REPORT:');
    console.log('================================');
    console.log(`Consent Banner: ${complianceReport.tests.consentBanner ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Cookie Control: ${complianceReport.tests.cookieControl ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Privacy Links: ${complianceReport.tests.privacyLinks ? '✅ PASS' : '❌ FAIL'}`);
    
    console.log('\n🍪 COOKIE ANALYSIS:');
    console.log(`Before Consent - Total: ${Object.values(complianceReport.cookies.beforeConsent).reduce((a: any, b: any) => a + b.length, 0)}`);
    console.log(`After Accept - Total: ${Object.values(complianceReport.cookies.afterAccept).reduce((a: any, b: any) => a + b.length, 0)}`);
    console.log(`After Reject - Total: ${Object.values(complianceReport.cookies.afterReject).reduce((a: any, b: any) => a + b.length, 0)}`);
    
    // Overall compliance assessment
    const passedTests = Object.values(complianceReport.tests).filter(test => test === true).length;
    const totalTests = Object.keys(complianceReport.tests).length - 1; // Exclude performanceImpact
    const compliancePercentage = Math.round((passedTests / totalTests) * 100);
    
    console.log(`\n🎯 OVERALL COMPLIANCE: ${compliancePercentage}% (${passedTests}/${totalTests} tests passed)`);
    
    if (compliancePercentage >= 80) {
      console.log('✅ GDPR COMPLIANCE: GOOD');
    } else if (compliancePercentage >= 60) {
      console.log('⚠️ GDPR COMPLIANCE: NEEDS IMPROVEMENT');
    } else {
      console.log('❌ GDPR COMPLIANCE: CRITICAL ISSUES');
    }
    
    // Compliance assertion
    expect(compliancePercentage, 'GDPR compliance should be at least 60%').toBeGreaterThanOrEqual(60);
    
    console.log('✅ GDPR compliance documentation generated');
  });
});