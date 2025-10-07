import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('🔍 Testing authentication on live site...');

  // Go to the website
  await page.goto('https://llmtxtmastery.com');
  console.log('✅ Loaded homepage');

  // Click Get Started button
  try {
    await page.click('button:has-text("Get Started")', { timeout: 5000 });
    console.log('✅ Clicked Get Started button');
  } catch (e) {
    console.log('❌ Could not find Get Started button');
    // Try to find any auth-related button
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      console.log('  Button found:', text);
    }
  }

  await page.waitForTimeout(2000);

  // Check if signup form is visible
  const signupFormVisible = await page.isVisible('text="Create Account"');
  console.log('📝 Signup form visible:', signupFormVisible);

  // Also check for dialog/modal
  const modalVisible = await page.isVisible('[role="dialog"]');
  console.log('📝 Modal visible:', modalVisible);

  // Check for sign in form instead
  const signinFormVisible = await page.isVisible('text="Sign In"');
  console.log('📝 Sign in form visible:', signinFormVisible);

  if (!signupFormVisible && !signinFormVisible) {
    console.log('❌ No auth forms visible, checking page state...');
    const pageTitle = await page.title();
    console.log('  Page title:', pageTitle);
    const url = page.url();
    console.log('  Current URL:', url);

    // Take a screenshot for debugging
    await page.screenshot({ path: 'auth-debug.png' });
    console.log('📸 Screenshot saved as auth-debug.png');

    await browser.close();
    process.exit(1);
  }

  // If sign in is visible, switch to sign up
  if (signinFormVisible && !signupFormVisible) {
    console.log('📝 Switching to sign up form...');
    await page.click('text="Sign up"');
    await page.waitForTimeout(1000);
  }

  // Try to register a new user
  const timestamp = Date.now();
  const testEmail = `test${timestamp}@example.com`;
  const testPassword = 'TestPassword123!'; // Changed @ to ! for special char

  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[id="password"]', testPassword);
  await page.fill('input[id="confirmPassword"]', testPassword);

  console.log(`📧 Attempting registration with email: ${testEmail}`);

  // Listen for console messages
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('🔴 Console error:', msg.text());
    }
  });

  // Listen for network responses
  page.on('response', (response) => {
    if (response.url().includes('/api/auth/') && response.status() >= 400) {
      console.log(`🔴 API error: ${response.url()} - Status: ${response.status()}`);
    }
  });

  // Click Create Account
  await page.click('button:has-text("Create Account")');

  // Wait for response
  await page.waitForTimeout(3000);

  // Check for error or success
  const errorText = await page.textContent('.text-red-600, [role="alert"]').catch(() => null);
  if (errorText) {
    console.log('❌ Registration error:', errorText);
  } else {
    console.log('✅ No error message displayed');
  }

  // Check if modal is still open
  const modalStillOpen = await page.isVisible('[role="dialog"]');
  console.log('📝 Modal still open:', modalStillOpen);

  // Check if we're logged in
  const profileButton = await page.isVisible('button:has-text("Profile")').catch(() => false);
  console.log('👤 Profile button visible:', profileButton);

  // Check for any success message
  const successMessage = await page.textContent('.text-green-600').catch(() => null);
  if (successMessage) {
    console.log('✅ Success message:', successMessage);
  }

  // Check current URL
  const currentUrl = page.url();
  console.log('📍 Current URL:', currentUrl);

  // Check localStorage for auth tokens
  const hasToken = await page.evaluate(() => {
    return localStorage.getItem('accessToken') !== null;
  });
  console.log('🔑 Has auth token:', hasToken);

  await browser.close();
})();
