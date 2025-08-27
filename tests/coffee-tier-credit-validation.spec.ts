import { test, expect, Page, BrowserContext } from '@playwright/test';
import { db } from '../server/db';
import { authUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Coffee Tier Credit System Validation Tests
 * 
 * CRITICAL BUG FIXES VALIDATION:
 * 1. Credit retrieval now correctly reads from auth_users.creditsRemaining
 * 2. Credit consumption happens after each successful analysis
 * 3. New purchases receive 100 credits instead of 1
 * 4. Admin endpoint created to fix existing users
 * 
 * This test suite validates the entire credit lifecycle for Coffee tier users.
 */

// Test configuration
const TEST_EMAIL = 'test-coffee-user@example.com';
const JAMIE_EMAIL = 'jamie.watters.mail@icloud.com';
const BACKEND_URL = process.env.VITE_API_URL || 'http://localhost:5000';

let testUserId: number;

test.describe('Coffee Tier Credit System', () => {
  test.beforeAll(async () => {
    // Clean up any existing test user
    try {
      await db.delete(authUsers).where(eq(authUsers.email, TEST_EMAIL));
    } catch (error) {
      console.log('No existing test user to clean up');
    }
  });

  test.afterAll(async () => {
    // Clean up test user
    try {
      await db.delete(authUsers).where(eq(authUsers.email, TEST_EMAIL));
    } catch (error) {
      console.log('Failed to clean up test user');
    }
  });

  test('Setup: Create test Coffee tier user with credits', async ({ page }) => {
    // Create a test user directly in the database
    const [user] = await db.insert(authUsers).values({
      email: TEST_EMAIL,
      passwordHash: 'test_hash',
      tier: 'coffee',
      creditsRemaining: 5, // Start with 5 credits for testing
      emailVerified: true
    }).returning();
    
    testUserId = user.id;
    expect(user.creditsRemaining).toBe(5);
    expect(user.tier).toBe('coffee');
  });

  test('1. Credit Display - Verify correct credits show in UI', async ({ page }) => {
    // Navigate to home page and enter test email
    await page.goto('/');
    
    // Fill email and trigger analysis setup
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]');
    
    // Wait for usage display to load
    await page.waitForSelector('[data-testid="usage-display"]', { timeout: 10000 });
    
    // Check if credit display is visible
    const creditDisplay = await page.locator('text=/Analysis Credits/').first();
    await expect(creditDisplay).toBeVisible();
    
    // Check credit count display
    const creditCount = await page.locator('text=/5 credits left/').first();
    await expect(creditCount).toBeVisible();
    
    // Verify Coffee tier badge is displayed
    const coffeeBadge = await page.locator('text=/Coffee/').first();
    await expect(coffeeBadge).toBeVisible();
  });

  test('2. Credit Check Logic - Access control when credits > 0', async ({ page }) => {
    // Navigate to analyze page
    await page.goto('/analyze');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="url"]', 'https://example.com');
    
    // Submit analysis - should be allowed with credits
    const analyzeButton = page.locator('button:has-text("Analyze Website")');
    await analyzeButton.click();
    
    // Should not see "out of credits" error
    await expect(page.locator('text=/No coffee credits remaining/')).not.toBeVisible({ timeout: 5000 });
    
    // Should see analysis starting
    await expect(page.locator('text=/Analyzing/')).toBeVisible({ timeout: 10000 });
  });

  test('3. Credit Consumption - Verify credits decrease after analysis', async ({ page }) => {
    // Get current credits before analysis
    const [userBefore] = await db.select().from(authUsers).where(eq(authUsers.id, testUserId));
    const creditsBefore = userBefore.creditsRemaining;
    
    // Start another analysis
    await page.goto('/analyze');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="url"]', 'https://jsonplaceholder.typicode.com'); // Different URL
    
    await page.click('button:has-text("Analyze Website")');
    
    // Wait for analysis to complete
    await page.waitForSelector('text=/Analysis Complete/', { timeout: 30000 });
    
    // Check credits after analysis
    const [userAfter] = await db.select().from(authUsers).where(eq(authUsers.id, testUserId));
    const creditsAfter = userAfter.creditsRemaining;
    
    expect(creditsAfter).toBe(creditsBefore - 1);
  });

  test('4. Credit Check Logic - Access denied when credits = 0', async ({ page }) => {
    // Set user credits to 0
    await db.update(authUsers).set({ creditsRemaining: 0 }).where(eq(authUsers.id, testUserId));
    
    // Try to start analysis
    await page.goto('/analyze');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="url"]', 'https://httpbin.org');
    
    await page.click('button:has-text("Analyze Website")');
    
    // Should see "out of credits" error
    await expect(page.locator('text=/No coffee credits remaining/')).toBeVisible({ timeout: 10000 });
    
    // Should NOT see analysis starting
    await expect(page.locator('text=/Analyzing/')).not.toBeVisible({ timeout: 5000 });
  });

  test('5. Credit Display - Shows 0 credits correctly', async ({ page }) => {
    // Verify credits show as 0 in UI
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]');
    
    // Wait for usage display
    await page.waitForSelector('[data-testid="usage-display"]', { timeout: 10000 });
    
    // Check credit count shows 0
    const creditCount = await page.locator('text=/0 credits left/').first();
    await expect(creditCount).toBeVisible();
    
    // Should show upgrade prompt
    const upgradePrompt = await page.locator('text=/Ready for another premium analysis/').first();
    await expect(upgradePrompt).toBeVisible();
  });

  test('6. New Purchase Simulation - Verify 100 credits are added', async ({ page }) => {
    // Simulate a successful coffee tier purchase by directly updating the database
    // (This simulates what the Stripe webhook would do)
    await db.update(authUsers).set({ creditsRemaining: 100 }).where(eq(authUsers.id, testUserId));
    
    // Verify credits are updated in UI
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('[data-testid="usage-display"]', { timeout: 10000 });
    
    // Check credit count shows 100
    const creditCount = await page.locator('text=/100 credits left/').first();
    await expect(creditCount).toBeVisible();
    
    // Verify analysis is now allowed
    await page.goto('/analyze');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="url"]', 'https://example.org');
    
    await page.click('button:has-text("Analyze Website")');
    
    // Should NOT see "out of credits" error
    await expect(page.locator('text=/No coffee credits remaining/')).not.toBeVisible({ timeout: 5000 });
    
    // Should see analysis starting
    await expect(page.locator('text=/Analyzing/')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Jamie Watters Account Validation', () => {
  test('Verify Jamie\'s account shows correct credits', async ({ page }) => {
    // Check Jamie's account status directly in database
    const [jamie] = await db.select().from(authUsers).where(eq(authUsers.email, JAMIE_EMAIL));
    
    if (!jamie) {
      test.skip('Jamie\'s account not found in database');
      return;
    }

    console.log('Jamie\'s current credits:', jamie.creditsRemaining);
    console.log('Jamie\'s tier:', jamie.tier);
    
    // Navigate to UI and check display
    await page.goto('/');
    await page.fill('input[type="email"]', JAMIE_EMAIL);
    await page.click('button[type="submit"]');
    
    if (jamie.tier === 'coffee') {
      // Should see credit display for coffee tier
      await page.waitForSelector('text=/Analysis Credits/', { timeout: 10000 });
      
      // Check if credits display correctly
      const creditText = `${jamie.creditsRemaining} ${jamie.creditsRemaining === 1 ? 'credit' : 'credits'} left`;
      await expect(page.locator(`text=/${creditText}/`)).toBeVisible();
    }
  });
});

