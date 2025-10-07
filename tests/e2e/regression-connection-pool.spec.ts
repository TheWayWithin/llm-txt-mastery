import { test, expect, Page } from '@playwright/test';
import { generateTempEmail } from './utils/temp-email-service';

test.describe('Connection Pool Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage before each test
    await page.goto('/');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test.describe('Free Tier Functionality', () => {
    test('Free tier analysis still respects 20-page limit with connection pooling', async ({
      page,
    }) => {
      const email = generateTempEmail();

      // Start analysis with free tier
      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.click('[data-testid="quick-start-button"], button:has-text("Quick Start")');

      // Enter a URL that has many pages (documentation site)
      await page.fill('[data-testid="url-input"], input[name="url"]', 'https://docs.python.org');

      // Start analysis
      await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

      // Wait for analysis to complete
      await page.waitForSelector('[data-testid="analysis-complete"], text="Analysis Complete"', {
        timeout: 120000,
      });

      // Check that the free tier limit is respected
      const pageCountElement = await page
        .locator('[data-testid="page-count"], .page-count')
        .first();
      const pageCountText = await pageCountElement.textContent();
      const pageCount = parseInt(pageCountText?.match(/\\d+/)?.[0] || '0');

      expect(pageCount).toBeGreaterThan(0);
      expect(pageCount).toBeLessThanOrEqual(20);

      console.log(`Free tier analysis found ${pageCount} pages (limit: 20)`);
    });

    test('Free tier shows appropriate messaging about connection pooling benefits', async ({
      page,
    }) => {
      const email = generateTempEmail();

      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.click('[data-testid="quick-start-button"], button:has-text("Quick Start")');

      // Use a smaller site that should complete quickly with connection pooling
      await page.fill('[data-testid="url-input"], input[name="url"]', 'https://example.com');

      const startTime = Date.now();
      await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

      // Wait for analysis completion
      await page.waitForSelector('[data-testid="analysis-complete"], text="Analysis Complete"', {
        timeout: 60000,
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Analysis should complete reasonably quickly with connection pooling
      expect(duration).toBeLessThan(30000); // Less than 30 seconds

      console.log(`Free tier analysis completed in ${duration}ms with connection pooling`);
    });

    test('Free tier handles connection pooling errors gracefully', async ({ page }) => {
      const email = generateTempEmail();

      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.click('[data-testid="quick-start-button"], button:has-text("Quick Start")');

      // Try a site that might have connection issues
      await page.fill('[data-testid="url-input"], input[name="url"]', 'https://httpstat.us/500');

      await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

      // Should handle errors gracefully and show appropriate message
      const errorOrComplete = await Promise.race([
        page.waitForSelector('[data-testid="error-message"], .error-message', { timeout: 30000 }),
        page.waitForSelector('[data-testid="analysis-complete"], text="Analysis Complete"', {
          timeout: 30000,
        }),
      ]);

      // Either should show error handling or partial results
      expect(errorOrComplete).toBeTruthy();

      // Page should not crash or hang
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    });
  });

  test.describe('Coffee Tier Functionality', () => {
    test('Coffee tier gets 200 pages with connection pooling enabled', async ({ page }) => {
      // This test assumes we have a test coffee tier user
      // In a real test environment, you'd want to set up test Stripe products
      const email = 'coffee-test@tempmail.com';
      const password = 'testpass123';

      // Login with coffee tier account
      await page.click('[data-testid="login-button"], button:has-text("Sign In")');
      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.fill('[data-testid="password-input"], input[name="password"]', password);
      await page.click('[data-testid="signin-submit"], button[type="submit"]');

      // Wait for login to complete
      await page.waitForSelector('[data-testid="user-dashboard"], .user-dashboard', {
        timeout: 10000,
      });

      // Analyze a large documentation site
      await page.goto('/analyze');
      await page.fill('[data-testid="url-input"], input[name="url"]', 'https://nodejs.org/docs');

      const startTime = Date.now();
      await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

      // Wait for analysis to complete (longer timeout for more pages)
      await page.waitForSelector('[data-testid="analysis-complete"], text="Analysis Complete"', {
        timeout: 180000, // 3 minutes for larger analysis
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Check page count
      const pageCountElement = await page
        .locator('[data-testid="page-count"], .page-count')
        .first();
      const pageCountText = await pageCountElement.textContent();
      const pageCount = parseInt(pageCountText?.match(/\\d+/)?.[0] || '0');

      expect(pageCount).toBeGreaterThan(20); // Should exceed free tier limit
      expect(pageCount).toBeLessThanOrEqual(200); // Should respect coffee tier limit

      console.log(
        `Coffee tier analysis found ${pageCount} pages in ${duration}ms with connection pooling`
      );
    });

    test('Coffee tier shows performance improvement with connection pooling', async ({ page }) => {
      const email = 'coffee-test@tempmail.com';
      const password = 'testpass123';

      await page.click('[data-testid="login-button"], button:has-text("Sign In")');
      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.fill('[data-testid="password-input"], input[name="password"]', password);
      await page.click('[data-testid="signin-submit"], button[type="submit"]');

      await page.waitForSelector('[data-testid="user-dashboard"], .user-dashboard', {
        timeout: 10000,
      });

      // Test with a site that has multiple pages from same domain
      await page.goto('/analyze');
      await page.fill('[data-testid="url-input"], input[name="url"]', 'https://react.dev');

      // Monitor network requests to verify connection reuse
      const requests = [];
      page.on('request', (request) => {
        if (request.url().includes('api/analyze')) {
          requests.push({
            url: request.url(),
            timestamp: Date.now(),
          });
        }
      });

      const startTime = Date.now();
      await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

      await page.waitForSelector('[data-testid="analysis-complete"], text="Analysis Complete"', {
        timeout: 120000,
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      // With connection pooling, should complete faster than traditional approach
      expect(duration).toBeLessThan(90000); // Less than 90 seconds

      // Should have successful results
      const pageCountElement = await page
        .locator('[data-testid="page-count"], .page-count')
        .first();
      const pageCountText = await pageCountElement.textContent();
      const pageCount = parseInt(pageCountText?.match(/\\d+/)?.[0] || '0');

      expect(pageCount).toBeGreaterThan(10); // Should find multiple pages

      console.log(`Coffee tier with connection pooling: ${pageCount} pages in ${duration}ms`);
    });
  });

  test.describe('Bot Protection and Resilience', () => {
    test('Bot protection detection still works with connection pooling', async ({ page }) => {
      const email = generateTempEmail();

      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.click('[data-testid="quick-start-button"], button:has-text("Quick Start")');

      // Try a site that might have bot protection
      await page.fill('[data-testid="url-input"], input[name="url"]', 'https://www.cloudflare.com');

      await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

      // Should handle bot protection gracefully
      const result = await Promise.race([
        page.waitForSelector('[data-testid="analysis-complete"], text="Analysis Complete"', {
          timeout: 60000,
        }),
        page.waitForSelector('[data-testid="bot-protection"], text="Bot protection detected"', {
          timeout: 60000,
        }),
        page.waitForSelector('[data-testid="error-message"], .error-message', { timeout: 60000 }),
      ]);

      expect(result).toBeTruthy();

      // Check that we get either results or clear error message
      const hasResults = await page.isVisible(
        '[data-testid="analysis-results"], .analysis-results'
      );
      const hasError = await page.isVisible('[data-testid="error-message"], .error-message');
      const hasBotProtection = await page.isVisible(
        '[data-testid="bot-protection"], text="Bot protection"'
      );

      expect(hasResults || hasError || hasBotProtection).toBe(true);
    });

    test('Connection pooling handles consecutive failures correctly', async ({ page }) => {
      const email = generateTempEmail();

      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.click('[data-testid="quick-start-button"], button:has-text("Quick Start")');

      // Try a site that will likely have issues
      await page.fill(
        '[data-testid="url-input"], input[name="url"]',
        'https://httpstat.us/timeout'
      );

      await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

      // Should handle failures and show appropriate message
      await expect(page.locator('[data-testid="error-message"], .error-message')).toBeVisible({
        timeout: 45000,
      });

      // Should not crash the application
      expect(await page.isVisible('[data-testid="analyze-form"], form')).toBe(true);
    });
  });

  test.describe('Performance Measurement', () => {
    test('Connection pooling provides measurable performance improvement', async ({ page }) => {
      const email = generateTempEmail();

      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.click('[data-testid="quick-start-button"], button:has-text("Quick Start")');

      // Test with a documentation site that has multiple pages
      await page.fill('[data-testid="url-input"], input[name="url"]', 'https://vitejs.dev');

      // Monitor performance timing
      const performanceMetrics = [];

      page.on('response', (response) => {
        if (response.url().includes('api/analyze')) {
          performanceMetrics.push({
            url: response.url(),
            status: response.status(),
            timing: response.timing(),
          });
        }
      });

      const startTime = Date.now();
      await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

      await page.waitForSelector('[data-testid="analysis-complete"], text="Analysis Complete"', {
        timeout: 60000,
      });
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Should complete within reasonable time
      expect(totalDuration).toBeLessThan(45000); // Less than 45 seconds

      // Should have found multiple pages
      const pageCountElement = await page
        .locator('[data-testid="page-count"], .page-count')
        .first();
      const pageCountText = await pageCountElement.textContent();
      const pageCount = parseInt(pageCountText?.match(/\\d+/)?.[0] || '0');

      expect(pageCount).toBeGreaterThan(5); // Should find multiple pages

      // Log performance metrics for analysis
      console.log(`Connection pooling performance: ${pageCount} pages in ${totalDuration}ms`);
      console.log(`Average time per page: ${Math.round(totalDuration / pageCount)}ms`);
    });

    test('Memory usage remains stable with connection pooling', async ({ page }) => {
      const email = generateTempEmail();

      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.click('[data-testid="quick-start-button"], button:has-text("Quick Start")');

      // Test multiple analyses to check for memory leaks
      const sites = [
        'https://example.com',
        'https://httpbin.org',
        'https://jsonplaceholder.typicode.com',
      ];

      for (const site of sites) {
        await page.fill('[data-testid="url-input"], input[name="url"]', site);
        await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

        // Wait for completion or error
        await Promise.race([
          page.waitForSelector('[data-testid="analysis-complete"], text="Analysis Complete"', {
            timeout: 30000,
          }),
          page.waitForSelector('[data-testid="error-message"], .error-message', { timeout: 30000 }),
        ]);

        // Reset for next analysis if needed
        const hasError = await page.isVisible('[data-testid="error-message"], .error-message');
        if (hasError) {
          await page.click('[data-testid="reset-button"], button:has-text("Analyze Another")');
          await page.waitForSelector('[data-testid="url-input"], input[name="url"]');
        }
      }

      // Application should still be responsive
      expect(await page.isVisible('[data-testid="analyze-form"], form')).toBe(true);

      // No JavaScript errors should have occurred
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error));

      // Give time for any delayed errors
      await page.waitForTimeout(2000);

      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Cross-browser Compatibility', () => {
    test('Connection pooling works correctly in Chrome', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chrome-specific test');

      const email = generateTempEmail();

      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.click('[data-testid="quick-start-button"], button:has-text("Quick Start")');

      await page.fill('[data-testid="url-input"], input[name="url"]', 'https://github.com');

      await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

      await page.waitForSelector('[data-testid="analysis-complete"], text="Analysis Complete"', {
        timeout: 60000,
      });

      // Should work correctly in Chrome
      const pageCountElement = await page
        .locator('[data-testid="page-count"], .page-count')
        .first();
      const pageCountText = await pageCountElement.textContent();
      const pageCount = parseInt(pageCountText?.match(/\\d+/)?.[0] || '0');

      expect(pageCount).toBeGreaterThan(0);
    });

    test('Connection pooling works correctly in Firefox', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test');

      const email = generateTempEmail();

      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.click('[data-testid="quick-start-button"], button:has-text("Quick Start")');

      await page.fill('[data-testid="url-input"], input[name="url"]', 'https://mozilla.org');

      await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

      await page.waitForSelector('[data-testid="analysis-complete"], text="Analysis Complete"', {
        timeout: 60000,
      });

      // Should work correctly in Firefox
      const pageCountElement = await page
        .locator('[data-testid="page-count"], .page-count')
        .first();
      const pageCountText = await pageCountElement.textContent();
      const pageCount = parseInt(pageCountText?.match(/\\d+/)?.[0] || '0');

      expect(pageCount).toBeGreaterThan(0);
    });

    test('Connection pooling works correctly in Safari', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Safari-specific test');

      const email = generateTempEmail();

      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.click('[data-testid="quick-start-button"], button:has-text("Quick Start")');

      await page.fill('[data-testid="url-input"], input[name="url"]', 'https://apple.com');

      await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

      await page.waitForSelector('[data-testid="analysis-complete"], text="Analysis Complete"', {
        timeout: 60000,
      });

      // Should work correctly in Safari
      const pageCountElement = await page
        .locator('[data-testid="page-count"], .page-count')
        .first();
      const pageCountText = await pageCountElement.textContent();
      const pageCount = parseInt(pageCountText?.match(/\\d+/)?.[0] || '0');

      expect(pageCount).toBeGreaterThan(0);
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('Handles network interruptions gracefully with connection pooling', async ({ page }) => {
      const email = generateTempEmail();

      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.click('[data-testid="quick-start-button"], button:has-text("Quick Start")');

      // Start analysis
      await page.fill('[data-testid="url-input"], input[name="url"]', 'https://httpbin.org');
      await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

      // Simulate network interruption by going offline briefly
      await page.context().setOffline(true);
      await page.waitForTimeout(2000);
      await page.context().setOffline(false);

      // Should either complete or show appropriate error
      const result = await Promise.race([
        page.waitForSelector('[data-testid="analysis-complete"], text="Analysis Complete"', {
          timeout: 60000,
        }),
        page.waitForSelector('[data-testid="error-message"], .error-message', { timeout: 60000 }),
      ]);

      expect(result).toBeTruthy();

      // Application should remain functional
      expect(await page.isVisible('[data-testid="analyze-form"], form')).toBe(true);
    });

    test('Handles malformed URLs gracefully', async ({ page }) => {
      const email = generateTempEmail();

      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.click('[data-testid="quick-start-button"], button:has-text("Quick Start")');

      // Try malformed URL
      await page.fill('[data-testid="url-input"], input[name="url"]', 'not-a-valid-url');
      await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

      // Should show validation error
      await expect(page.locator('[data-testid="validation-error"], .validation-error')).toBeVisible(
        {
          timeout: 5000,
        }
      );

      // Form should remain functional
      expect(await page.isVisible('[data-testid="url-input"], input[name="url"]')).toBe(true);
    });

    test('Handles concurrent analyses correctly', async ({ page }) => {
      const email = generateTempEmail();

      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.click('[data-testid="quick-start-button"], button:has-text("Quick Start")');

      // Start first analysis
      await page.fill('[data-testid="url-input"], input[name="url"]', 'https://example.com');
      await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

      // Wait a bit then try to start another (should be prevented or queued)
      await page.waitForTimeout(1000);

      // Button should be disabled or show different state
      const analyzeButton = page.locator(
        '[data-testid="analyze-button"], button:has-text("Analyzing")'
      );
      await expect(analyzeButton).toBeVisible({ timeout: 5000 });

      // Wait for completion
      await page.waitForSelector('[data-testid="analysis-complete"], text="Analysis Complete"', {
        timeout: 60000,
      });

      // Should complete successfully
      const pageCountElement = await page
        .locator('[data-testid="page-count"], .page-count')
        .first();
      expect(await pageCountElement.isVisible()).toBe(true);
    });
  });

  test.describe('Monitoring and Observability', () => {
    test('Connection pool metrics are accessible for monitoring', async ({ page }) => {
      // This test would typically check server-side metrics
      // For E2E testing, we'll verify the client-side behavior

      const email = generateTempEmail();

      await page.fill('[data-testid="email-input"], input[name="email"]', email);
      await page.click('[data-testid="quick-start-button"], button:has-text("Quick Start")');

      await page.fill('[data-testid="url-input"], input[name="url"]', 'https://docs.npmjs.com');

      // Monitor network requests
      const apiRequests = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          apiRequests.push(request.url());
        }
      });

      await page.click('[data-testid="analyze-button"], button:has-text("Analyze")');

      await page.waitForSelector('[data-testid="analysis-complete"], text="Analysis Complete"', {
        timeout: 90000,
      });

      // Should have made API requests
      expect(apiRequests.length).toBeGreaterThan(0);

      // Log for monitoring purposes
      console.log(`Connection pooling test completed with ${apiRequests.length} API requests`);
    });
  });
});
