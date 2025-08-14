import { test, expect, Page } from '@playwright/test';
import { ConversionTestHelper } from './utils/conversion-test-helpers';
import { AuthTestHelper } from './utils/auth-helpers';

/**
 * CONVERSION VALIDATION TEST SUITE
 * 
 * Tests the newly implemented user flow changes targeting 5.88x conversion improvement:
 * 1. Coffee tier ($4.95) is default selection
 * 2. Clear Sign In / Sign Up separation  
 * 3. Complete user journeys work end-to-end
 * 
 * This comprehensive test suite validates conversion metrics and user experience.
 */

test.describe('Conversion Validation Tests', () => {
  let conversionHelper: ConversionTestHelper;
  let authHelper: AuthTestHelper;

  test.beforeEach(async ({ page }) => {
    conversionHelper = new ConversionTestHelper(page);
    authHelper = new AuthTestHelper(page);
    
    // Clear any existing storage to ensure clean test state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
  });

  test.describe('Test Suite 1: New User Signup Flow', () => {
    test('should verify Coffee tier is pre-selected by default', async ({ page }) => {
      await test.step('Navigate to landing page', async () => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
      });

      await test.step('Verify Coffee tier is default selection', async () => {
        // Check that coffee tier radio button is selected by default
        const coffeeRadio = page.locator('input[value="coffee"]');
        await expect(coffeeRadio).toBeChecked();
        
        // Verify orange styling indicates coffee tier is highlighted
        const coffeeContainer = page.locator('[data-testid="coffee-tier"], .border-orange-400, .bg-orange-50').first();
        await expect(coffeeContainer).toBeVisible();
        
        // Verify "MOST POPULAR" badge is visible
        const popularBadge = page.getByText('MOST POPULAR');
        await expect(popularBadge).toBeVisible();
      });

      await test.step('Take screenshot for validation', async () => {
        await page.screenshot({ 
          path: 'test-results/coffee-tier-default-selection.png',
          fullPage: true 
        });
      });
    });

    test('should complete signup flow with temporary email', async ({ page }) => {
      const tempEmail = await authHelper.createTemporaryEmail();
      const testPassword = 'TestPassword123!';

      await test.step('Navigate to landing page and select Coffee tier', async () => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Verify coffee tier is pre-selected
        const coffeeRadio = page.locator('input[value="coffee"]');
        await expect(coffeeRadio).toBeChecked();
      });

      await test.step('Click Sign Up button', async () => {
        const signUpButton = page.getByRole('button', { name: 'Sign Up' });
        await expect(signUpButton).toBeVisible();
        await signUpButton.click();
        
        // Verify navigation to signup page with tier and website parameters
        await expect(page).toHaveURL(/\/signup\?tier=coffee/);
      });

      await test.step('Complete signup form', async () => {
        await page.waitForSelector('input[type="email"]');
        
        // Fill email and password
        await page.fill('input[type="email"]', tempEmail);
        await page.fill('input[type="password"]', testPassword);
        
        // Submit form
        const submitButton = page.getByRole('button', { name: /sign up|create account/i });
        await submitButton.click();
      });

      await test.step('Verify redirect to analyze page', async () => {
        await page.waitForURL('/analyze', { timeout: 10000 });
        await expect(page).toHaveURL('/analyze');
        
        // Verify clean interface (no landing content)
        await expect(page.getByText('Choose Your Analysis Type')).not.toBeVisible();
        
        // Verify user is authenticated
        await expect(page.locator('.user-menu, [data-testid="user-menu"]')).toBeVisible();
      });

      await test.step('Take completion screenshot', async () => {
        await page.screenshot({ 
          path: 'test-results/signup-flow-completion.png',
          fullPage: true 
        });
      });
    });

    test('should measure signup completion rate', async ({ page }) => {
      const startTime = Date.now();
      
      await test.step('Track landing page visit', async () => {
        await page.goto('/');
        await conversionHelper.trackEvent('landing_page_visit');
      });

      await test.step('Track tier selection (should be automatic)', async () => {
        const coffeeRadio = page.locator('input[value="coffee"]');
        await expect(coffeeRadio).toBeChecked();
        await conversionHelper.trackEvent('tier_selected', { tier: 'coffee' });
      });

      await test.step('Track signup button click', async () => {
        const signUpButton = page.getByRole('button', { name: 'Sign Up' });
        await signUpButton.click();
        await conversionHelper.trackEvent('signup_button_clicked');
      });

      const endTime = Date.now();
      const timeToSignupClick = endTime - startTime;
      
      // Verify time to signup click is reasonable (under 5 seconds for automated test)
      expect(timeToSignupClick).toBeLessThan(5000);
      
      console.log(`Time from landing to signup click: ${timeToSignupClick}ms`);
    });
  });

  test.describe('Test Suite 2: Returning User Login Flow', () => {
    test('should complete returning user login flow', async ({ page }) => {
      // Pre-create a test user account
      const testEmail = await authHelper.createTemporaryEmail();
      const testPassword = 'TestPassword123!';
      
      await test.step('Create test user account', async () => {
        await authHelper.createTestUser(testEmail, testPassword);
      });

      await test.step('Navigate to landing page', async () => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
      });

      await test.step('Verify Coffee tier is default', async () => {
        const coffeeRadio = page.locator('input[value="coffee"]');
        await expect(coffeeRadio).toBeChecked();
      });

      await test.step('Click Sign In button', async () => {
        const signInButton = page.getByRole('button', { name: 'Sign In' });
        await expect(signInButton).toBeVisible();
        await signInButton.click();
        
        // Verify navigation to login page with tier parameter
        await expect(page).toHaveURL(/\/login\?tier=coffee/);
      });

      await test.step('Complete login form', async () => {
        await page.waitForSelector('input[type="email"]');
        
        // Fill credentials
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        
        // Submit form
        const submitButton = page.getByRole('button', { name: /sign in|login/i });
        await submitButton.click();
      });

      await test.step('Verify redirect to analyze page', async () => {
        await page.waitForURL('/analyze', { timeout: 10000 });
        await expect(page).toHaveURL('/analyze');
        
        // Verify user tier and stats display
        await expect(page.locator('.tier-badge, [data-testid="tier-badge"]')).toBeVisible();
        await expect(page.getByText('Coffee')).toBeVisible();
      });

      await test.step('Take completion screenshot', async () => {
        await page.screenshot({ 
          path: 'test-results/login-flow-completion.png',
          fullPage: true 
        });
      });
    });
  });

  test.describe('Test Suite 3: Conversion Metrics', () => {
    test('should track default tier selection rate (100% Coffee)', async ({ page }) => {
      const testRuns = 5;
      const coffeeSelections = [];

      for (let i = 0; i < testRuns; i++) {
        await test.step(`Test run ${i + 1}: Check default tier`, async () => {
          await page.goto('/');
          await page.waitForLoadState('networkidle');
          
          const coffeeRadio = page.locator('input[value="coffee"]');
          const isCoffeeSelected = await coffeeRadio.isChecked();
          
          coffeeSelections.push(isCoffeeSelected);
        });
      }

      // Verify 100% coffee tier selection
      const coffeeSelectionRate = coffeeSelections.filter(Boolean).length / testRuns;
      expect(coffeeSelectionRate).toBe(1.0); // 100% should be Coffee tier
      
      console.log(`Coffee tier default selection rate: ${(coffeeSelectionRate * 100).toFixed(1)}%`);
    });

    test('should measure time from landing to first analysis', async ({ page }) => {
      const tempEmail = await authHelper.createTemporaryEmail();
      const testPassword = 'TestPassword123!';
      
      const startTime = Date.now();
      
      await test.step('Complete signup flow', async () => {
        await page.goto('/');
        
        // Coffee tier should be pre-selected
        await page.getByRole('button', { name: 'Sign Up' }).click();
        await page.waitForURL(/\/signup/);
        
        await page.fill('input[type="email"]', tempEmail);
        await page.fill('input[type="password"]', testPassword);
        await page.getByRole('button', { name: /sign up/i }).click();
        
        await page.waitForURL('/analyze');
      });

      await test.step('Start analysis', async () => {
        await page.fill('input[type="url"], input[placeholder*="website"], input[placeholder*="URL"]', 'https://example.com');
        await page.getByRole('button', { name: /analyze|start/i }).click();
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Verify reasonable time to first analysis (should be under 30 seconds)
      expect(totalTime).toBeLessThan(30000);
      
      console.log(`Time from landing to first analysis: ${(totalTime / 1000).toFixed(1)} seconds`);
    });

    test('should verify no friction points in flow', async ({ page }) => {
      const frictionPoints = [];
      
      await test.step('Check for error messages on landing', async () => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const errorElements = page.locator('.error, .alert-error, [role="alert"]');
        const errorCount = await errorElements.count();
        
        if (errorCount > 0) {
          frictionPoints.push('Errors visible on landing page');
        }
      });

      await test.step('Check tier selection clarity', async () => {
        const coffeeRadio = page.locator('input[value="coffee"]');
        const isVisible = await coffeeRadio.isVisible();
        const isChecked = await coffeeRadio.isChecked();
        
        if (!isVisible) {
          frictionPoints.push('Coffee tier not visible');
        }
        if (!isChecked) {
          frictionPoints.push('Coffee tier not pre-selected');
        }
      });

      await test.step('Check button clarity', async () => {
        const signUpButton = page.getByRole('button', { name: 'Sign Up' });
        const signInButton = page.getByRole('button', { name: 'Sign In' });
        
        const signUpVisible = await signUpButton.isVisible();
        const signInVisible = await signInButton.isVisible();
        
        if (!signUpVisible) {
          frictionPoints.push('Sign Up button not visible');
        }
        if (!signInVisible) {
          frictionPoints.push('Sign In button not visible');
        }
      });

      // Report any friction points found
      if (frictionPoints.length > 0) {
        console.warn('Friction points detected:', frictionPoints);
      }
      
      expect(frictionPoints).toHaveLength(0);
    });

    test('should validate conversion funnel metrics', async ({ page }) => {
      const metrics = {
        landingPageViews: 0,
        tierSelections: 0,
        signupAttempts: 0,
        signupCompletions: 0,
        analysisStarts: 0
      };

      await test.step('Simulate user journey and track metrics', async () => {
        // Landing page view
        await page.goto('/');
        metrics.landingPageViews++;
        
        // Tier selection (automatic with Coffee pre-selected)
        const coffeeRadio = page.locator('input[value="coffee"]');
        if (await coffeeRadio.isChecked()) {
          metrics.tierSelections++;
        }
        
        // Signup attempt
        const signUpButton = page.getByRole('button', { name: 'Sign Up' });
        await signUpButton.click();
        metrics.signupAttempts++;
        
        // Complete signup
        const tempEmail = await authHelper.createTemporaryEmail();
        await page.fill('input[type="email"]', tempEmail);
        await page.fill('input[type="password"]', 'TestPassword123!');
        await page.getByRole('button', { name: /sign up/i }).click();
        
        try {
          await page.waitForURL('/analyze', { timeout: 10000 });
          metrics.signupCompletions++;
        } catch (error) {
          console.warn('Signup did not complete successfully');
        }
      });

      // Calculate conversion rates
      const tierSelectionRate = metrics.tierSelections / metrics.landingPageViews;
      const signupAttemptRate = metrics.signupAttempts / metrics.tierSelections;
      const signupCompletionRate = metrics.signupCompletions / metrics.signupAttempts;
      
      console.log('Conversion Funnel Metrics:');
      console.log(`- Landing Page Views: ${metrics.landingPageViews}`);
      console.log(`- Tier Selections: ${metrics.tierSelections} (${(tierSelectionRate * 100).toFixed(1)}%)`);
      console.log(`- Signup Attempts: ${metrics.signupAttempts} (${(signupAttemptRate * 100).toFixed(1)}%)`);
      console.log(`- Signup Completions: ${metrics.signupCompletions} (${(signupCompletionRate * 100).toFixed(1)}%)`);
      
      // Validate expected conversion rates
      expect(tierSelectionRate).toBeGreaterThanOrEqual(0.9); // 90%+ should select tier
      expect(signupAttemptRate).toBeGreaterThanOrEqual(0.8);  // 80%+ should attempt signup
      expect(signupCompletionRate).toBeGreaterThanOrEqual(0.7); // 70%+ should complete signup
    });
  });

  test.describe('Performance and UX Validation', () => {
    test('should measure page load performance', async ({ page }) => {
      await test.step('Measure landing page load time', async () => {
        const startTime = Date.now();
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        console.log(`Landing page load time: ${loadTime}ms`);
        expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
      });

      await test.step('Measure signup page load time', async () => {
        const startTime = Date.now();
        await page.goto('/signup?tier=coffee');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        console.log(`Signup page load time: ${loadTime}ms`);
        expect(loadTime).toBeLessThan(2000); // Should load in under 2 seconds
      });
    });

    test('should validate mobile responsiveness', async ({ page }) => {
      await test.step('Test mobile viewport', async () => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        await page.goto('/');
        
        // Verify tier selection is visible and usable on mobile
        const coffeeRadio = page.locator('input[value="coffee"]');
        await expect(coffeeRadio).toBeVisible();
        
        // Verify buttons are accessible on mobile
        const signUpButton = page.getByRole('button', { name: 'Sign Up' });
        const signInButton = page.getByRole('button', { name: 'Sign In' });
        
        await expect(signUpButton).toBeVisible();
        await expect(signInButton).toBeVisible();
        
        await page.screenshot({ 
          path: 'test-results/mobile-tier-selection.png',
          fullPage: true 
        });
      });
    });
  });
});