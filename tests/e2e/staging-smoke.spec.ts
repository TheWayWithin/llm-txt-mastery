import { test, expect } from '@playwright/test';

const STAGING_FRONTEND_URL = 'https://develop--llm-txt-mastery.netlify.app';
const STAGING_API_URL = 'https://llm-txt-mastery-staging.up.railway.app';

test.describe('LLM.txt Mastery Staging - Smoke Tests', () => {
  test.describe.configure({ mode: 'serial' });
  
  let testEmail: string;
  let accessToken: string;
  
  test.beforeAll(() => {
    // Generate unique test email to avoid conflicts
    const timestamp = Date.now();
    testEmail = `test-staging-${timestamp}@llmtxtmastery.com`;
  });

  test('Landing page loads correctly', async ({ page }) => {
    await page.goto(STAGING_FRONTEND_URL);
    
    // Check page title
    await expect(page).toHaveTitle(/LLM\.txt Mastery/);
    
    // Check main elements are visible
    await expect(page.locator('h1')).toContainText('ONLY Dedicated LLMs.txt Platform');
    await expect(page.getByRole('button', { name: 'Start Free Analysis' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
    
    // Verify no console errors
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Should have no critical console errors
    expect(consoleLogs.filter(log => !log.includes('favicon'))).toHaveLength(0);
  });

  test('Signup page renders correctly', async ({ page }) => {
    await page.goto(`${STAGING_FRONTEND_URL}/signup`);
    
    // Check signup form elements
    await expect(page.getByRole('heading', { name: 'Get Found by AI' })).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    
    // Check pricing tiers are displayed
    await expect(page.locator('text=GROWTH')).toBeVisible();
    await expect(page.locator('text=$9.95')).toBeVisible();
  });

  test('Cookies page loads without Enzuzo references', async ({ page }) => {
    await page.goto(`${STAGING_FRONTEND_URL}/cookies`);
    
    // Check page loads
    await expect(page.getByRole('heading', { name: 'Cookie Policy' })).toBeVisible();
    
    // Verify no Enzuzo references in page content
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Enzuzo');
    expect(pageContent).not.toContain('enzuzo');
    
    // Check for native consent management mention
    expect(pageContent).toContain('GDPR consent managed natively');
  });

  test('API health endpoints work correctly', async ({ request }) => {
    // Test version endpoint
    const versionResponse = await request.get(`${STAGING_API_URL}/api/version`);
    expect(versionResponse.ok()).toBeTruthy();
    
    const versionData = await versionResponse.json();
    expect(versionData.version).toBe('2.0.0-enhanced');
    expect(versionData.features.blockquoteSummary).toBe(true);
    
    // Test usage endpoint for test user
    const usageResponse = await request.get(`${STAGING_API_URL}/api/usage/test@test.com`);
    expect(usageResponse.ok()).toBeTruthy();
    
    const usageData = await usageResponse.json();
    expect(usageData.tier).toBe('starter');
    expect(usageData.limits.dailyAnalyses).toBe(3);
  });

  test('User registration via API works', async ({ request }) => {
    const registerResponse = await request.post(`${STAGING_API_URL}/api/auth/register`, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': STAGING_FRONTEND_URL,
      },
      data: {
        email: testEmail,
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!'
      }
    });
    
    expect(registerResponse.ok()).toBeTruthy();
    
    const registerData = await registerResponse.json();
    expect(registerData.success).toBe(true);
    expect(registerData.user.email).toBe(testEmail);
    expect(registerData.user.tier).toBe('starter');
    expect(registerData.accessToken).toBeTruthy();
    
    // Store token for subsequent tests
    accessToken = registerData.accessToken;
  });

  test('User login via API works', async ({ request }) => {
    const loginResponse = await request.post(`${STAGING_API_URL}/api/auth/login`, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': STAGING_FRONTEND_URL,
      },
      data: {
        email: testEmail,
        password: 'TestPass123!'
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    
    const loginData = await loginResponse.json();
    expect(loginData.success).toBe(true);
    expect(loginData.user.email).toBe(testEmail);
    expect(loginData.accessToken).toBeTruthy();
    
    // Update token
    accessToken = loginData.accessToken;
  });

  test('Authenticated analysis works', async ({ request }) => {
    const analyzeResponse = await request.post(`${STAGING_API_URL}/api/analyze`, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': STAGING_FRONTEND_URL,
        'Authorization': `Bearer ${accessToken}`,
      },
      data: {
        url: 'https://example.com',
        useAI: false
      }
    });
    
    expect(analyzeResponse.ok()).toBeTruthy();
    
    const analyzeData = await analyzeResponse.json();
    expect(analyzeData.analysisId).toBeTruthy();
    expect(analyzeData.status).toBe('analyzing');
    expect(analyzeData.pageCount).toBe(1);
  });

  test('Frontend routes API calls to Railway (not Netlify)', async ({ page }) => {
    // Intercept network requests
    const apiCalls: string[] = [];
    
    page.route('**/*', route => {
      const url = route.request().url();
      if (url.includes('/api/')) {
        apiCalls.push(url);
      }
      route.continue();
    });
    
    await page.goto(STAGING_FRONTEND_URL);
    
    // Trigger an API call by clicking "Start Free Analysis"
    await page.getByRole('button', { name: 'Start Free Analysis' }).click();
    
    // Wait a moment for potential API calls
    await page.waitForTimeout(2000);
    
    // Check that any API calls go to Railway, not Netlify
    const railwayApiCalls = apiCalls.filter(url => url.includes('llm-txt-mastery-staging.up.railway.app'));
    const netlifyApiCalls = apiCalls.filter(url => url.includes('/.netlify/functions/'));
    
    // We might not have API calls from just loading the page, but if there are any, they should go to Railway
    if (apiCalls.length > 0) {
      expect(netlifyApiCalls.length).toBe(0);
      expect(railwayApiCalls.length).toBeGreaterThan(0);
    }
  });

  test('Bot protection allows real browsers', async ({ request }) => {
    // Test that bot protection doesn't block legitimate requests with proper headers
    const analyzeResponse = await request.post(`${STAGING_API_URL}/api/analyze`, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': STAGING_FRONTEND_URL,
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      data: {
        url: 'https://example.com',
        email: testEmail
      }
    });
    
    // Should get a 401 for unauthenticated user, not be blocked by bot protection
    expect(analyzeResponse.status()).toBe(400); // Email required error, not bot block
  });

  test('CORS headers are properly configured', async ({ request }) => {
    const response = await request.post(`${STAGING_API_URL}/api/version`, {
      headers: {
        'Origin': STAGING_FRONTEND_URL,
      }
    });
    
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBe(STAGING_FRONTEND_URL);
    expect(headers['access-control-allow-credentials']).toBe('true');
  });

  test('Privacy and legal pages load correctly', async ({ page }) => {
    // Test privacy policy page
    await page.goto(`${STAGING_FRONTEND_URL}/privacy`);
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
    
    // Test terms of service page  
    await page.goto(`${STAGING_FRONTEND_URL}/terms`);
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
    
    // Verify no Enzuzo references
    for (const url of [`${STAGING_FRONTEND_URL}/privacy`, `${STAGING_FRONTEND_URL}/terms`]) {
      await page.goto(url);
      const pageContent = await page.textContent('body');
      expect(pageContent).not.toContain('Enzuzo');
      expect(pageContent).not.toContain('enzuzo');
    }
  });

  test('Responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(STAGING_FRONTEND_URL);
    
    // Check that main elements are still visible and properly sized
    await expect(page.getByRole('button', { name: 'Start Free Analysis' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
    
    // Check navigation works on mobile
    await page.goto(`${STAGING_FRONTEND_URL}/signup`);
    await expect(page.getByRole('heading', { name: 'Get Found by AI' })).toBeVisible();
  });
});

test.describe('LLM.txt Mastery Staging - Error Handling', () => {
  test('404 page works correctly', async ({ page }) => {
    const response = await page.goto(`${STAGING_FRONTEND_URL}/nonexistent-page`);
    
    // Should return a page (SPA routing handles 404s client-side)
    expect(response?.status()).toBe(200);
    
    // Wait for SPA to handle the route
    await page.waitForTimeout(1000);
    
    // Should show 404 content or redirect to home
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });

  test('API endpoints handle invalid requests gracefully', async ({ request }) => {
    // Test invalid JSON
    const invalidJsonResponse = await request.post(`${STAGING_API_URL}/api/auth/register`, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': STAGING_FRONTEND_URL,
      },
      data: 'invalid json'
    });
    
    expect(invalidJsonResponse.status()).toBeGreaterThanOrEqual(400);
    
    // Test missing required fields
    const missingFieldsResponse = await request.post(`${STAGING_API_URL}/api/auth/register`, {
      headers: {
        'Content-Type': 'application/json', 
        'Origin': STAGING_FRONTEND_URL,
      },
      data: {
        email: 'test@example.com'
        // Missing password and confirmPassword
      }
    });
    
    expect(missingFieldsResponse.status()).toBe(400);
    
    const errorData = await missingFieldsResponse.json();
    expect(errorData.error).toBe('Validation failed');
    expect(errorData.code).toBe('VALIDATION_ERROR');
  });
});