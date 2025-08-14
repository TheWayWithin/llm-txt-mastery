import { test, expect } from '@playwright/test';

/**
 * BASIC FUNCTIONALITY TEST
 * Simple tests to verify the application is working and identify issues
 */

test.describe('Basic Application Tests', () => {
  test('should load the homepage successfully', async ({ page }) => {
    console.log('🏠 Testing homepage load...');
    
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check for basic page elements
    const title = await page.title();
    console.log(`📄 Page title: "${title}"`);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'homepage-basic.png', fullPage: true });
    
    // Check if we can find any content
    const body = await page.locator('body').textContent();
    const hasContent = body && body.length > 100;
    console.log(`📝 Page has content: ${hasContent}`);
    
    if (hasContent) {
      console.log(`📊 Content length: ${body?.length} characters`);
    }
    
    // Look for common elements
    const hasLogo = await page.locator('img[alt*="LLM"], img[alt*="logo"]').isVisible();
    console.log(`🎨 Logo visible: ${hasLogo}`);
    
    const hasHeading = await page.locator('h1, h2').first().isVisible();
    console.log(`📃 Main heading visible: ${hasHeading}`);
    
    // Basic success criteria
    expect(title).toBeTruthy();
    expect(hasContent).toBeTruthy();
    
    console.log('✅ Homepage loads successfully');
  });

  test('should be able to navigate to different pages', async ({ page }) => {
    console.log('🧭 Testing navigation...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test navigation to signup
    try {
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');
      
      const signupContent = await page.textContent('body');
      const hasSignupContent = signupContent?.includes('Create') || signupContent?.includes('Sign');
      console.log(`📝 Signup page accessible: ${hasSignupContent}`);
      
      await page.screenshot({ path: 'signup-page.png' });
    } catch (error) {
      console.log(`⚠️ Signup page error: ${error}`);
    }
    
    // Test navigation to login
    try {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      const loginContent = await page.textContent('body');
      const hasLoginContent = loginContent?.includes('Sign') || loginContent?.includes('Login');
      console.log(`🔑 Login page accessible: ${hasLoginContent}`);
      
      await page.screenshot({ path: 'login-page.png' });
    } catch (error) {
      console.log(`⚠️ Login page error: ${error}`);
    }
    
    console.log('✅ Navigation test complete');
  });

  test('should identify tier selection elements', async ({ page }) => {
    console.log('🎯 Looking for tier selection elements...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for various possible tier selection indicators
    const possibleSelectors = [
      'text=Coffee',
      'text=Starter', 
      'text=Growth',
      'text=Scale',
      'text=Choose Your Analysis Type',
      'text=Solopreneur Special',
      'text=MOST POPULAR',
      'input[type="radio"]',
      '[data-tier]',
      '.tier-',
      'text=Sign Up',
      'text=Sign In'
    ];
    
    const results: Record<string, boolean> = {};
    
    for (const selector of possibleSelectors) {
      try {
        const isVisible = await page.locator(selector).isVisible();
        results[selector] = isVisible;
        console.log(`${isVisible ? '✅' : '❌'} "${selector}": ${isVisible}`);
      } catch (error) {
        results[selector] = false;
        console.log(`❌ "${selector}": Error - ${error}`);
      }
    }
    
    // Count successful findings
    const foundElements = Object.values(results).filter(Boolean).length;
    console.log(`📊 Found ${foundElements}/${possibleSelectors.length} elements`);
    
    // Take screenshot for manual inspection
    await page.screenshot({ path: 'tier-selection-inspection.png', fullPage: true });
    
    console.log('✅ Tier selection inspection complete');
  });
});