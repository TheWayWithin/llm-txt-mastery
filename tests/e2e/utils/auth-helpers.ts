import { Page, expect } from '@playwright/test';
import { TemporaryEmailService, createTemporaryEmailService } from './temp-email-service';

/**
 * Authentication Test Helpers
 * 
 * Utility functions for authentication testing scenarios.
 */

export interface MockUser {
  id: number;
  email: string;
  tier: 'starter' | 'coffee' | 'growth' | 'scale';
  creditsRemaining: number;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: MockUser;
}

/**
 * Create a mock user object for testing
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: Math.floor(Math.random() * 1000) + 1,
    email: `test${Math.random().toString(36).substr(2, 9)}@example.com`,
    tier: 'starter',
    creditsRemaining: 3,
    emailVerified: true,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create a Coffee tier user for testing premium features
 */
export function createCoffeeUser(overrides: Partial<MockUser> = {}): MockUser {
  return createMockUser({
    tier: 'coffee',
    creditsRemaining: 10,
    ...overrides
  });
}

/**
 * AuthTestHelper - Enhanced authentication testing with temporary emails
 */
export class AuthTestHelper {
  private page: Page;
  private emailService: TemporaryEmailService;
  private createdUsers: Map<string, { email: string; password: string; tier?: string }> = new Map();
  
  constructor(page: Page) {
    this.page = page;
    this.emailService = createTemporaryEmailService();
  }

  /**
   * Create a temporary email for testing
   */
  async createTemporaryEmail(): Promise<string> {
    return await this.emailService.createTemporaryEmail();
  }

  /**
   * Create a test user account (signup and store credentials)
   */
  async createTestUser(email: string, password: string, tier: string = 'coffee'): Promise<void> {
    try {
      await this.signup(email, password, tier);
      this.createdUsers.set(email, { email, password, tier });
      console.log(`Created test user: ${email} (${tier} tier)`);
    } catch (error) {
      console.warn(`Failed to create test user ${email}:`, error.message);
      throw error;
    }
  }

  /**
   * Perform user signup with given credentials
   */
  async signup(email: string, password: string, tier?: string): Promise<void> {
    const signupUrl = tier ? `/signup?tier=${tier}` : '/signup';
    await this.page.goto(signupUrl);
    await this.page.waitForLoadState('networkidle');
    
    // Fill the signup form
    await this.fillSignupForm(email, password);
    
    // Submit the form
    await this.submitSignupForm();
    
    // Wait for successful signup (redirect to analyze page)
    await this.waitForAuthCompletion('/analyze');
  }

  /**
   * Perform user login with given credentials
   */
  async login(email: string, password: string, tier?: string): Promise<void> {
    const loginUrl = tier ? `/login?tier=${tier}` : '/login';
    await this.page.goto(loginUrl);
    await this.page.waitForLoadState('networkidle');
    
    // Fill the login form
    await this.fillLoginForm(email, password);
    
    // Submit the form
    await this.submitLoginForm();
    
    // Wait for successful login (redirect to analyze page)
    await this.waitForAuthCompletion('/analyze');
  }

  /**
   * Check if user is currently logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      // Look for user menu, user avatar, or user-specific elements
      const userMenuSelectors = [
        '[data-testid="user-menu"]',
        '.user-menu',
        'button:has-text("@")', // Email in button
        '.dropdown-trigger:has(.user)', // User dropdown
        '.tier-badge', // Tier badge indicates logged in user
        'button:has-text("Sign Out")',
        'button:has-text("Logout")'
      ];
      
      for (const selector of userMenuSelectors) {
        try {
          const element = this.page.locator(selector);
          if (await element.isVisible()) {
            return true;
          }
        } catch {
          continue;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Fill signup form but don't submit
   */
  async fillSignupForm(email: string, password: string): Promise<void> {
    // Wait for form to be ready
    await this.page.waitForSelector('input[type="email"]', { timeout: 5000 });
    
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    
    // Fill confirm password if present
    const confirmPasswordField = this.page.locator('input[name="confirmPassword"], input[name="confirm-password"], input[type="password"]:nth-of-type(2)');
    if (await confirmPasswordField.isVisible()) {
      await confirmPasswordField.fill(password);
    }
  }

