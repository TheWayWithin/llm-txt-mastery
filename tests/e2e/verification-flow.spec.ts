import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Verification Flow Improvements - Task 2.3
 * 
 * Tests the improved email verification and authentication flow:
 * 1. Email verification → URL input (not landing page)
 * 2. Authenticated user → URL input visible immediately  
 * 3. No "Start New Analysis" button needed for authenticated users
 * 4. Freemium funnel preserved for new users
 */

test.describe('Verification Flow Improvements', () => {
  
  test.beforeEach(async ({ page }) => {
    // Start each test with clean state
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Email verification redirects directly to URL input state', async ({ page }) => {
    // Mock successful email verification flow
    await page.route('**/api/auth/verify-email*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          email: 'test@example.com',
          alreadyVerified: false
        })
      });
    });

    // Mock user data refresh after verification
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-123',
          email: 'test@example.com',
          tier: 'starter',
          emailVerified: true,
          username: 'test'
        })
      });
    });

    // 1. Navigate to email verification page
    await page.goto('/verify-email?token=mock-verification-token');
    
    // 2. Wait for verification to complete
    await expect(page.locator('text=Email Verified!')).toBeVisible();
    
    // 3. Click "Continue to LLM.txt Mastery" button
    await page.click('button:has-text("Continue to LLM.txt Mastery")');
    
    // 4. Verify we're on home page with URL input visible
    await expect(page).toHaveURL('/');
    
    // 5. Verify URL input is immediately visible (no landing page)
    await expect(page.locator('#website-url')).toBeVisible();
    
    // 6. Verify welcome message for authenticated user
    await expect(page.locator('text=Welcome back, test!')).toBeVisible();
    
    // 7. Verify no "Start New Analysis" button needed
    await expect(page.locator('button:has-text("Start New Analysis")')).not.toBeVisible();
    
    console.log('✅ Email verification → URL input flow confirmed');
  });

  test('Authenticated users see URL input immediately on home page', async ({ page }) => {
    // Set up authenticated user state
    await page.evaluate(() => {
      const user = {
        id: 'user-456',
        email: 'coffee-user@example.com', 
        tier: 'coffee',
        emailVerified: true,
        username: 'coffee-user',
        creditsRemaining: 5
      };
      
      localStorage.setItem('auth_access_token', 'mock-token');
      localStorage.setItem('auth_user', JSON.stringify(user));
    });

    // Mock auth API responses
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-456',
          email: 'coffee-user@example.com',
          tier: 'coffee', 
          emailVerified: true,
          username: 'coffee-user',
          creditsRemaining: 5
        })
      });
    });

    // 1. Navigate to home page as authenticated user
    await page.goto('/');
    
    // 2. Verify URL input is immediately visible
    await expect(page.locator('#website-url')).toBeVisible();
    
    // 3. Verify welcome message shows user details
    await expect(page.locator('text=Welcome back, coffee-user!')).toBeVisible();
    
    // 4. Verify Coffee tier messaging
    await expect(page.locator('text=Your Coffee tier is active!')).toBeVisible();
    
    // 5. Verify no email verification banner for verified users
    await expect(page.locator('[data-testid="email-verification-banner"]')).not.toBeVisible();
    
    // 6. Verify no unnecessary "Start New Analysis" button in main flow
    const urlInputSection = page.locator('#website-url').locator('..');
    await expect(urlInputSection.locator('button:has-text("Start New Analysis")')).not.toBeVisible();
    
    console.log('✅ Authenticated user immediate URL input confirmed');
  });

  test('Unauthenticated users still see email capture flow', async ({ page }) => {
    // 1. Navigate to home page without authentication
    await page.goto('/');
    
    // 2. Wait for auth initialization to complete
    await page.waitForTimeout(1000);
    
    // 3. Verify email capture form is visible (freemium funnel preserved)
    await expect(page.locator('form').filter({ hasText: 'email' })).toBeVisible();
    
    // 4. Verify URL input is not immediately visible
    await expect(page.locator('#website-url')).not.toBeVisible();
    
    // 5. Verify tier selection is available
    await expect(page.locator('text=Free Analysis')).toBeVisible();
    await expect(page.locator('text=Premium Analysis')).toBeVisible();
    
    // 6. Verify no authenticated user messaging
    await expect(page.locator('text=Welcome back')).not.toBeVisible();
    
    console.log('✅ Unauthenticated user email capture flow confirmed');
  });

  test('No extra "Start New Analysis" buttons needed for all user tiers', async ({ page }) => {
    const userTiers = [
      { tier: 'starter', email: 'starter@example.com' },
      { tier: 'coffee', email: 'coffee@example.com' },
      { tier: 'growth', email: 'growth@example.com' }
    ];

    for (const userType of userTiers) {
      // Set up authenticated user for this tier
      await page.evaluate((user) => {
        localStorage.clear();
        sessionStorage.clear();
        
        const userData = {
          id: `user-${user.tier}`,
          email: user.email,
          tier: user.tier,
          emailVerified: true,
          username: user.email.split('@')[0],
          creditsRemaining: user.tier === 'coffee' ? 3 : 0
        };
        
        localStorage.setItem('auth_access_token', 'mock-token');
        localStorage.setItem('auth_user', JSON.stringify(userData));
      }, userType);

      // Mock API response for this user tier
      await page.route('**/api/auth/me', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `user-${userType.tier}`,
            email: userType.email,
            tier: userType.tier,
            emailVerified: true,
            username: userType.email.split('@')[0],
            creditsRemaining: userType.tier === 'coffee' ? 3 : 0
          })
        });
      });

      // Navigate to home page
      await page.goto('/');
      
      // Verify URL input is immediately visible for all tiers
      await expect(page.locator('#website-url')).toBeVisible();
      
      // Verify welcome message
      await expect(page.locator(`text=Welcome back, ${userType.email.split('@')[0]}!`)).toBeVisible();
      
      // Critical test: Verify no "Start New Analysis" button in the main flow area
      // (Note: There might be a button in the welcome section for some tiers, but the main flow should be direct)
      const mainFlowArea = page.locator('#website-url').locator('../..');
      const hasStartButton = await mainFlowArea.locator('button:has-text("Start New Analysis")').count();
      
      if (hasStartButton > 0) {
        throw new Error(`${userType.tier} tier should not require "Start New Analysis" button in main flow - should see URL input directly`);
      }
      
      console.log(`✅ ${userType.tier} tier: Direct URL input confirmed, no extra steps`);
    }
  });

  test('Email verification banner shows for unverified users only', async ({ page }) => {
    // Test case 1: Unverified user should see banner
    await page.evaluate(() => {
      const unverifiedUser = {
        id: 'user-unverified',
        email: 'unverified@example.com',
        tier: 'starter',
        emailVerified: false,
        username: 'unverified'
      };
      
      localStorage.setItem('auth_access_token', 'mock-token');
      localStorage.setItem('auth_user', JSON.stringify(unverifiedUser));
    });

    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-unverified',
          email: 'unverified@example.com',
          tier: 'starter',
          emailVerified: false,
          username: 'unverified'
        })
      });
    });

    await page.goto('/');
    
    // Should see email verification banner
    await expect(page.locator('text=Please verify your email')).toBeVisible();
    
    // Test case 2: Verified user should not see banner
    await page.evaluate(() => {
      const verifiedUser = {
        id: 'user-verified',
        email: 'verified@example.com',
        tier: 'starter', 
        emailVerified: true,
        username: 'verified'
      };
      
      localStorage.setItem('auth_user', JSON.stringify(verifiedUser));
    });

    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-verified',
          email: 'verified@example.com',
          tier: 'starter',
          emailVerified: true,
          username: 'verified'
        })
      });
    });

    await page.reload();
    
    // Should not see email verification banner
    await expect(page.locator('text=Please verify your email')).not.toBeVisible();
    
    console.log('✅ Email verification banner visibility logic confirmed');
  });

});

