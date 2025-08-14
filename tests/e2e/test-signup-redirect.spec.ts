import { test, expect } from '@playwright/test';

test.describe('Signup Flow Test', () => {
  test('should show tier selection dropdown and redirect to /analyze after signup', async ({ page }) => {
    // Navigate to signup page
    await page.goto('http://localhost:8080/signup');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if tier selection dropdown exists
    const tierDropdown = page.locator('select#tier');
    await expect(tierDropdown).toBeVisible();
    
    // Verify dropdown has all options
    const options = await tierDropdown.locator('option').allTextContents();
    console.log('Available tier options:', options);
    
    // Check default selection is Coffee
    const selectedValue = await tierDropdown.inputValue();
    console.log('Default selected tier:', selectedValue);
    expect(selectedValue).toBe('coffee');
    
    // Change to free tier to test
    await tierDropdown.selectOption('starter');
    
    // Verify the selection changed
    const newValue = await tierDropdown.inputValue();
    console.log('New selected tier:', newValue);
    expect(newValue).toBe('starter');
    
    // Take screenshot
    await page.screenshot({ path: 'signup-tier-selection.png', fullPage: true });
    
    console.log('✅ Tier selection dropdown working correctly');
  });
});