const { test, expect } = require('@playwright/test');

test.describe('Demo Mode Banner', () => {
  test('should show demo banner for demo user login', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5000');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Open auth modal
    await page.getByRole('button', { name: /sign in/i }).click();

    // Login with demo credentials
    await page.fill('[type="email"]', 'demo@llmtxtmastery.com');
    await page.fill('[type="password"]', 'DemoAccess2025!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for login to complete
    await page.waitForLoadState('networkidle');

    // Check if demo banner is visible
    await expect(page.getByText('Demo Mode - Exploring with sample data')).toBeVisible();
    await expect(page.getByText("Changes won't be saved")).toBeVisible();
    await expect(page.getByRole('button', { name: /login with real account/i })).toBeVisible();

    console.log('✅ Demo banner is visible for demo user');

    // Test dismiss functionality
    await page.getByRole('button', { name: /dismiss demo banner/i }).click();
    await expect(page.getByText('Demo Mode - Exploring with sample data')).not.toBeVisible();

    console.log('✅ Demo banner dismissal works');
  });

  test('should not show demo banner for regular user', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5000');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that demo banner is not visible for non-demo users
    await expect(page.getByText('Demo Mode - Exploring with sample data')).not.toBeVisible();

    console.log('✅ Demo banner is not visible for non-demo users');
  });
});

console.log('Demo Banner Test Script Created');
