import { test, expect } from '@playwright/test';

/**
 * DIAGNOSTIC CONVERSION TEST
 * 
 * Simple test to diagnose the Coffee tier default selection and button visibility.
 * This test will help identify the current state of the conversion optimizations.
 */

test.describe('Diagnostic Conversion Test', () => {
  test('should diagnose Coffee tier selection and auth buttons', async ({ page }) => {
    console.log('🔍 Starting diagnostic conversion test...');
    
    await test.step('Navigate to homepage', async () => {
      console.log('📍 Navigating to homepage...');
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      console.log('✅ Page loaded successfully');
    });

    await test.step('Take full page screenshot', async () => {
      await page.screenshot({ 
        path: 'test-results/diagnostic-conversion-homepage.png',
        fullPage: true 
      });
      console.log('📸 Screenshot saved: diagnostic-conversion-homepage.png');
    });

    await test.step('Check for tier selection elements', async () => {
      console.log('🔍 Looking for tier selection elements...');
      
      // Check if any tier radios are visible
      const tierRadios = await page.locator('input[type="radio"]').all();
      console.log(`Found ${tierRadios.length} radio buttons`);
      
      // Check specifically for coffee tier
      const coffeeRadio = page.locator('input[value="coffee"]');
      const coffeeExists = await coffeeRadio.count();
      console.log(`Coffee radio elements found: ${coffeeExists}`);
      
      if (coffeeExists > 0) {
        const isChecked = await coffeeRadio.isChecked();
        console.log(`Coffee radio is checked: ${isChecked}`);
      }
      
      // Check for tier containers
      const tierContainers = await page.locator('[class*="grid"], [class*="tier"]').all();
      console.log(`Found ${tierContainers.length} potential tier containers`);
    });

    await test.step('Check for auth buttons', async () => {
      console.log('🔍 Looking for authentication buttons...');
      
      // Look for Sign Up button
      const signUpButtons = await page.getByText('Sign Up').all();
      console.log(`Sign Up buttons found: ${signUpButtons.length}`);
      
      // Look for Sign In button
      const signInButtons = await page.getByText('Sign In').all();
      console.log(`Sign In buttons found: ${signInButtons.length}`);
      
      // Check for any buttons
      const allButtons = await page.locator('button').all();
      console.log(`Total buttons found: ${allButtons.length}`);
      
      // Log button texts for debugging
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const buttonText = await allButtons[i].textContent();
        console.log(`Button ${i + 1}: "${buttonText}"`);
      }
    });

    await test.step('Check page content and structure', async () => {
      console.log('🔍 Analyzing page content...');
      
      // Check for main content areas
      const title = await page.title();
      console.log(`Page title: "${title}"`);
      
      // Check for main headings
      const headings = await page.locator('h1, h2, h3').all();
      console.log(`Found ${headings.length} headings`);
      
      for (let i = 0; i < Math.min(headings.length, 5); i++) {
        const headingText = await headings[i].textContent();
        console.log(`Heading ${i + 1}: "${headingText}"`);
      }
      
      // Check for form elements
      const inputs = await page.locator('input').all();
      console.log(`Found ${inputs.length} input elements`);
      
      // Check for "Coffee" text anywhere on page
      const coffeeText = await page.getByText('Coffee').all();
      console.log(`"Coffee" text found ${coffeeText.length} times`);
      
      // Check for "MOST POPULAR" text
      const popularText = await page.getByText('MOST POPULAR').all();
      console.log(`"MOST POPULAR" text found ${popularText.length} times`);
    });

    await test.step('Check URL and routing', async () => {
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);
      
      // Verify we're on the expected page
      expect(currentUrl).toContain('localhost:3001');
      expect(currentUrl.endsWith('/')).toBe(true);
    });

    console.log('✅ Diagnostic test completed');
  });

  test('should check for tier selection grid layout', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for grid layout patterns commonly used for tier selection
    const gridSelectors = [
      '.grid',
      '[class*="grid-cols"]',
      '[class*="md:grid-cols-2"]',
      '.tier-selection',
      '.radio-group',
      '[role="radiogroup"]'
    ];
    
    for (const selector of gridSelectors) {
      const elements = await page.locator(selector).all();
      console.log(`Selector "${selector}": found ${elements.length} elements`);
    }
    
    // Check for specific tier names
    const tierNames = ['Starter', 'Coffee', 'Growth', 'Scale'];
    for (const tier of tierNames) {
      const elements = await page.getByText(tier, { exact: false }).all();
      console.log(`Tier "${tier}": found ${elements.length} mentions`);
    }
  });

  test('should analyze email capture component', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for email capture related elements
    const emailSelectors = [
      'input[type="email"]',
      'input[placeholder*="email"]',
      '.email-capture',
      '[class*="email"]',
      'form'
    ];
    
    for (const selector of emailSelectors) {
      const elements = await page.locator(selector).all();
      console.log(`Email selector "${selector}": found ${elements.length} elements`);
    }
    
    // Check for key phrases
    const phrases = [
      'Choose Your Analysis Type',
      'analysis type',
      'tier',
      'Sign Up',
      'Sign In',
      'Get Started'
    ];
    
    for (const phrase of phrases) {
      const elements = await page.getByText(phrase, { exact: false }).all();
      console.log(`Phrase "${phrase}": found ${elements.length} occurrences`);
    }
  });
});