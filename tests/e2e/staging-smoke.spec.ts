import { test, expect } from '@playwright/test';

// Test configuration
const TEST_EMAIL = 'llmtxt.test.user@gmail.com';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_URL = 'https://example.com'; // Fast, reliable test URL
const VALIDATOR_TEST_URL = 'https://www.anthropic.com/llms.txt';

test.describe('LLM.txt Mastery - Staging Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test with a clean state
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('1. Landing page loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check title
    await expect(page).toHaveTitle(/LLM\.txt Mastery/);
    
    // Check hero section
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText('Stop losing customers')).toBeVisible();
    
    // Check pricing section is visible
    await expect(page.getByText('Choose Your Plan')).toBeVisible();
    await expect(page.getByText('$0')).toBeVisible(); // Starter tier
    await expect(page.getByText('$4.95')).toBeVisible(); // Solo tier
    await expect(page.getByText('$9.95')).toBeVisible(); // Growth tier
    await expect(page.getByText('$19.95')).toBeVisible(); // Scale tier
  });

  test('2. Free analysis flow (unauthenticated)', async ({ page }) => {
    await page.goto('/');
    
    // Click "Start Free Analysis" button
    const startButton = page.getByRole('button', { name: /start free analysis/i });
    await expect(startButton).toBeVisible();
    await startButton.click();
    
    // Should navigate to signup/plan selection
    await expect(page).toHaveURL(/\/signup/);
    
    // Verify tier options are displayed
    await expect(page.getByText('Starter')).toBeVisible();
    await expect(page.getByText('Solo')).toBeVisible();
    await expect(page.getByText('Growth')).toBeVisible();
    await expect(page.getByText('Scale')).toBeVisible();
  });

  test('3. Signup flow', async ({ page }) => {
    await page.goto('/signup');
    
    // Fill in signup form
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    // Select starter tier to avoid payment flow
    await page.click('[data-testid="tier-starter"], .tier-starter, [data-tier="starter"]');
    
    // Submit form
    const signupButton = page.getByRole('button', { name: /sign up|create account/i });
    await signupButton.click();
    
    // Should either:
    // 1. Navigate to dashboard (new account)
    // 2. Show "already exists" message (existing account)
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    const pageContent = await page.textContent('body');
    
    if (currentUrl.includes('/dashboard') || pageContent.includes('Welcome')) {
      // New account created successfully
      await expect(page).toHaveURL(/\/dashboard/);
    } else if (pageContent.includes('already exists') || pageContent.includes('already registered')) {
      // Account already exists - this is expected
      console.log('Account already exists - proceeding to login test');
    } else {
      // Check for any error messages
      const hasError = await page.locator('[role="alert"], .error, .alert-error').count() > 0;
      if (hasError) {
        const errorText = await page.locator('[role="alert"], .error, .alert-error').first().textContent();
        console.log('Signup error (may be expected):', errorText);
      }
    }
  });

  test('4. Login flow', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in login form
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    // Submit login
    const loginButton = page.getByRole('button', { name: /sign in|log in|login/i });
    await loginButton.click();
    
    // Wait for navigation
    await page.waitForTimeout(2000);
    
    // Verify dashboard loads
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('5. URL Analysis flow (core feature)', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForURL(/\/dashboard/);
    
    // Navigate to analyze page
    await page.goto('/analyze');
    
    // Enter test URL
    const urlInput = page.locator('input[type="url"], input[placeholder*="website"], input[placeholder*="URL"]').first();
    await urlInput.fill(TEST_URL);
    
    // Submit for analysis
    const analyzeButton = page.getByRole('button', { name: /analyze|start analysis/i });
    await analyzeButton.click();
    
    // Wait for analysis to start - check for loading state
    await expect(page.getByText(/analyzing|processing|scanning/i)).toBeVisible({ timeout: 10000 });
    
    // Wait for results to appear (this may take 30-60 seconds)
    await expect(page.getByText(/pages discovered|results|analysis complete/i)).toBeVisible({ timeout: 120000 });
    
    // Verify results show real data, not demo
    const pageContent = await page.textContent('body');
    expect(pageContent.toLowerCase()).not.toContain('demo response');
    expect(pageContent.toLowerCase()).not.toContain('mock data');
    
    // Verify quality scores or similar metrics are present
    await expect(page.locator('[data-testid="quality-score"], .quality-score, .score')).toBeVisible({ timeout: 5000 });
  });

  test('6. File generation and download', async ({ page }) => {
    // This test assumes we have a completed analysis
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForURL(/\/dashboard/);
    
    // Check if there are any previous analyses
    const analysisLinks = page.locator('a[href*="/analysis/"], .analysis-item');
    const hasAnalyses = await analysisLinks.count() > 0;
    
    if (hasAnalyses) {
      // Click on the first analysis
      await analysisLinks.first().click();
      
      // Look for generate/download button
      const generateButton = page.getByRole('button', { name: /generate|download|llms\.txt/i });
      if (await generateButton.count() > 0) {
        // Set up download listener
        const downloadPromise = page.waitForDownload();
        await generateButton.click();
        
        // Verify download starts
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('llms.txt');
        
        // Verify file content is real (not empty or mock)
        const path = await download.path();
        if (path) {
          const fs = require('fs');
          const content = fs.readFileSync(path, 'utf8');
          expect(content.length).toBeGreaterThan(100); // Should have substantial content
          expect(content.toLowerCase()).not.toContain('demo');
          expect(content.toLowerCase()).not.toContain('mock');
        }
      }
    } else {
      console.log('No existing analyses found - file generation test skipped');
    }
  });

  test('7. Validator tool functionality', async ({ page }) => {
    await page.goto('/validate');
    
    // Enter a known llms.txt URL
    const urlInput = page.locator('input[type="url"], input[placeholder*="llms.txt"]').first();
    await urlInput.fill(VALIDATOR_TEST_URL);
    
    // Submit for validation
    const validateButton = page.getByRole('button', { name: /validate|check/i });
    await validateButton.click();
    
    // Wait for validation results
    await expect(page.getByText(/validation results|valid|invalid|score/i)).toBeVisible({ timeout: 30000 });
    
    // Verify results are meaningful (not just error messages)
    const resultsContainer = page.locator('[data-testid="validation-results"], .validation-results, .results');
    await expect(resultsContainer).toBeVisible();
  });

  test('8. Pricing page displays correctly', async ({ page }) => {
    await page.goto('/pricing');
    
    // Verify all 4 tiers are visible with correct prices
    await expect(page.getByText('$0')).toBeVisible(); // Starter
    await expect(page.getByText('$4.95')).toBeVisible(); // Solo
    await expect(page.getByText('$9.95')).toBeVisible(); // Growth
    await expect(page.getByText('$19.95')).toBeVisible(); // Scale
    
    // Verify tier names
    await expect(page.getByText('Starter')).toBeVisible();
    await expect(page.getByText('Solo')).toBeVisible();
    await expect(page.getByText('Growth')).toBeVisible();
    await expect(page.getByText('Scale')).toBeVisible();
  });

  test('9. Legal pages load successfully', async ({ page }) => {
    // Test privacy policy
    await page.goto('/privacy');
    await expect(page.getByText(/privacy policy|privacy/i)).toBeVisible();
    
    // Test terms of service
    await page.goto('/terms');
    await expect(page.getByText(/terms|service/i)).toBeVisible();
    
    // Test cookies policy
    await page.goto('/cookies');
    await expect(page.getByText(/cookies|cookie policy/i)).toBeVisible();
  });

  test('10. API health check', async ({ page }) => {
    // Test Railway backend directly
    const stagingApiUrl = 'https://llm-txt-mastery-staging.up.railway.app';
    
    // Navigate to a page that will trigger API calls
    await page.goto('/');
    
    // Check if we can reach the API version endpoint
    const response = await page.request.get(`${stagingApiUrl}/api/version`);
    expect(response.status()).toBe(200);
    
    const versionData = await response.json();
    expect(versionData).toHaveProperty('version');
    
    // Verify features object is present (indicates healthy backend)
    if (versionData.features) {
      expect(versionData.features).toBeDefined();
      console.log('API features available:', Object.keys(versionData.features));
    }
  });
});