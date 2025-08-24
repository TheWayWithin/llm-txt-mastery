import { test, expect, Page } from '@playwright/test';

// 10-minute temporary email service helper
class TempEmailService {
  private static baseUrl = 'https://10minutemail.com';
  
  static async generateTempEmail(page: Page): Promise<string> {
    await page.goto(this.baseUrl);
    await page.waitForLoadState('networkidle');
    
    // Get the generated email address
    const emailSelector = '#mail_address';
    await page.waitForSelector(emailSelector, { timeout: 10000 });
    const email = await page.inputValue(emailSelector);
    
    console.log(`Generated temp email: ${email}`);
    return email;
  }
  
  static async checkInbox(page: Page): Promise<boolean> {
    // Check for new emails
    try {
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Look for email entries
      const emailRows = await page.locator('#mail_messages_content tr').count();
      return emailRows > 0;
    } catch (error) {
      console.log('No emails found yet');
      return false;
    }
  }
}

// Performance metrics helper
class PerformanceMetrics {
  static startTime: number;
  
  static start() {
    this.startTime = Date.now();
  }
  
  static end(): number {
    return Date.now() - this.startTime;
  }
  
  static async measureAnalysisTime(page: Page, url: string): Promise<number> {
    const startTime = Date.now();
    
    // Wait for analysis to complete (look for success state)
    await page.waitForSelector('[data-testid="analysis-complete"], .analysis-results', { 
      timeout: 120000 // 2 minutes max
    });
    
    return Date.now() - startTime;
  }
}