  /**
   * Submit signup form
   */
  async submitSignupForm(): Promise<void> {
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign Up")',
      'button:has-text("Create Account")',
      'button:has-text("Get Started")'
    ];
    
    for (const selector of submitSelectors) {
      try {
        const button = this.page.locator(selector);
        if (await button.isVisible() && await button.isEnabled()) {
          await button.click();
          return;
        }
      } catch {
        continue;
      }
    }
    
    throw new Error('Could not find or click signup submit button');
  }

  /**
   * Fill login form but don't submit
   */
  async fillLoginForm(email: string, password: string): Promise<void> {
    // Wait for form to be ready
    await this.page.waitForSelector('input[type="email"]', { timeout: 5000 });
    
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
  }

  /**
   * Submit login form
   */
  async submitLoginForm(): Promise<void> {
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Login")',
      'button:has-text("Continue")'
    ];
    
    for (const selector of submitSelectors) {
      try {
        const button = this.page.locator(selector);
        if (await button.isVisible() && await button.isEnabled()) {
          await button.click();
          return;
        }
      } catch {
        continue;
      }
    }
    
    throw new Error('Could not find or click login submit button');
  }

  /**
   * Wait for authentication to complete
   */
  async waitForAuthCompletion(expectedUrl: string = '/analyze'): Promise<void> {
    try {
      await this.page.waitForURL(expectedUrl, { timeout: 15000 });
    } catch (error) {
      // Check if we're on a different success page
      const currentUrl = this.page.url();
      console.log(`Expected URL: ${expectedUrl}, Current URL: ${currentUrl}`);
      
      // Accept if we're on dashboard or any authenticated page
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/analyze')) {
        return;
      }
      
      throw new Error(`Authentication did not complete successfully. Expected: ${expectedUrl}, Got: ${currentUrl}`);
    }
  }

  /**
   * Check for authentication errors
   */
  async getAuthErrors(): Promise<string[]> {
    const errorSelectors = [
      '.error-message',
      '.auth-error',
      '[role="alert"]',
      '.text-red-500',
      '.text-red-600',
      '.text-red-700',
      '.bg-red-50',
      '.border-red-200',
      '.alert-error'
    ];
    
    const errors: string[] = [];
    
    for (const selector of errorSelectors) {
      try {
        const elements = this.page.locator(selector);
        const count = await elements.count();
        
        for (let i = 0; i < count; i++) {
          const text = await elements.nth(i).textContent();
          if (text && text.trim()) {
            errors.push(text.trim());
          }
        }
      } catch {
        continue;
      }
    }
    
    return errors;
  }

  /**
   * Clean up test data
   */
  cleanup(): void {
    this.createdUsers.clear();
    this.emailService.cleanup();
  }

  /**
   * Quick signup flow for testing (creates email automatically)
   */
  async quickSignup(tier: string = 'coffee'): Promise<{ email: string; password: string }> {
    const email = await this.createTemporaryEmail();
    const password = 'TestPassword123!';
    
    await this.signup(email, password, tier);
    
    return { email, password };
  }

  /**
   * Verify user is on the expected post-auth page
   */
  async verifyPostAuthPage(): Promise<boolean> {
    const currentUrl = this.page.url();
    const validPostAuthUrls = ['/analyze', '/dashboard'];
    
    return validPostAuthUrls.some(url => currentUrl.includes(url));
  }

  /**
   * Check if Coffee tier is properly displayed for user
   */
  async verifyCoffeeTierUser(): Promise<boolean> {
    try {
      // Look for Coffee tier indicators
      const coffeeIndicators = [
        '.tier-badge:has-text("Coffee")',
        '[data-testid="tier-badge"]:has-text("Coffee")',
        '.badge:has-text("Coffee")',
        'text="Coffee"'
      ];
      
      for (const selector of coffeeIndicators) {
        try {
          const element = this.page.locator(selector);
          if (await element.isVisible()) {
            return true;
          }
        } catch {
          continue;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }
}

/**
 * Set authentication tokens in browser localStorage
 */
export async function setAuthTokens(page: Page, user: MockUser, tokens?: Partial<AuthTokens>) {
  await page.evaluate(({ user, tokens }) => {
    const authTokens = {
      accessToken: tokens?.accessToken || `mock-token-${user.id}`,
      refreshToken: tokens?.refreshToken || `mock-refresh-${user.id}`,
      ...tokens
    };

    localStorage.setItem('auth_access_token', authTokens.accessToken);
    localStorage.setItem('auth_refresh_token', authTokens.refreshToken);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, { user, tokens: tokens || {} });
}

/**
 * Clear all authentication data from browser
 */
export async function clearAuthTokens(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('auth_access_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_user');
  });
}

/**
 * Get current authentication state from browser
 */
export async function getAuthState(page: Page): Promise<{
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  user: MockUser | null;
}> {
  return await page.evaluate(() => {
    const userStr = localStorage.getItem('auth_user');
    return {
      hasAccessToken: !!localStorage.getItem('auth_access_token'),
      hasRefreshToken: !!localStorage.getItem('auth_refresh_token'),
      user: userStr ? JSON.parse(userStr) : null
    };
  });
}

/**
 * Wait for authentication to be resolved
 */
export async function waitForAuthResolution(page: Page, timeout = 5000): Promise<void> {
  await page.waitForFunction(() => {
    // Look for signs that auth has been resolved
    const hasUser = !!localStorage.getItem('auth_user');
    const hasToken = !!localStorage.getItem('auth_access_token');
    return hasUser && hasToken;
  }, { timeout });
}

/**
 * Simulate a returning user by setting auth tokens and reloading
 */
export async function simulateReturningUser(page: Page, user?: MockUser): Promise<MockUser> {
  const mockUser = user || createMockUser();
  await setAuthTokens(page, mockUser);
  await page.reload();
  await page.waitForTimeout(2000); // Allow auth to initialize
  return mockUser;
}

/**
 * Simulate a Coffee tier returning user
 */
export async function simulateReturningCoffeeUser(page: Page, user?: MockUser): Promise<MockUser> {
  const coffeeUser = user || createCoffeeUser();
  return simulateReturningUser(page, coffeeUser);
}

/**
 * Start analysis flow from URL input
 */
export async function startAnalysisFlow(page: Page, url = 'https://test.com'): Promise<void> {
  const urlInput = page.getByPlaceholder(/enter.*url/i);
  await expect(urlInput).toBeVisible();
  await urlInput.fill(url);
  
  const startButton = page.getByRole('button', { name: /analyze|start/i });
  await startButton.click();
}

/**
 * Complete email capture flow for new users
 */
export async function completeEmailCapture(
  page: Page, 
  email = 'test@example.com', 
  tier: 'starter' | 'coffee' = 'starter'
): Promise<void> {
  await expect(page.getByText(/choose.*analysis.*type/i)).toBeVisible({ timeout: 10000 });
  
  const emailInput = page.getByPlaceholder(/email/i);
  await expect(emailInput).toBeVisible();
  await emailInput.fill(email);
  
  const tierButton = page.getByRole('button', { name: new RegExp(tier, 'i') });
  await tierButton.click();
}

/**
 * Assert that email capture is NOT visible (user should be authenticated)
 */
export async function assertSkipsEmailCapture(page: Page): Promise<void> {
  await page.waitForTimeout(3000);
  const emailCapturePresent = await page.getByText(/choose.*analysis.*type/i).isVisible().catch(() => false);
  expect(emailCapturePresent).toBe(false);
}

/**
 * Assert that email capture IS visible (user is not authenticated)
 */
export async function assertShowsEmailCapture(page: Page): Promise<void> {
  await expect(page.getByText(/choose.*analysis.*type/i)).toBeVisible({ timeout: 10000 });
}

/**
 * Monitor console messages for authentication-related logs
 */
export async function monitorAuthConsoleMessages(page: Page): Promise<string[]> {
  const messages: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('AUTH') || text.includes('auth') || text.includes('🔐') || text.includes('✅') || text.includes('☕')) {
      messages.push(text);
    }
  });

  return messages;
}

