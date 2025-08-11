import { test, expect } from '@playwright/test';

test.describe('Email Verification Production Test', () => {
  test.use({
    baseURL: 'https://www.llmtxtmastery.com'
  });

  test('should register and check for email verification banner', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    // Set longer timeout for this test
    test.setTimeout(90000);
    
    // Capture console logs
    const consoleLogs: any[] = [];
    page.on('console', async msg => {
      const text = msg.text();
      
      // Try to get the actual objects from console
      if (text.includes('Object')) {
        try {
          const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => null)));
          consoleLogs.push({ text, args });
        } catch {
          consoleLogs.push({ text });
        }
      } else {
        consoleLogs.push({ text });
      }
      
      // Print relevant logs immediately
      if (text.includes('User verification check') || 
          text.includes('EmailVerificationBanner') ||
          text.includes('emailVerified')) {
        console.log('🔍 Console:', text);
      }
    });
    
    // Go to homepage with longer timeout
    await page.goto('/', { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // Give it time to load
    
    // Look for the user icon in the header
    // Try multiple selectors
    const userIconSelectors = [
      'button:has(svg[class*="lucide-user"])',
      'button:has([aria-label*="User"])',
      'header button:has(svg)',
      'nav button:has(svg)',
      '.AuthNav button',
      '[class*="AuthNav"] button'
    ];
    
    let clicked = false;
    for (const selector of userIconSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          await element.click();
          clicked = true;
          console.log(`Clicked user icon with selector: ${selector}`);
          break;
        }
      } catch {
        // Try next selector
      }
    }
    
    if (!clicked) {
      // Fallback: look for any button with User icon class
      await page.locator('button').filter({ hasText: /sign|log|user/i }).first().click();
    }
    
    // Wait for auth modal
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Click on Sign Up
    await page.locator('text=Sign up').click();
    await page.waitForTimeout(500);
    
    // Fill registration form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // Find confirm password field
    const confirmField = page.locator('input[type="password"]').nth(1);
    await confirmField.fill(testPassword);
    
    // Submit registration
    await page.locator('button:has-text("Sign up")').click();
    
    // Wait for registration to complete
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/prod-after-registration.png', fullPage: true });
    
    // Print all console logs with Objects
    console.log('\n=== All Console Logs ===');
    for (const log of consoleLogs) {
      if (log.text.includes('User verification check') || log.text.includes('EmailVerificationBanner')) {
        console.log('Log:', log.text);
        if (log.args) {
          console.log('Data:', JSON.stringify(log.args, null, 2));
        }
      }
    }
    
    // Check for banner elements
    const bannerSelectors = [
      'text=/verify.*email/i',
      'text=/email.*verification/i',
      '.bg-amber-50',
      '.border-amber-200',
      '[role="alert"]'
    ];
    
    for (const selector of bannerSelectors) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) {
        console.log(`✅ Found banner element: ${selector}`);
        const text = await page.locator(selector).textContent();
        console.log(`   Content: ${text}`);
      }
    }
    
    // Check page source for debugging
    const pageContent = await page.content();
    const hasVerifyText = pageContent.toLowerCase().includes('verify');
    const hasEmailVerified = pageContent.includes('emailVerified');
    
    console.log('\n=== Page Analysis ===');
    console.log('Contains "verify":', hasVerifyText);
    console.log('Contains "emailVerified":', hasEmailVerified);
    
    // Get the user info from logs
    const userLog = consoleLogs.find(log => log.text.includes('User signed up successfully'));
    if (userLog) {
      console.log('\n=== User Registration Log ===');
      console.log(userLog.text);
    }
    
    const verificationCheckLog = consoleLogs.find(log => log.text.includes('User verification check'));
    if (verificationCheckLog) {
      console.log('\n=== Verification Check Log ===');
      console.log(verificationCheckLog.text);
      if (verificationCheckLog.args) {
        console.log('Data:', JSON.stringify(verificationCheckLog.args, null, 2));
      }
    }
  });
});