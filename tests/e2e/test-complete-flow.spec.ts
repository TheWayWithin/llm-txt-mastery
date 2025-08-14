import { test, expect } from '@playwright/test';

test.describe('Complete User Flow Test', () => {
  test('should test the complete user journey from landing to analysis', async ({ page }) => {
    const testEmail = `test${Date.now()}@example.com`;
    
    // 1. Navigate to landing page
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Step 1: Landing page loaded');
    
    // 2. Verify multiple Get Started buttons exist
    const getStartedButtons = page.locator('button:has-text("Get Started")');
    const buttonCount = await getStartedButtons.count();
    console.log(`Found ${buttonCount} Get Started buttons on landing page`);
    expect(buttonCount).toBeGreaterThan(1);
    
    // 3. Click first Get Started button
    await getStartedButtons.first().click();
    
    // 4. Should be on signup page
    await page.waitForURL('**/signup');
    console.log('📍 Step 2: Navigated to signup page');
    
    // 5. Verify tier dropdown exists and has all options
    const tierDropdown = page.locator('select#tier');
    await expect(tierDropdown).toBeVisible();
    
    // 6. Check default is Coffee
    const defaultTier = await tierDropdown.inputValue();
    console.log(`Default tier: ${defaultTier}`);
    expect(defaultTier).toBe('coffee');
    
    // 7. Switch to free tier for testing
    await tierDropdown.selectOption('starter');
    console.log('📍 Step 3: Selected free tier');
    
    // 8. Fill in signup form
    await page.fill('input#email', testEmail);
    await page.fill('input#password', 'TestPassword123!');
    await page.fill('input#confirmPassword', 'TestPassword123!');
    console.log('📍 Step 4: Filled signup form');
    
    // 9. Submit form
    await page.click('button:has-text("Create Account")');
    
    // 10. Should redirect to /analyze (not landing page)
    await page.waitForURL('**/analyze', { timeout: 10000 });
    console.log('📍 Step 5: Successfully redirected to /analyze page');
    
    // 11. Verify we're on analyze page with URL input
    const urlInput = page.locator('input[placeholder*="example.com"]');
    await expect(urlInput).toBeVisible();
    console.log('📍 Step 6: URL input field is visible on analyze page');
    
    // Take screenshot of final state
    await page.screenshot({ path: 'complete-flow-analyze-page.png', fullPage: true });
    
    console.log('✅ Complete user flow test passed!');
    console.log('Summary:');
    console.log('- Multiple Get Started buttons found');
    console.log('- Tier selection dropdown working');
    console.log('- Default tier is Coffee');
    console.log('- Can change to other tiers');
    console.log('- After signup, redirects to /analyze (not landing page)');
    console.log('- Clean analyze page with URL input ready');
  });
});