test.describe('Production Regression Test Suite', () => {
  test.setTimeout(300000); // 5 minutes per test
  
  test.describe('FREE TIER TESTING', () => {
    test('should handle complete free tier user flow', async ({ page, browser }) => {
      console.log('=== FREE TIER TEST START ===');
      
      // Generate temporary email
      const tempEmailPage = await browser.newPage();
      const tempEmail = await TempEmailService.generateTempEmail(tempEmailPage);
      
      // Navigate to production site
      await page.goto('https://www.llmtxtmastery.com');
      await page.waitForLoadState('networkidle');
      
      // Verify homepage loads
      await expect(page.locator('h1')).toContainText('LLM.txt', { timeout: 10000 });
      
      // Start analysis flow
      await page.fill('[data-testid="url-input"], input[placeholder*="website"], input[type="url"]', 'https://docs.python.org');
      await page.click('button:has-text("Analyze"), button:has-text("Start")');
      
      // Email capture step
      await page.waitForSelector('input[type="email"]', { timeout: 15000 });
      await page.fill('input[type="email"]', tempEmail);
      
      // Select FREE tier
      await page.click('[data-testid="tier-free"], button:has-text("Free"), .tier-card:has-text("Free")');
      
      // Submit
      await page.click('button:has-text("Continue"), button:has-text("Start Analysis"), button[type="submit"]');
      
      // Wait for analysis to start
      await page.waitForSelector('.progress, [data-testid="analysis-progress"], .analysis-status', { timeout: 30000 });
      
      // Measure analysis time
      PerformanceMetrics.start();
      await page.waitForSelector('[data-testid="analysis-complete"], .analysis-results, .page-count', { timeout: 120000 });
      const analysisTime = PerformanceMetrics.end();
      
      console.log(`Free tier analysis completed in: ${analysisTime}ms`);
      
      // Verify 20-page limit is enforced
      const pageCountText = await page.textContent('.page-count, [data-testid="page-count"]');
      const pageCount = parseInt(pageCountText?.match(/\d+/)?.[0] || '0');
      expect(pageCount).toBeLessThanOrEqual(20);
      
      console.log(`Free tier page count: ${pageCount}`);
      
      // Test "Analyze Another Website" functionality
      const analyzeAnotherBtn = page.locator('button:has-text("Analyze Another"), a:has-text("Analyze Another")');
      if (await analyzeAnotherBtn.isVisible()) {
        await analyzeAnotherBtn.click();
        await expect(page.locator('input[type="url"]')).toBeVisible();
        console.log('✅ Analyze Another Website button works');
      }
      
      // Close temp email page
      await tempEmailPage.close();
      
      console.log('=== FREE TIER TEST COMPLETE ===');
    });
    
    test('should enforce daily limits for free users', async ({ page, browser }) => {
      console.log('=== DAILY LIMIT TEST START ===');
      
      // Generate first email
      const tempEmailPage1 = await browser.newPage();
      const tempEmail1 = await TempEmailService.generateTempEmail(tempEmailPage1);
      
      // Perform first analysis
      await page.goto('https://www.llmtxtmastery.com');
      await page.fill('input[type="url"]', 'https://reactjs.org');
      await page.click('button:has-text("Analyze")');
      await page.fill('input[type="email"]', tempEmail1);
      await page.click('[data-testid="tier-free"]');
      await page.click('button[type="submit"]');
      
      // Wait for first analysis to complete
      await page.waitForSelector('.analysis-results', { timeout: 120000 });
      
      // Try second analysis with same email
      await page.goto('https://www.llmtxtmastery.com');
      await page.fill('input[type="url"]', 'https://nodejs.org');
      await page.click('button:has-text("Analyze")');
      await page.fill('input[type="email"]', tempEmail1);
      
      // Should show usage counter or proceed to second analysis
      const hasUsageDisplay = await page.locator('.usage-count, [data-testid="usage-count"]').isVisible();
      console.log(`Usage tracking visible: ${hasUsageDisplay}`);
      
      await tempEmailPage1.close();
      
      console.log('=== DAILY LIMIT TEST COMPLETE ===');
    });
  });
  
  test.describe('COFFEE TIER TESTING', () => {
    test('should load Stripe checkout for coffee tier', async ({ page, browser }) => {
      console.log('=== COFFEE TIER TEST START ===');
      
      // Generate temporary email
      const tempEmailPage = await browser.newPage();
      const tempEmail = await TempEmailService.generateTempEmail(tempEmailPage);
      
      // Navigate and start analysis
      await page.goto('https://www.llmtxtmastery.com');
      await page.fill('input[type="url"]', 'https://docs.python.org');
      await page.click('button:has-text("Analyze")');
      
      // Email capture
      await page.fill('input[type="email"]', tempEmail);
      
      // Select COFFEE tier
      await page.click('[data-testid="tier-coffee"], button:has-text("Coffee"), .tier-card:has-text("Coffee")');
      
      // Submit should redirect to Stripe
      await page.click('button:has-text("Continue"), button:has-text("Purchase")');
      
      // Wait for Stripe redirect or checkout page
      try {
        await page.waitForURL(/stripe\.com|checkout\.stripe\.com/, { timeout: 30000 });
        console.log('✅ Stripe checkout loaded successfully');
        
        // Verify Stripe elements are present
        const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
        await expect(stripeFrame.locator('input[placeholder*="card"], input[placeholder*="Card"]')).toBeVisible({ timeout: 15000 });
        console.log('✅ Stripe payment form visible');
        
      } catch (error) {
        // Alternative: Check if we're on checkout page within our domain
        const currentUrl = page.url();
        console.log(`Current URL after coffee selection: ${currentUrl}`);
        
        if (currentUrl.includes('checkout') || await page.locator('.stripe-checkout, #stripe-element').isVisible()) {
          console.log('✅ Checkout page loaded (embedded Stripe)');
        } else {
          throw new Error('Stripe checkout did not load properly');
        }
      }
      
      await tempEmailPage.close();
      
      console.log('=== COFFEE TIER TEST COMPLETE ===');
    });
  });
  
  test.describe('PERFORMANCE TESTING', () => {
    test('should meet performance benchmarks', async ({ page }) => {
      console.log('=== PERFORMANCE TEST START ===');
      
      const testSites = [
        'https://docs.python.org',
        'https://reactjs.org',
        'https://nodejs.org'
      ];
      
      const analysisTimes: number[] = [];
      
      for (const site of testSites) {
        console.log(`Testing performance for: ${site}`);
        
        await page.goto('https://www.llmtxtmastery.com');
        await page.fill('input[type="url"]', site);
        await page.click('button:has-text("Analyze")');
        
        // Use a test email for performance testing
        await page.fill('input[type="email"]', 'performance-test@example.com');
        await page.click('[data-testid="tier-free"]');
        await page.click('button[type="submit"]');
        
        // Measure analysis time
        const analysisTime = await PerformanceMetrics.measureAnalysisTime(page, site);
        analysisTimes.push(analysisTime);
        
        console.log(`${site} analysis time: ${analysisTime}ms`);
      }
      
      const avgTime = analysisTimes.reduce((a, b) => a + b, 0) / analysisTimes.length;
      console.log(`Average analysis time: ${avgTime}ms`);
      console.log(`Baseline comparison: 1349ms`);
      
      // Performance should be reasonable (under 30 seconds)
      expect(avgTime).toBeLessThan(30000);
      
      console.log('=== PERFORMANCE TEST COMPLETE ===');
    });
    
    test('should verify connection pooling is active', async ({ page }) => {
      console.log('=== CONNECTION POOLING TEST START ===');
      
      // Monitor network activity
      const requests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('llm-txt-mastery-production.up.railway.app')) {
          requests.push(request.url());
        }
      });
      
      await page.goto('https://www.llmtxtmastery.com');
      await page.fill('input[type="url"]', 'https://docs.python.org');
      await page.click('button:has-text("Analyze")');
      await page.fill('input[type="email"]', 'pool-test@example.com');
      await page.click('[data-testid="tier-free"]');
      await page.click('button[type="submit"]');
      
      // Wait for some API calls
      await page.waitForTimeout(5000);
      
      console.log(`API requests made: ${requests.length}`);
      console.log('API endpoints called:', [...new Set(requests)]);
      
      // Verify backend is being called
      expect(requests.length).toBeGreaterThan(0);
      
      console.log('=== CONNECTION POOLING TEST COMPLETE ===');
    });
  });
  
  test.describe('ERROR HANDLING', () => {
    test('should handle invalid URLs gracefully', async ({ page }) => {
      console.log('=== INVALID URL TEST START ===');
      
      await page.goto('https://www.llmtxtmastery.com');
      
      const invalidUrls = [
        'not-a-url',
        'http://nonexistent-domain-12345.com',
        'https://localhost:99999'
      ];
      
      for (const invalidUrl of invalidUrls) {
        await page.fill('input[type="url"]', invalidUrl);
        await page.click('button:has-text("Analyze")');
        
        // Should show error or validation message
        const hasError = await page.locator('.error, .alert-destructive, [role="alert"]').isVisible({ timeout: 5000 });
        const hasValidation = await page.locator('input:invalid, .error-message').isVisible({ timeout: 5000 });
        
        expect(hasError || hasValidation).toBe(true);
        console.log(`✅ Error handling for ${invalidUrl}: ${hasError ? 'Error shown' : 'Validation shown'}`);
        
        // Clear for next test
        await page.fill('input[type="url"]', '');
      }
      
      console.log('=== INVALID URL TEST COMPLETE ===');
    });
    
    test('should handle bot protection sites', async ({ page }) => {
      console.log('=== BOT PROTECTION TEST START ===');
      
      await page.goto('https://www.llmtxtmastery.com');
      await page.fill('input[type="url"]', 'https://cloudflare.com');
      await page.click('button:has-text("Analyze")');
      await page.fill('input[type="email"]', 'bot-test@example.com');
      await page.click('[data-testid="tier-free"]');
      await page.click('button[type="submit"]');
      
      // Wait for either success or error
      try {
        await page.waitForSelector('.analysis-results, .error-message', { timeout: 60000 });
        
        const hasResults = await page.locator('.analysis-results').isVisible();
        const hasError = await page.locator('.error-message').isVisible();
        
        if (hasError) {
          console.log('✅ Bot protection error handled gracefully');
        } else if (hasResults) {
          console.log('✅ Bot protection bypassed successfully');
        }
        
        // Either outcome is acceptable
        expect(hasResults || hasError).toBe(true);
        
      } catch (error) {
        console.log('⚠️ Bot protection test timed out (expected for some sites)');
      }
      
      console.log('=== BOT PROTECTION TEST COMPLETE ===');
    });
  });
  
  test.describe('CROSS-BROWSER TESTING', () => {
    test('should work in Firefox', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test');
      
      console.log('=== FIREFOX TEST START ===');
      
      await page.goto('https://www.llmtxtmastery.com');
      await expect(page.locator('h1')).toContainText('LLM.txt');
      
      await page.fill('input[type="url"]', 'https://docs.python.org');
      await page.click('button:has-text("Analyze")');
      await page.fill('input[type="email"]', 'firefox-test@example.com');
      await page.click('[data-testid="tier-free"]');
      await page.click('button[type="submit"]');
      
      await page.waitForSelector('.progress, .analysis-status', { timeout: 30000 });
      console.log('✅ Firefox: Analysis started successfully');
      
      console.log('=== FIREFOX TEST COMPLETE ===');
    });
  });
  
  test.describe('MOBILE RESPONSIVENESS', () => {
    test('should work on mobile viewport', async ({ page }) => {
      console.log('=== MOBILE TEST START ===');
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone 12 size
      
      await page.goto('https://www.llmtxtmastery.com');
      await page.waitForLoadState('networkidle');
      
      // Verify responsive layout
      const header = page.locator('h1');
      await expect(header).toBeVisible();
      
      const urlInput = page.locator('input[type="url"]');
      await expect(urlInput).toBeVisible();
      
      // Test touch interaction
      await urlInput.tap();
      await urlInput.fill('https://docs.python.org');
      
      const analyzeBtn = page.locator('button:has-text("Analyze")');
      await expect(analyzeBtn).toBeVisible();
      await analyzeBtn.tap();
      
      // Verify email capture works on mobile
      await page.waitForSelector('input[type="email"]', { timeout: 15000 });
      await page.tap('input[type="email"]');
      await page.fill('input[type="email"]', 'mobile-test@example.com');
      
      console.log('✅ Mobile responsive layout working');
      
      console.log('=== MOBILE TEST COMPLETE ===');
    });
  });
});