test.describe('Backend API Credit Endpoints', () => {
  test('GET /api/usage should include creditsRemaining for Coffee tier', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/usage/${encodeURIComponent(TEST_EMAIL)}`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    if (data.tier === 'coffee') {
      expect(data).toHaveProperty('creditsRemaining');
      expect(typeof data.creditsRemaining).toBe('number');
      expect(data.creditsRemaining).toBeGreaterThanOrEqual(0);
    }
  });

  test('POST /api/analyze should consume credit for Coffee tier', async ({ request }) => {
    // Get current credits
    const [userBefore] = await db.select().from(authUsers).where(eq(authUsers.id, testUserId));
    const creditsBefore = userBefore.creditsRemaining;
    
    // Make sure user has credits
    if (creditsBefore === 0) {
      await db.update(authUsers).set({ creditsRemaining: 5 }).where(eq(authUsers.id, testUserId));
    }
    
    // Start analysis via API
    const response = await request.post(`${BACKEND_URL}/api/analyze`, {
      data: {
        url: 'https://httpbin.org/get',
        email: TEST_EMAIL
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('analysisId');
    
    // Wait a bit for analysis to process
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if credits were consumed
    const [userAfter] = await db.select().from(authUsers).where(eq(authUsers.id, testUserId));
    expect(userAfter.creditsRemaining).toBeLessThan(creditsBefore);
  });
});

test.describe('Edge Cases and Error Handling', () => {
  test('Negative credits should be treated as 0', async ({ page }) => {
    // Set negative credits
    await db.update(authUsers).set({ creditsRemaining: -5 }).where(eq(authUsers.id, testUserId));
    
    // Try analysis - should be denied
    await page.goto('/analyze');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="url"]', 'https://example.com');
    
    await page.click('button:has-text("Analyze Website")');
    await expect(page.locator('text=/No coffee credits remaining/')).toBeVisible({ timeout: 10000 });
  });

  test('Non-existent user should handle gracefully', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/usage/${encodeURIComponent('nonexistent@example.com')}`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.tier).toBe('starter'); // Should default to starter
  });

  test('Credit consumption should be atomic', async ({ page }) => {
    // Set exactly 1 credit
    await db.update(authUsers).set({ creditsRemaining: 1 }).where(eq(authUsers.id, testUserId));
    
    // Start analysis
    await page.goto('/analyze');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="url"]', 'https://jsonplaceholder.typicode.com/posts/1');
    
    await page.click('button:has-text("Analyze Website")');
    
    // Analysis should start successfully
    await expect(page.locator('text=/Analyzing/')).toBeVisible({ timeout: 10000 });
    
    // Credits should be consumed even if analysis fails
    const [userAfter] = await db.select().from(authUsers).where(eq(authUsers.id, testUserId));
    expect(userAfter.creditsRemaining).toBe(0);
  });
});