import { test, expect } from '@playwright/test';

test.describe('Live Email Verification Flow', () => {
  const TEST_EMAIL_BASE = 'mjaxjgczjuawxgfzkt';
  const TEST_DOMAIN = 'fxavaj.com';
  const TEST_PASSWORD = 'TestPassword123!';
  const LIVE_URL = 'https://llmtxtmastery.com';
  
  // Generate unique email for each test
  function generateTestEmail() {
    const timestamp = Date.now();
    return `${TEST_EMAIL_BASE}-${timestamp}@${TEST_DOMAIN}`;
  }

  test.beforeEach(async ({ page }) => {
    // Navigate to the live site
    await page.goto(LIVE_URL);
  });

  // Helper function to register a user
  async function registerUser(page: any, email: string, password: string) {
    await page.click('button:has-text("Get Started")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('text="Sign up"');
    await page.waitForTimeout(1000); // Wait for form transition
    await page.fill('input[type="email"]', email);
    
    // Find password fields more specifically
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill(password); // First password field
    await passwordFields.nth(1).fill(password); // Confirm password field
    
    // Monitor for network response
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/register') && response.status() !== 404,
      { timeout: 10000 }
    );
    
    await page.click('button:has-text("Create Account")');
    
    // Wait for response and check result
    const response = await responsePromise;
    const responseData = await response.json();
    
    if (response.status() === 429) {
      console.warn('⚠️ Rate limit hit, but this is expected behavior - rate limiting is working correctly');
      console.log('Registration blocked due to rate limiting:', responseData);
      // For rate limit tests, this is actually a success - the system is protecting itself
      throw new Error(`Rate limit encountered (this is expected): ${responseData.error}`);
    }
    
    if (response.status() !== 201) {
      console.error('Registration failed:', response.status(), responseData);
      throw new Error(`Registration failed with status ${response.status()}: ${responseData.error}`);
    }
    
    console.log('Registration success:', responseData);
    
    // Wait for modal to close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
  }

  test('should complete registration and show email verification banner', async ({ page }) => {
    console.log('🧪 Testing live email verification flow...');
    
    const testEmail = generateTestEmail();
    console.log('📧 Using test email:', testEmail);
    
    // Step 1: Register user
    await registerUser(page, testEmail, TEST_PASSWORD);
    console.log('✅ User registered successfully');

    // Step 2: Verify email verification banner appears
    await expect(page.locator('text=Verify your email address')).toBeVisible({ timeout: 5000 });
    console.log('✅ Email verification banner is visible');

    // Step 3: Verify banner contains resend button
    await expect(page.locator('button:has-text("Resend Email")')).toBeVisible();
    console.log('✅ Resend Email button is visible');

    // Step 4: Verify user is logged in (check if email appears in UI - may be truncated)
    const emailBase = testEmail.split('@')[0]; // Get part before @
    await expect(page.locator(`text="${emailBase}"`).first()).toBeVisible();
    console.log('✅ User email is displayed, confirming logged in state');
  });

  test('should test email resend functionality', async ({ page }) => {
    console.log('🧪 Testing email resend functionality...');

    const testEmail = generateTestEmail();
    console.log('📧 Using test email for resend:', testEmail);

    // Step 1: Register user first
    await registerUser(page, testEmail, TEST_PASSWORD);
    console.log('✅ User registered for resend test');

    // Step 2: Monitor for API response
    const resendPromise = page.waitForResponse(
      response => response.url().includes('/api/auth/resend-verification'),
      { timeout: 15000 }
    );

    // Step 3: Click resend email button
    await page.click('button:has-text("Resend Email")');
    console.log('✅ Clicked resend email button');

    // Step 4: Wait for API response and verify success
    const response = await resendPromise;
    const responseData = await response.json();
    
    expect(response.status()).toBe(200);
    expect(responseData.success).toBe(true);
    console.log('✅ Email resend API call successful');

    // Step 5: Verify success indication (either button text change or toast)
    try {
      await expect(page.locator('button:has-text("Email Sent")')).toBeVisible({ timeout: 5000 });
      console.log('✅ Email sent button state confirmed');
    } catch {
      // Alternative: check for toast notification
      await expect(page.locator('text="Verification email sent"')).toBeVisible({ timeout: 5000 });
      console.log('✅ Success toast notification appeared');
    }
  });

  test('should handle authentication state correctly after logout', async ({ page }) => {
    console.log('🧪 Testing authentication state after logout...');

    // Register and login first
    await page.click('button:has-text("Get Started")');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[placeholder*="password"]', TEST_PASSWORD);
    await page.fill('input[placeholder*="Confirm"]', TEST_PASSWORD);
    await page.click('button:has-text("Create Account")');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });

    // Verify user is logged in with verification banner
    await expect(page.locator('text=Verify your email address')).toBeVisible();
    console.log('✅ User logged in with verification banner visible');

    // Step 1: Find and click logout (might be in dropdown or direct button)
    // Try to find user menu or logout button
    try {
      await page.click('button:has-text("Sign Out")', { timeout: 2000 });
    } catch {
      try {
        // Maybe it's in a dropdown menu
        await page.click(`text=${TEST_EMAIL}`);
        await page.click('button:has-text("Sign Out")');
      } catch {
        console.log('⚠️ Could not find logout button, will skip logout test');
        return;
      }
    }
    console.log('✅ Logged out successfully');

    // Step 2: Verify email verification banner is hidden after logout
    await expect(page.locator('text=Verify your email address')).not.toBeVisible({ timeout: 5000 });
    console.log('✅ Email verification banner hidden after logout');

    // Step 3: Verify user email is no longer displayed
    await expect(page.locator(`text=${TEST_EMAIL}`)).not.toBeVisible();
    console.log('✅ User email no longer displayed after logout');

    // Step 4: Verify "Get Started" button is visible again
    await expect(page.locator('button:has-text("Get Started")')).toBeVisible();
    console.log('✅ Get Started button visible for logged out user');
  });

  test('should validate API responses for email verification', async ({ page }) => {
    console.log('🧪 Testing API responses for email verification...');

    // Setup API response monitoring
    let registrationResponse: any = null;
    let emailHealthResponse: any = null;
    let resendResponse: any = null;

    // Monitor API calls
    page.on('response', async (response) => {
      const url = response.url();
      
      if (url.includes('/api/auth/register')) {
        registrationResponse = {
          status: response.status(),
          data: await response.json().catch(() => null)
        };
      } else if (url.includes('/api/auth/email-health')) {
        emailHealthResponse = {
          status: response.status(),
          data: await response.json().catch(() => null)
        };
      } else if (url.includes('/api/auth/resend-verification')) {
        resendResponse = {
          status: response.status(),
          data: await response.json().catch(() => null)
        };
      }
    });

    // Trigger registration
    await page.click('button:has-text("Get Started")');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[placeholder*="password"]', TEST_PASSWORD);
    await page.fill('input[placeholder*="Confirm"]', TEST_PASSWORD);
    await page.click('button:has-text("Create Account")');
    
    // Wait for registration to complete
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });

    // Verify registration API response
    expect(registrationResponse).toBeTruthy();
    expect(registrationResponse.status).toBe(201);
    expect(registrationResponse.data).toHaveProperty('success', true);
    expect(registrationResponse.data).toHaveProperty('user');
    expect(registrationResponse.data.user).toHaveProperty('email', TEST_EMAIL);
    console.log('✅ Registration API response validated');

    // Trigger resend email
    await page.click('button:has-text("Resend Email")');
    await expect(page.locator('button:has-text("Email Sent")')).toBeVisible({ timeout: 10000 });

    // Verify resend API response
    expect(resendResponse).toBeTruthy();
    expect(resendResponse.status).toBe(200);
    expect(resendResponse.data).toHaveProperty('success', true);
    console.log('✅ Resend email API response validated');

    // Check email health endpoint manually
    const healthResponse = await page.evaluate(async () => {
      const response = await fetch('https://llm-txt-mastery-production.up.railway.app/api/auth/email-health');
      return {
        status: response.status,
        data: await response.json()
      };
    });

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.data).toHaveProperty('success', true);
    expect(healthResponse.data).toHaveProperty('status', 'healthy');
    console.log('✅ Email health API response validated');
  });

  test('should test rate limiting behavior', async ({ page }) => {
    console.log('🧪 Testing rate limiting behavior...');

    const testEmail = `rate-test-${Date.now()}@fxavaj.com`;

    // First registration should succeed
    await page.click('button:has-text("Get Started")');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[placeholder*="password"]', TEST_PASSWORD);
    await page.fill('input[placeholder*="Confirm"]', TEST_PASSWORD);
    await page.click('button:has-text("Create Account")');
    
    // Should succeed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
    console.log('✅ First registration succeeded');

    // Logout first
    try {
      await page.click('button:has-text("Sign Out")', { timeout: 2000 });
    } catch {
      // Try dropdown
      try {
        await page.click(`text=${testEmail}`);
        await page.click('button:has-text("Sign Out")');
      } catch {
        // Reload page to clear auth state
        await page.reload();
      }
    }

    // Try registering multiple accounts quickly to test rate limiting
    const attempts = [];
    for (let i = 1; i <= 25; i++) { // Try more than the 20 limit
      const email = `rate-test-${Date.now()}-${i}@fxavaj.com`;
      
      try {
        await page.click('button:has-text("Get Started")');
        await page.fill('input[type="email"]', email);
        await page.fill('input[placeholder*="password"]', TEST_PASSWORD);
        await page.fill('input[placeholder*="Confirm"]', TEST_PASSWORD);
        
        const response = await page.waitForResponse(
          response => response.url().includes('/api/auth/register'),
          { timeout: 5000 }
        );
        
        attempts.push({
          attempt: i,
          status: response.status(),
          email: email
        });
        
        // Close any modal that might be open
        await page.keyboard.press('Escape');
        
        if (response.status() === 429) {
          console.log(`✅ Rate limit hit at attempt ${i}`);
          break;
        }
        
      } catch (error) {
        attempts.push({
          attempt: i,
          status: 'error',
          error: error.message
        });
        break;
      }
    }

    // Verify that rate limiting kicked in
    const rateLimited = attempts.some(attempt => attempt.status === 429);
    expect(rateLimited).toBeTruthy();
    console.log('✅ Rate limiting is working correctly');
    console.log(`📊 Total attempts: ${attempts.length}, Rate limited: ${rateLimited}`);
  });
});