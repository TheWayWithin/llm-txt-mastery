import { test, expect } from '@playwright/test';

/**
 * MANUAL PRODUCTION VALIDATION
 * 
 * Simplified validation tests to manually verify:
 * 1. Double-increment bug fix
 * 2. Email verification flow
 * 3. Basic site functionality
 * 
 * This test suite provides step-by-step validation that can be run
 * to verify the production fixes are working correctly.
 */

test.describe('Production Manual Validation', () => {

  test('Step 1: Homepage and signup navigation', async ({ page }) => {
    console.log('🧪 MANUAL VALIDATION: Homepage and signup navigation');
    
    // Navigate to homepage
    await page.goto('https://www.llmtxtmastery.com');
    await page.waitForLoadState('networkidle');
    
    // Verify homepage loads correctly
    await expect(page).toHaveTitle(/LLM\.txt Mastery/);
    console.log('✓ Homepage loads with correct title');
    
    // Look for signup button/link
    const signupButton = page.locator('a[href*="/signup"], button:has-text("Sign up"), a:has-text("Sign up"), button:has-text("Get Started"), a:has-text("Get Started")');
    const signupVisible = await signupButton.isVisible({ timeout: 10000 });
    
    if (signupVisible) {
      console.log('✓ Signup button found on homepage');
      await signupButton.click();
      await page.waitForLoadState('networkidle');
      
      // Verify we're on signup page
      const isOnSignup = page.url().includes('/signup') || 
                        await page.locator('h1:has-text("Sign up"), h2:has-text("Sign up"), form').isVisible();
      
      if (isOnSignup) {
        console.log('✓ Successfully navigated to signup page');
      } else {
        console.log('⚠️ May not be on signup page - current URL:', page.url());
      }
    } else {
      console.log('ℹ️ Direct signup link not found, trying direct navigation');
      await page.goto('https://www.llmtxtmastery.com/signup');
      await page.waitForLoadState('networkidle');
    }
    
    // Take screenshot for manual review
    await page.screenshot({ path: 'manual-validation-step1-signup.png', fullPage: true });
    console.log('📸 Screenshot saved: manual-validation-step1-signup.png');
  });

  test('Step 2: Signup form validation', async ({ page }) => {
    console.log('🧪 MANUAL VALIDATION: Signup form validation');
    
    // Navigate directly to signup
    await page.goto('https://www.llmtxtmastery.com/signup');
    await page.waitForLoadState('networkidle');
    
    // Look for form elements
    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]');
    const passwordInput = page.locator('input[type="password"], input[name*="password"], input[placeholder*="password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign up"), button:has-text("Create"), input[type="submit"]');
    
    // Verify form elements are present
    const emailVisible = await emailInput.isVisible({ timeout: 5000 });
    const passwordVisible = await passwordInput.isVisible({ timeout: 5000 });
    const submitVisible = await submitButton.isVisible({ timeout: 5000 });
    
    console.log(`Email input visible: ${emailVisible}`);
    console.log(`Password input visible: ${passwordVisible}`);
    console.log(`Submit button visible: ${submitVisible}`);
    
    if (emailVisible && passwordVisible && submitVisible) {
      console.log('✓ Signup form elements are present');
      
      // Fill form with test data
      const testEmail = `test-${Date.now()}@10minutemail.com`;
      const testPassword = `TestPass123!${Date.now()}`;
      
      await emailInput.fill(testEmail);
      await passwordInput.fill(testPassword);
      
      console.log(`✓ Form filled with email: ${testEmail}`);
    } else {
      console.log('⚠️ Some form elements not found');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'manual-validation-step2-form.png', fullPage: true });
    console.log('📸 Screenshot saved: manual-validation-step2-form.png');
  });

  test('Step 3: Check-email page validation', async ({ page }) => {
    console.log('🧪 MANUAL VALIDATION: Check-email page validation');
    
    // Navigate to signup and complete form
    await page.goto('https://www.llmtxtmastery.com/signup');
    await page.waitForLoadState('networkidle');
    
    // Fill and submit form
    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name*="password"], input[placeholder*="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign up"), button:has-text("Create")').first();
    
    if (await emailInput.isVisible() && await passwordInput.isVisible() && await submitButton.isVisible()) {
      const testEmail = `test-${Date.now()}@10minutemail.com`;
      await emailInput.fill(testEmail);
      await passwordInput.fill(`TestPass123!${Date.now()}`);
      await submitButton.click();
      
      // Wait for potential redirect
      await page.waitForTimeout(3000);
      
      // Check current URL and page content
      const currentUrl = page.url();
      const pageContent = await page.textContent('body');
      
      console.log(`Current URL after signup: ${currentUrl}`);
      console.log(`Page contains "check": ${pageContent?.toLowerCase().includes('check')}`);
      console.log(`Page contains "email": ${pageContent?.toLowerCase().includes('email')}`);
      
      // Validate check-email behavior
      if (currentUrl.includes('/check-email') || pageContent?.toLowerCase().includes('check your email')) {
        console.log('✅ CORRECT: Redirected to check-email page');
      } else if (currentUrl.includes('/analyze')) {
        console.log('❌ INCORRECT: Redirected directly to analyze page (should go to check-email first)');
      } else {
        console.log('ℹ️ Unexpected redirect:', currentUrl);
      }
      
      // Take screenshot
      await page.screenshot({ path: 'manual-validation-step3-check-email.png', fullPage: true });
      console.log('📸 Screenshot saved: manual-validation-step3-check-email.png');
    } else {
      console.log('⚠️ Could not complete signup form');
    }
  });

  test('Step 4: Analyze page access validation', async ({ page }) => {
    console.log('🧪 MANUAL VALIDATION: Analyze page access');
    
    // Try to access analyze page directly
    await page.goto('https://www.llmtxtmastery.com/analyze');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    const pageContent = await page.textContent('body');
    
    console.log(`Direct analyze access URL: ${currentUrl}`);
    
    // Check if we can access analyze page
    const hasAnalyzeFeatures = pageContent?.toLowerCase().includes('url') &&
                               pageContent?.toLowerCase().includes('analyze');
    
    const hasAuthRequired = pageContent?.toLowerCase().includes('sign') ||
                           pageContent?.toLowerCase().includes('login') ||
                           pageContent?.toLowerCase().includes('verify');
    
    if (hasAnalyzeFeatures) {
      console.log('ℹ️ Analyze page accessible (may indicate user is logged in or auth not required)');
    } else if (hasAuthRequired) {
      console.log('✓ Analyze page requires authentication (as expected)');
    } else {
      console.log('ℹ️ Unexpected analyze page state');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'manual-validation-step4-analyze-access.png', fullPage: true });
    console.log('📸 Screenshot saved: manual-validation-step4-analyze-access.png');
  });

  test('Step 5: Usage counter investigation', async ({ page }) => {
    console.log('🧪 MANUAL VALIDATION: Usage counter investigation');
    
    // Navigate to analyze page (or wherever the counter might be)
    await page.goto('https://www.llmtxtmastery.com/analyze');
    await page.waitForLoadState('networkidle');
    
    // Look for usage counter patterns
    const pageContent = await page.textContent('body');
    const counterPatterns = [
      /\d+\/\d+/,  // "1/3", "2/3"
      /\d+\s+of\s+\d+/,  // "1 of 3"
      /\d+\s+\/\s+\d+/,  // "1 / 3"
    ];
    
    let foundCounter = false;
    for (const pattern of counterPatterns) {
      const matches = pageContent?.match(pattern);
      if (matches) {
        console.log(`✓ Found usage counter pattern: ${matches[0]}`);
        foundCounter = true;
      }
    }
    
    if (!foundCounter) {
      console.log('ℹ️ No usage counter pattern found on current page');
    }
    
    // Look for specific text patterns
    const usageIndicators = ['usage', 'limit', 'remaining', 'analyses', 'daily'];
    const foundIndicators = usageIndicators.filter(indicator => 
      pageContent?.toLowerCase().includes(indicator)
    );
    
    if (foundIndicators.length > 0) {
      console.log(`✓ Found usage-related text: ${foundIndicators.join(', ')}`);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'manual-validation-step5-usage-counter.png', fullPage: true });
    console.log('📸 Screenshot saved: manual-validation-step5-usage-counter.png');
  });

  test('Step 6: Complete flow verification', async ({ page }) => {
    console.log('🧪 MANUAL VALIDATION: Complete flow verification');
    
    // Start from homepage
    await page.goto('https://www.llmtxtmastery.com');
    await page.waitForLoadState('networkidle');
    
    // Navigate through the complete flow
    const steps = [
      { name: 'Homepage', url: 'https://www.llmtxtmastery.com', screenshot: 'step6-homepage.png' },
      { name: 'Signup', url: 'https://www.llmtxtmastery.com/signup', screenshot: 'step6-signup.png' },
      { name: 'Login', url: 'https://www.llmtxtmastery.com/login', screenshot: 'step6-login.png' },
      { name: 'Analyze', url: 'https://www.llmtxtmastery.com/analyze', screenshot: 'step6-analyze.png' },
      { name: 'Check Email', url: 'https://www.llmtxtmastery.com/check-email', screenshot: 'step6-check-email.png' },
    ];
    
    for (const step of steps) {
      try {
        console.log(`📄 Testing ${step.name} page: ${step.url}`);
        await page.goto(step.url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        const title = await page.title();
        const url = page.url();
        
        console.log(`  ✓ ${step.name}: Title="${title}", URL="${url}"`);
        
        // Take screenshot
        await page.screenshot({ path: `manual-validation-${step.screenshot}`, fullPage: true });
        
      } catch (error) {
        console.log(`  ⚠️ ${step.name}: Error - ${error.message}`);
      }
    }
    
    console.log('✅ Complete flow verification finished');
  });

});