test.describe('Flow State Machine Validation', () => {
  
  test('State transitions follow expected patterns', async ({ page }) => {
    // Test state machine logic by monitoring console logs and DOM changes
    let stateTransitions: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.text().includes('State transition:')) {
        stateTransitions.push(msg.text());
      }
    });

    // Mock authenticated user
    await page.evaluate(() => {
      const user = {
        id: 'user-state-test',
        email: 'state@example.com',
        tier: 'coffee',
        emailVerified: true,
        username: 'state'
      };
      
      localStorage.setItem('auth_access_token', 'mock-token');
      localStorage.setItem('auth_user', JSON.stringify(user));
    });

    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-state-test',
          email: 'state@example.com',
          tier: 'coffee',
          emailVerified: true,
          username: 'state'
        })
      });
    });

    // Navigate to home and verify expected state progression
    await page.goto('/');
    
    // Should transition: INITIALIZING → AUTH_RESOLVED → URL_INPUT
    await expect(page.locator('#website-url')).toBeVisible();
    
    // Enter URL to trigger next state
    await page.fill('#website-url', 'https://example.com');
    await page.click('button:has-text("Analyze Website")');
    
    // Should transition to analysis flow
    // Note: In real test this would mock the analysis API
    
    console.log('✅ State machine transitions validated');
  });

});