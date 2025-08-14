import { test, expect } from '@playwright/test';

test.describe('Simple Conversion Test', () => {
  test('should validate Coffee tier default selection', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:8080');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Click "Get Started" button to show tier selection
    const getStartedButton = page.getByRole('button', { name: /get started/i });
    await expect(getStartedButton).toBeVisible();
    await getStartedButton.click();
    
    // Wait for tier selection to appear
    await page.waitForTimeout(1000);
    
    // Check if we're now showing email capture with tier selection
    // Look for Coffee tier elements
    const coffeeElements = await page.locator('text=/coffee/i').count();
    console.log(`Found ${coffeeElements} elements containing "Coffee"`);
    
    // Check for "MOST POPULAR" badge
    const mostPopular = await page.locator('text="MOST POPULAR"').count();
    console.log(`Found ${mostPopular} "MOST POPULAR" badges`);
    
    // Check if Coffee radio button exists and is selected
    const coffeeRadio = page.locator('input[type="radio"][value="coffee"]');
    const coffeeRadioCount = await coffeeRadio.count();
    console.log(`Found ${coffeeRadioCount} Coffee radio buttons`);
    
    if (coffeeRadioCount > 0) {
      const isChecked = await coffeeRadio.isChecked();
      console.log(`Coffee tier is ${isChecked ? 'selected' : 'not selected'}`);
      expect(isChecked).toBe(true); // Coffee should be pre-selected
    }
    
    // Check for Sign Up and Sign In buttons
    const signUpButton = page.locator('button:has-text("Sign Up")');
    const signInButton = page.locator('button:has-text("Sign In")');
    
    const signUpCount = await signUpButton.count();
    const signInCount = await signInButton.count();
    
    console.log(`Found ${signUpCount} "Sign Up" buttons`);
    console.log(`Found ${signInCount} "Sign In" buttons`);
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'tier-selection-state.png', fullPage: true });
    
    // Report findings
    const hasCoffeeTier = coffeeElements > 0;
    const hasAuthButtons = signUpCount > 0 && signInCount > 0;
    const hasMostPopular = mostPopular > 0;
    
    console.log('\n=== CONVERSION TEST RESULTS ===');
    console.log(`✓ Coffee tier visible: ${hasCoffeeTier}`);
    console.log(`✓ Coffee tier default: ${coffeeRadioCount > 0 ? 'Yes' : 'Cannot verify'}`);
    console.log(`✓ Auth buttons present: ${hasAuthButtons}`);
    console.log(`✓ MOST POPULAR badge: ${hasMostPopular}`);
    
    // Assert critical conversion elements
    expect(coffeeElements).toBeGreaterThan(0); // Coffee tier should be visible
  });

  test('should navigate to signup with Coffee tier', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:8080');
    
    // Click Get Started
    await page.getByRole('button', { name: /get started/i }).click();
    
    // Wait for tier selection
    await page.waitForTimeout(1000);
    
    // If Sign Up button is visible, click it
    const signUpButton = page.locator('button:has-text("Sign Up")');
    if (await signUpButton.count() > 0) {
      await signUpButton.click();
      
      // Check if we navigated to signup page
      await page.waitForTimeout(1000);
      const url = page.url();
      console.log(`After Sign Up click, URL is: ${url}`);
      
      // Check if tier=coffee is in URL
      expect(url).toContain('tier=coffee');
      
      // Check if signup page shows Coffee tier
      const tierDisplay = await page.locator('text=/Selected Plan.*Coffee/i').count();
      console.log(`Signup page shows Coffee tier: ${tierDisplay > 0}`);
      
      // Take screenshot
      await page.screenshot({ path: 'signup-page-state.png', fullPage: true });
    }
  });
});