/**
 * Check for specific console message patterns that indicate successful auth resolution
 */
export function hasAuthResolutionMessages(messages: string[]): {
  hasAuthResolved: boolean;
  hasCoffeeMessages: boolean;
  hasStateTransitions: boolean;
} {
  return {
    hasAuthResolved: messages.some(msg => 
      msg.includes('Auth resolved') || 
      msg.includes('AUTH_RESOLVED')
    ),
    hasCoffeeMessages: messages.some(msg =>
      msg.includes('Coffee tier') || 
      msg.includes('☕')
    ),
    hasStateTransitions: messages.some(msg =>
      msg.includes('State transition') ||
      msg.includes('🔄')
    )
  };
}

/**
 * Mock successful token refresh response
 */
export async function mockTokenRefresh(page: Page, user: MockUser): Promise<void> {
  await page.route('**/api/auth/refresh', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user,
        accessToken: `refreshed-token-${user.id}`,
        refreshToken: `refreshed-refresh-${user.id}`
      })
    });
  });
}

/**
 * Mock network failure for auth endpoints
 */
export async function mockNetworkFailure(page: Page): Promise<void> {
  await page.route('**/api/auth/**', route => {
    route.abort('failed');
  });
}

/**
 * Verify no critical JavaScript errors occurred
 */
