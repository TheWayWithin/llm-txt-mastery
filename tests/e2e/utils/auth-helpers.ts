import { Page, expect } from '@playwright/test';

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
 * Create a test context with authentication monitoring
 */
export async function createAuthTestContext(page: Page): Promise<{
  consoleMessages: string[];
  errors: string[];
  cleanup: () => void;
}> {
  const consoleMessages: string[] = [];
  const errors: string[] = [];

  const consoleHandler = (msg: any) => {
    const text = msg.text();
    if (text.includes('AUTH') || text.includes('auth') || text.includes('🔐') || text.includes('✅') || text.includes('☕')) {
      consoleMessages.push(text);
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
    cleanup: () => {
      page.off('console', consoleHandler);
      page.off('pageerror', errorHandler);
      page.off('console', consoleErrorHandler);
    }
  };
}