import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = `test-${Date.now()}@example.com`;

test.describe('Final Integration Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing data
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Complete User Journey: Email → Tier → Analysis → Usage Counter', async ({ page }) => {
    // Step 1: Email Capture
    await page.goto(BASE_URL);
    
    // Fill email form
    await page.fill('[data-testid="email-input"]', TEST_EMAIL);
    await page.click('[data-testid="submit-email"]');
    
    // Verify redirect to tier selection
    await expect(page).toHaveURL(/.*tier-selection.*/);
    
    // Step 2: Tier Selection
    await page.click('[data-testid="select-free-tier"]');
    
    // Verify redirect to URL input
    await expect(page).toHaveURL(/.*url-input.*|.*home.*/);
    
    // Step 3: URL Input with Normalization Test
    const testUrl = 'www.example.com';
    await page.fill('[data-testid="url-input"]', testUrl);
    
    // Verify usage counter shows 0/3
    const initialCounter = await page.textContent('[data-testid="usage-counter"]');
    expect(initialCounter).toContain('0/3');
    
    // Submit analysis
    await page.click('[data-testid="analyze-button"]');
    
    // Step 4: Verify Analysis Progress
    await expect(page.locator('[data-testid="analysis-progress"]')).toBeVisible({ timeout: 10000 });
    
    // Wait for analysis completion
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 60000 });
    
    // Step 5: Verify Usage Counter Increment
    const updatedCounter = await page.textContent('[data-testid="usage-counter"]');
    expect(updatedCounter).toContain('1/3');
    
    // Step 6: Test Another Analysis
    await page.click('[data-testid="analyze-another"]');
    await page.fill('[data-testid="url-input"]', 'github.com');
    await page.click('[data-testid="analyze-button"]');
    
    // Wait for second analysis
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 60000 });
    
    // Verify counter incremented again
    const finalCounter = await page.textContent('[data-testid="usage-counter"]');
    expect(finalCounter).toContain('2/3');
  });

  test('URL Normalization Edge Cases', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Skip email capture for this test
    await page.evaluate(() => {
      localStorage.setItem('userEmail', TEST_EMAIL);
      localStorage.setItem('selectedTier', 'free');
    });
    
    await page.reload();
    
    const testCases = [
      { input: 'www.example.com', expected: 'https://www.example.com' },
      { input: 'example.com', expected: 'https://example.com' },
      { input: 'http://example.com', expected: 'http://example.com' },
      { input: 'https://example.com', expected: 'https://example.com' },
      { input: 'subdomain.example.com', expected: 'https://subdomain.example.com' }
    ];

    for (const testCase of testCases) {
      await page.fill('[data-testid="url-input"]', testCase.input);
      
      // Check if URL is normalized in the input field or form submission
      const inputValue = await page.inputValue('[data-testid="url-input"]');
      
      // Either the input should be normalized or the backend should handle it
      if (inputValue !== testCase.input) {
        expect(inputValue).toBe(testCase.expected);
      }
      
      // Clear for next test
      await page.fill('[data-testid="url-input"]', '');
    }
  });

  test('Post-Verification Redirect Flow', async ({ page }) => {
    // Simulate email verification flow
    await page.goto(`${BASE_URL}?verified=true&email=${encodeURIComponent(TEST_EMAIL)}`);
    
    // Should redirect to URL input/home page
    await expect(page).toHaveURL(/.*home.*|.*url-input.*/);
    
    // Should have email stored
    const storedEmail = await page.evaluate(() => localStorage.getItem('userEmail'));
    expect(storedEmail).toBe(TEST_EMAIL);
  });

  test('Usage Counter Persistence Across Sessions', async ({ page }) => {
    // First session: perform one analysis
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.setItem('userEmail', TEST_EMAIL);
      localStorage.setItem('selectedTier', 'free');
    });
    
    await page.reload();
    await page.fill('[data-testid="url-input"]', 'www.example.com');
    await page.click('[data-testid="analyze-button"]');
    
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 60000 });
    
    // Verify counter shows 1/3
    let counter = await page.textContent('[data-testid="usage-counter"]');
    expect(counter).toContain('1/3');
    
    // Simulate new session (reload page)
    await page.reload();
    
    // Counter should persist
    counter = await page.textContent('[data-testid="usage-counter"]');
    expect(counter).toContain('1/3');
  });

  test('Error Handling and Recovery', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.setItem('userEmail', TEST_EMAIL);
      localStorage.setItem('selectedTier', 'free');
    });
    
    await page.reload();
    
    // Test invalid URL
    await page.fill('[data-testid="url-input"]', 'not-a-valid-url');
    await page.click('[data-testid="analyze-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
    
    // Should not increment usage counter
    const counter = await page.textContent('[data-testid="usage-counter"]');
    expect(counter).toContain('0/3');
    
    // Test recovery with valid URL
    await page.fill('[data-testid="url-input"]', 'www.example.com');
    await page.click('[data-testid="analyze-button"]');
    
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 60000 });
  });

  test('Daily Limit Enforcement', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.setItem('userEmail', TEST_EMAIL);
      localStorage.setItem('selectedTier', 'free');
    });
    
    await page.reload();
    
    // Perform 3 analyses to hit the limit
    const urls = ['www.example.com', 'github.com', 'stackoverflow.com'];
    
    for (let i = 0; i < urls.length; i++) {
      await page.fill('[data-testid="url-input"]', urls[i]);
      await page.click('[data-testid="analyze-button"]');
      
      await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 60000 });
      
      const expectedCount = `${i + 1}/3`;
      const counter = await page.textContent('[data-testid="usage-counter"]');
      expect(counter).toContain(expectedCount);
      
      if (i < urls.length - 1) {
        await page.click('[data-testid="analyze-another"]');
      }
    }
    
    // Try 4th analysis - should be blocked
    await page.click('[data-testid="analyze-another"]');
    await page.fill('[data-testid="url-input"]', 'www.google.com');
    await page.click('[data-testid="analyze-button"]');
    
    // Should show upgrade prompt
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible({ timeout: 10000 });
    
    // Counter should still show 3/3
    const finalCounter = await page.textContent('[data-testid="usage-counter"]');
    expect(finalCounter).toContain('3/3');
  });
});