export async function assertNoCriticalErrors(page: Page): Promise<void> {
  const errors: string[] = [];
  
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Allow some time for errors to surface
  await page.waitForTimeout(1000);

  const criticalErrors = errors.filter(error => 
    error.includes('Cannot read') || 
    error.includes('SyntaxError') ||
    error.includes('TypeError') ||
    error.includes('ReferenceError')
  );

  if (criticalErrors.length > 0) {
    console.error('Critical JavaScript errors detected:', criticalErrors);
    throw new Error(`Critical errors found: ${criticalErrors.join(', ')}`);
  }
}

/**
 * Wait for smart reset to complete by monitoring URL input visibility
 */
export async function waitForSmartResetCompletion(page: Page, timeout = 10000): Promise<void> {
  await expect(page.locator('input[placeholder*="https://"]')).toBeVisible({ timeout });
  await expect(page.locator('input[placeholder*="https://"]')).toHaveValue('');
  console.log('✅ Smart reset completion detected');
}

/**
 * Perform a smart reset and validate user context preservation
 */
export async function performValidatedSmartReset(page: Page): Promise<{
  beforeUsage: string | null;
  afterUsage: string | null;
  beforeTier: string | null;
  afterTier: string | null;
}> {
  // Capture state before reset
  const beforeUsage = await page.locator('text=/\\d+ \\/ \\d+/').textContent().catch(() => null);
  const beforeTier = await page.locator('span:has-text("Starter"), span:has-text("Coffee")').textContent().catch(() => null);
  
  // Perform smart reset
  await expect(page.locator('button:has-text("Analyze Another Website")')).toBeVisible();
  await page.click('button:has-text("Analyze Another Website")');
  await waitForSmartResetCompletion(page);
  
  // Capture state after reset
  const afterUsage = await page.locator('text=/\\d+ \\/ \\d+/').textContent().catch(() => null);
  const afterTier = await page.locator('span:has-text("Starter"), span:has-text("Coffee")').textContent().catch(() => null);
  
  // Validate preservation
  expect(afterUsage).toBe(beforeUsage);
  expect(afterTier).toBe(beforeTier);
  
  console.log(`✅ Smart reset validated - Usage: ${beforeUsage} → ${afterUsage}, Tier: ${beforeTier} → ${afterTier}`);
  
  return { beforeUsage, afterUsage, beforeTier, afterTier };
}

