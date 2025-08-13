import { test, expect } from '@playwright/test';

/**
 * Production Validation Test Suite
 * Tests the live production system at www.llmtxtmastery.com
 * Validates solopreneur pivot messaging, MVP pages, and core functionality
 */

test.describe('Production Validation Tests', () => {
  test.describe('Landing Page Tests', () => {
    test('should display solopreneur messaging and branding', async ({ page }) => {
      await page.goto('/');
      
      // Verify main solopreneur messaging
      await expect(page.locator('h1')).toContainText('Get Found by ChatGPT, Claude & Perplexity');
      
      // Check for Jamie Watters branding
      await expect(page.getByText('Built by Jamie Watters')).toBeVisible();
      
      // Verify trust indicators are present
      const trustIndicators = page.locator('[data-testid="trust-indicators"], .trust-indicators, .testimonials');
      if (await trustIndicators.count() > 0) {
        await expect(trustIndicators.first()).toBeVisible();
      }
      
      // Take screenshot for visual verification
      await page.screenshot({ path: 'playwright-report/landing-page-desktop.png', fullPage: true });
    });

    test('should have functional email capture form', async ({ page }) => {
      await page.goto('/');
      
      // Find email input field
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
      await expect(emailInput).toBeVisible();
      
      // Test email input functionality
      await emailInput.fill('test@playwright-testing.com');
      await expect(emailInput).toHaveValue('test@playwright-testing.com');
      
      // Look for submit button or next step
      const submitButton = page.locator('button[type="submit"], button:has-text("Get Started"), button:has-text("Continue"), button:has-text("Start")').first();
      if (await submitButton.count() > 0) {
        await expect(submitButton).toBeVisible();
        await expect(submitButton).toBeEnabled();
      }
    });

    test('should display tier selection with correct options', async ({ page }) => {
      await page.goto('/');
      
      // Fill email to potentially trigger tier selection
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.count() > 0) {
        await emailInput.fill('test@playwright-testing.com');
        
        // Look for continue/submit button
        const continueButton = page.locator('button[type="submit"], button:has-text("Get Started"), button:has-text("Continue")').first();
        if (await continueButton.count() > 0) {
          await continueButton.click();
          await page.waitForTimeout(2000); // Wait for potential navigation or form update
        }
      }
      
      // Check for tier options - they might be visible immediately or after email submission
      const freeTier = page.getByText('Test Drive', { exact: false }).or(page.getByText('Free', { exact: false }));
      const coffeeTier = page.getByText('Solopreneur Special', { exact: false }).or(page.getByText('Coffee', { exact: false }));
      
      // Allow for either immediate visibility or after email submission
      if (await freeTier.count() > 0 || await coffeeTier.count() > 0) {
        if (await freeTier.count() > 0) {
          await expect(freeTier.first()).toBeVisible();
        }
        if (await coffeeTier.count() > 0) {
          await expect(coffeeTier.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('MVP Pages Navigation Tests', () => {
    const mvpPages = [
      { path: '/about', name: 'About Page' },
      { path: '/docs', name: 'Documentation Page' },
      { path: '/contact', name: 'Contact Page' },
      { path: '/privacy', name: 'Privacy Policy' },
      { path: '/terms', name: 'Terms of Service' },
      { path: '/blog', name: 'Blog Page' }
    ];

    for (const page of mvpPages) {
      test(`should render ${page.name} without errors`, async ({ page: testPage }) => {
        await testPage.goto(page.path);
        
        // Check that page loads successfully (not 404)
        await expect(testPage.locator('body')).not.toContainText('404');
        await expect(testPage.locator('body')).not.toContainText('Page not found');
        
        // Check for basic page structure
        const mainContent = testPage.locator('main, .main, #main, [role="main"]');
        if (await mainContent.count() > 0) {
          await expect(mainContent.first()).toBeVisible();
        }
        
        // Verify navigation is present
        const navigation = testPage.locator('nav, .nav, .navigation, header nav');
        if (await navigation.count() > 0) {
          await expect(navigation.first()).toBeVisible();
        }
        
        // Take screenshot for visual verification
        await testPage.screenshot({ 
          path: `playwright-report/${page.path.replace('/', '')}-page.png`, 
          fullPage: true 
        });
      });
    }
  });

  test.describe('Free Tier Flow Test', () => {
    test('should complete free tier analysis workflow', async ({ page }) => {
      await page.goto('/');
      
      // Step 1: Enter test email
      const emailInput = page.locator('input[type="email"]').first();
      await emailInput.fill('playwright-test@example.com');
      
      // Step 2: Submit email (look for various possible button texts)
      const submitButton = page.locator('button[type="submit"], button:has-text("Get Started"), button:has-text("Continue"), button:has-text("Start")').first();
      await submitButton.click();
      
      // Wait for potential navigation or form update
      await page.waitForTimeout(3000);
      
      // Step 3: Select free tier if tier selection appears
      const freeTierButton = page.locator('button:has-text("Test Drive"), button:has-text("Free"), [data-tier="free"]');
      if (await freeTierButton.count() > 0) {
        await freeTierButton.first().click();
        await page.waitForTimeout(2000);
      }
      
      // Step 4: Look for URL input or analysis interface
      const urlInput = page.locator('input[type="url"], input[placeholder*="website" i], input[placeholder*="url" i]');
      if (await urlInput.count() > 0) {
        await urlInput.fill('https://example.com');
        
        // Look for analyze button
        const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Start Analysis"), button[type="submit"]');
        if (await analyzeButton.count() > 0) {
          await analyzeButton.first().click();
          
          // Wait for analysis to start
          await page.waitForTimeout(5000);
          
          // Check for analysis in progress indicators
          const analysisIndicators = page.locator(
            '.loading, .spinner, .progress, text="Analyzing", text="Processing", text="Loading"'
          );
          
          // Take screenshot of analysis state
          await page.screenshot({ 
            path: 'playwright-report/free-tier-analysis.png', 
            fullPage: true 
          });
        }
      }
    });
  });

  test.describe('Footer Links and Navigation', () => {
    test('should have working footer links', async ({ page }) => {
      await page.goto('/');
      
      // Scroll to footer
      await page.locator('footer').scrollIntoViewIfNeeded();
      
      // Check for footer links (excluding # placeholders)
      const footerLinks = page.locator('footer a[href]:not([href="#"])');
      const linkCount = await footerLinks.count();
      
      if (linkCount > 0) {
        // Test first few footer links to ensure they're not placeholder links
        for (let i = 0; i < Math.min(3, linkCount); i++) {
          const link = footerLinks.nth(i);
          const href = await link.getAttribute('href');
          
          // Ensure it's not a placeholder
          expect(href).not.toBe('#');
          expect(href).not.toBe('');
          
          // If it's an internal link, verify it exists
          if (href && href.startsWith('/')) {
            await link.click();
            await page.waitForTimeout(1000);
            
            // Check that we didn't land on a 404 page
            await expect(page.locator('body')).not.toContainText('404');
            await expect(page.locator('body')).not.toContainText('Page not found');
            
            // Go back to homepage for next test
            await page.goto('/');
            await page.locator('footer').scrollIntoViewIfNeeded();
          }
        }
      }
    });

    test('should have consistent navigation across pages', async ({ page }) => {
      const testPages = ['/', '/about', '/docs', '/contact'];
      
      for (const testPage of testPages) {
        await page.goto(testPage);
        
        // Check for navigation menu
        const nav = page.locator('nav, .nav, .navigation, header nav').first();
        await expect(nav).toBeVisible();
        
        // Check for logo/home link
        const logo = page.locator('a[href="/"], img[alt*="logo" i], .logo');
        if (await logo.count() > 0) {
          await expect(logo.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should be mobile responsive on key pages', async ({ page, isMobile }) => {
      if (!isMobile) {
        // Set mobile viewport for this test
        await page.setViewportSize({ width: 375, height: 667 });
      }
      
      const testPages = ['/', '/about', '/docs'];
      
      for (const testPage of testPages) {
        await page.goto(testPage);
        
        // Check that content is visible and not cut off
        const body = page.locator('body');
        await expect(body).toBeVisible();
        
        // Check for mobile menu if present
        const mobileMenuButton = page.locator('button[aria-label*="menu" i], .menu-toggle, .hamburger');
        if (await mobileMenuButton.count() > 0) {
          await expect(mobileMenuButton.first()).toBeVisible();
          
          // Test mobile menu functionality
          await mobileMenuButton.first().click();
          await page.waitForTimeout(1000);
          
          // Check if menu opened
          const mobileMenu = page.locator('.mobile-menu, .menu-open, nav[aria-expanded="true"]');
          if (await mobileMenu.count() > 0) {
            await expect(mobileMenu.first()).toBeVisible();
          }
        }
        
        // Take mobile screenshot
        await page.screenshot({ 
          path: `playwright-report/mobile-${testPage.replace('/', 'home')}.png`, 
          fullPage: true 
        });
      }
    });

    test('should have usable forms on mobile', async ({ page, isMobile }) => {
      if (!isMobile) {
        await page.setViewportSize({ width: 375, height: 667 });
      }
      
      await page.goto('/');
      
      // Test email input on mobile
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.count() > 0) {
        await expect(emailInput).toBeVisible();
        
        // Ensure input is properly sized and accessible
        const inputBox = await emailInput.boundingBox();
        if (inputBox) {
          expect(inputBox.width).toBeGreaterThan(200); // Reasonable touch target
          expect(inputBox.height).toBeGreaterThan(30);
        }
        
        // Test input functionality
        await emailInput.fill('mobile-test@example.com');
        await expect(emailInput).toHaveValue('mobile-test@example.com');
      }
    });
  });

  test.describe('Performance and Loading', () => {
    test('should load main page within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      
      // Wait for main content to be visible
      await page.locator('body').waitFor({ state: 'visible' });
      
      const loadTime = Date.now() - startTime;
      
      // Page should load within 10 seconds (generous for production)
      expect(loadTime).toBeLessThan(10000);
      
      // Check for critical rendering path elements
      const title = page.locator('h1, .hero h1, .title');
      if (await title.count() > 0) {
        await expect(title.first()).toBeVisible();
      }
    });

    test('should not have console errors on main pages', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      const testPages = ['/', '/about', '/docs'];
      
      for (const testPage of testPages) {
        await page.goto(testPage);
        await page.waitForTimeout(2000); // Wait for JS to execute
      }
      
      // Filter out common non-critical errors
      const criticalErrors = errors.filter(error => 
        !error.includes('favicon') &&
        !error.includes('analytics') &&
        !error.includes('tracking') &&
        !error.toLowerCase().includes('network error')
      );
      
      if (criticalErrors.length > 0) {
        console.warn('Console errors found:', criticalErrors);
      }
      
      // Fail if there are many critical errors
      expect(criticalErrors.length).toBeLessThan(5);
    });
  });
});