/**
 * Complete full analysis flow optimized for smart reset testing
 */
export async function completeAnalysisForSmartReset(
  page: Page, 
  url = 'https://example.com',
  requiresEmail = false,
  generateFile = true
): Promise<void> {
  console.log(`🧪 Completing analysis flow for smart reset testing: ${url}`);
  
  // URL input
  await page.fill('input[placeholder*="https://"]', url);
  await page.click('button:has-text("Start Analysis")');
  
  // Email capture if required
  if (requiresEmail) {
    await expect(page.locator('form:has(input[type="email"])')).toBeVisible({ timeout: 10000 });
    await page.fill('input[type="email"]', 'test-smart-reset@example.com');
    await page.click('button[type="submit"]');
  }
  
  // Proceed through tier limits
  await expect(page.locator('button:has-text("Proceed with Analysis")')).toBeVisible({ timeout: 15000 });
  await page.click('button:has-text("Proceed with Analysis")');
  
  // Wait for analysis completion
  await expect(page.locator('[class*="card"]:has-text("Content Review")')).toBeVisible({ timeout: 60000 });
  
  // Generate file if requested
  if (generateFile) {
    await page.click('button[class*="bg-innovation-teal"]:has-text("Generate llms.txt File")');
    await expect(page.locator('[class*="card"]:has-text("File Generated Successfully")')).toBeVisible({ timeout: 30000 });
  }
  
  console.log('✅ Analysis flow completed for smart reset testing');
}

/**
 * Validate that smart reset preserves authentication while clearing analysis data
 */
export async function validateSmartResetBehavior(page: Page): Promise<void> {
  // Should preserve user indicators
  const hasUsageDisplay = await page.locator('text=/\\d+ \\/ \\d+/').isVisible().catch(() => false);
  const hasTierBadge = await page.locator('span:has-text("Starter"), span:has-text("Coffee")').isVisible().catch(() => false);
  
  expect(hasUsageDisplay || hasTierBadge).toBe(true);
  console.log('✅ User context preserved after smart reset');
  
  // Should clear analysis data
  const urlInputValue = await page.locator('input[placeholder*="https://"]').inputValue();
  expect(urlInputValue).toBe('');
  console.log('✅ Analysis data cleared after smart reset');
  
  // Should not show email capture
  const emailCaptureVisible = await page.locator('form:has(input[type="email"])').isVisible().catch(() => false);
  expect(emailCaptureVisible).toBe(false);
  console.log('✅ Email capture correctly hidden after smart reset');
}

/**
 * Create a test context with authentication and smart reset monitoring
 */
export async function createAuthTestContext(page: Page): Promise<{
  consoleMessages: string[];
  errors: string[];
  smartResetEvents: string[];
  cleanup: () => void;
}> {
  const consoleMessages: string[] = [];
  const errors: string[] = [];
  const smartResetEvents: string[] = [];

  const consoleHandler = (msg: any) => {
    const text = msg.text();
    if (text.includes('AUTH') || text.includes('auth') || text.includes('🔐') || text.includes('✅') || text.includes('☕')) {
      consoleMessages.push(text);
    }
    if (text.includes('START_NEW_ANALYSIS') || text.includes('Smart reset') || text.includes('🔄')) {
      smartResetEvents.push(text);
    }
  };

  const errorHandler = (error: Error) => {
    errors.push(error.message);
  };

  const consoleErrorHandler = (msg: any) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  };

  page.on('console', consoleHandler);
  page.on('pageerror', errorHandler);
  page.on('console', consoleErrorHandler);

  return {
    consoleMessages,
    errors,
    smartResetEvents,
    cleanup: () => {
      page.off('console', consoleHandler);
      page.off('pageerror', errorHandler);
      page.off('console', consoleErrorHandler);
    }
  };
}