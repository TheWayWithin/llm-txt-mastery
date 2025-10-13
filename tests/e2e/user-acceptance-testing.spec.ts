import { test, expect, Page } from '@playwright/test';
import { createTestUsers, TestUser } from './utils/test-user-factory';
import { UATHelpers } from './utils/uat-helpers';
import { generateTempEmail } from './utils/temp-email-service';
import { TEST_WEBSITES, UAT_CONFIG } from './utils/uat-test-data';

// Test suite configuration
const BASE_URL = process.env.TEST_URL || 'https://www.llmtxtmastery.com';
const IS_PRODUCTION = BASE_URL.includes('llmtxtmastery.com');

// Bug tracking for UAT reporting
const bugs: Array<{
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  description: string;
  steps: string[];
  expected: string;
  actual: string;
  timestamp: string;
  screenshot?: string;
}> = [];

// Test metrics tracking
const metrics = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  startTime: Date.now(),
  endTime: 0,
  performanceIssues: [],
  securityIssues: [],
};

test.describe('LLM.txt Mastery - User Acceptance Testing', () => {
  let helpers: UATHelpers;
  let testUsers: {
    free: TestUser;
    coffee: TestUser;
    growth: TestUser;
    scale: TestUser;
  };

  test.beforeAll(async () => {
    // Create test users for each tier
    testUsers = await createTestUsers();
    console.log('✅ Test users created for all tiers');
  });

  test.beforeEach(async ({ page }) => {
    helpers = new UATHelpers(page, BASE_URL);
    metrics.totalTests++;
    
    // Clear browser state
    await page.context().clearCookies();
    await page.context().clearPermissions();
    
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === 'passed') {
      metrics.passedTests++;
    } else {
      metrics.failedTests++;
      
      // Capture screenshot on failure
      const screenshot = await page.screenshot({
        path: `tests/screenshots/uat-failure-${Date.now()}.png`,
        fullPage: true,
      });
      
      bugs.push({
        severity: 'HIGH',
        category: 'Test Failure',
        description: testInfo.title,
        steps: [testInfo.title],
        expected: 'Test should pass',
        actual: `Test failed: ${testInfo.error?.message || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        screenshot: screenshot ? `uat-failure-${Date.now()}.png` : undefined,
      });
    }
  });

  // ============================================================================
  // SECTION 1: FREE TIER USER JOURNEY (AUTHENTICATION-FIRST)
  // ============================================================================
  
  test.describe('Free Tier User Journey - Authentication First', () => {
    test('1.1 Complete free tier flow: Landing → Signup → Login → Analysis → Download', async ({ page }) => {
      // Step 1: Navigate to landing page
      await helpers.navigateToHome();
      
      // Step 2: Click CTA to go to signup (all CTAs redirect to signup)
      await helpers.navigateToSignupFromLanding();
      
      // Step 3: Complete signup process with free tier
      const tempEmail = generateTempEmail();
      await helpers.completeSignupFlow({
        email: tempEmail,
        password: 'TestUser123!',
        tier: 'free'
      });
      
      // Step 4: Login after signup
      const loginSuccess = await helpers.login(tempEmail, 'TestUser123!');
      expect(loginSuccess).toBeTruthy();
      
      // Step 5: Navigate to authenticated analysis page
      await helpers.navigateToAuthenticatedAnalysis();
      
      // Step 6: Perform analysis (now authenticated)
      await helpers.performTierSpecificAnalysis('free', TEST_WEBSITES.small.url);
      
      // Step 7: Verify analysis completion and download
      const analysisComplete = await helpers.waitForAnalysis();
      expect(analysisComplete).toBeTruthy();
      
      const downloadSuccess = await helpers.downloadLLMsFile();
      expect(downloadSuccess).toBeTruthy();
      
      // Step 8: Verify free tier limitations (1 per day)
      const limitMessage = await helpers.checkDailyLimit('free');
      expect(limitMessage).toContain('1 analysis per day');
    });

    test('1.2 Free tier upgrade prompts after reaching daily limit', async ({ page }) => {
      // Login as free tier user first
      await helpers.login(testUsers.free.email, testUsers.free.password);
      await helpers.navigateToAuthenticatedAnalysis();
      
      // Simulate hitting daily limit
      await helpers.simulateDailyLimitReached('free');
      
      // Try to perform another analysis
      await helpers.enterWebsiteURL(TEST_WEBSITES.small.url);
      await helpers.clickAnalyzeButton();
      
      // Verify upgrade options are shown
      const upgradeOptions = await page.locator('.upgrade-options, [data-testid="upgrade-options"]');
      await expect(upgradeOptions).toBeVisible();
      
      // Check all tier options are available for upgrade
      await expect(page.locator('text=/Coffee Tier.*\\$4\\.95/i')).toBeVisible();
      await expect(page.locator('text=/Growth Tier.*\\$9\\.95/i')).toBeVisible();
      await expect(page.locator('text=/Scale Tier.*\\$19\\.95/i')).toBeVisible();
    });
  });

  // ============================================================================
  // SECTION 2: COFFEE TIER USER JOURNEY (AUTHENTICATION-FIRST)
  // ============================================================================
  
  test.describe('Coffee Tier User Journey - Authentication First', () => {
    test('2.1 Coffee tier: Signup → Payment → Analysis with credits', async ({ page }) => {
      // Step 1: Navigate to landing page
      await helpers.navigateToHome();
      
      // Step 2: Go to signup via CTA
      await helpers.navigateToSignupFromLanding();
      
      // Step 3: Complete signup with Coffee tier selection
      const tempEmail = generateTempEmail();
      await helpers.completeSignupFlow({
        email: tempEmail,
        password: 'CoffeeUser123!',
        tier: 'coffee'
      });
      
      // Step 4: Handle Stripe checkout during signup
      const checkoutSuccess = await helpers.handleStripeCheckout({
        tier: 'coffee',
        testCard: UAT_CONFIG.stripe.testCards.success,
      });
      expect(checkoutSuccess).toBeTruthy();
      
      // Step 5: Login after successful payment
      const loginSuccess = await helpers.login(tempEmail, 'CoffeeUser123!');
      expect(loginSuccess).toBeTruthy();
      
      // Step 6: Navigate to authenticated dashboard
      await helpers.navigateToDashboard();
      
      // Step 7: Verify credits are available
      const credits = await helpers.getCoffeeCredits();
      expect(credits).toBe(5);
      
      // Step 8: Navigate to analysis and use a credit
      await helpers.navigateToAuthenticatedAnalysis();
      await helpers.performTierSpecificAnalysis('coffee', TEST_WEBSITES.medium.url);
      
      // Step 9: Verify credit was deducted
      await helpers.navigateToDashboard();
      const remainingCredits = await helpers.getCoffeeCredits();
      expect(remainingCredits).toBe(4);
    });

    test('2.2 Coffee tier refund button (30-day guarantee)', async ({ page }) => {
      // Login as coffee tier user
      await helpers.login(testUsers.coffee.email, testUsers.coffee.password);
      
      // Navigate to dashboard
      await helpers.navigateToDashboard();
      
      // Check for refund button
      const refundButton = await page.locator('button:has-text("Request Refund")');
      await expect(refundButton).toBeVisible();
      
      // Click refund button
      await refundButton.click();
      
      // Verify refund modal
      const modal = await page.locator('[role="dialog"], .modal, [data-testid="refund-modal"]');
      await expect(modal).toBeVisible();
      await expect(modal.locator('text=/30-day money-back guarantee/i')).toBeVisible();
      
      // Verify refund amount
      await expect(modal.locator('text=/$4.95/i')).toBeVisible();
    });
  });

  // ============================================================================
  // SECTION 3: GROWTH TIER USER JOURNEY (AUTHENTICATION-FIRST)
  // ============================================================================
  
  test.describe('Growth Tier User Journey - Authentication First', () => {
    test('3.1 Growth tier: Signup → Subscription → Analysis (20 daily)', async ({ page }) => {
      // Step 1: Navigate to landing page
      await helpers.navigateToHome();
      
      // Step 2: Go to signup via CTA
      await helpers.navigateToSignupFromLanding();
      
      // Step 3: Complete signup with Growth tier selection
      const tempEmail = generateTempEmail();
      await helpers.completeSignupFlow({
        email: tempEmail,
        password: 'GrowthUser123!',
        tier: 'growth'
      });
      
      // Step 4: Handle Stripe subscription during signup
      const subscriptionSuccess = await helpers.handleStripeSubscription({
        tier: 'growth',
        testCard: UAT_CONFIG.stripe.testCards.success,
      });
      expect(subscriptionSuccess).toBeTruthy();
      
      // Step 5: Login after successful subscription
      const loginSuccess = await helpers.login(tempEmail, 'GrowthUser123!');
      expect(loginSuccess).toBeTruthy();
      
      // Step 6: Navigate to authenticated dashboard
      await helpers.navigateToDashboard();
      
      // Step 7: Verify daily limit (20 analyses per day)
      const dailyLimit = await helpers.getDailyLimit();
      expect(dailyLimit).toBe(20);
      
      // Step 8: Test enhanced features
      await helpers.navigateToAuthenticatedAnalysis();
      const enhancedFeatures = await helpers.checkEnhancedFeatures();
      expect(enhancedFeatures.aiQualityScoring).toBeTruthy();
      expect(enhancedFeatures.sixPhaseGeneration).toBeTruthy();
      
      // Step 9: Perform analysis to verify subscription features work
      await helpers.performTierSpecificAnalysis('growth', TEST_WEBSITES.medium.url);
      const analysisComplete = await helpers.waitForAnalysis();
      expect(analysisComplete).toBeTruthy();
    });

    test('3.2 Growth tier subscription management', async ({ page }) => {
      await helpers.login(testUsers.growth.email, testUsers.growth.password);
      await helpers.navigateToAccountSettings();
      
      // Check subscription details
      const subscription = await helpers.getSubscriptionDetails();
      expect(subscription.tier).toBe('growth');
      expect(subscription.status).toBe('active');
      expect(subscription.price).toBe('$25/month');
      
      // Test cancellation flow
      await page.click('button:has-text("Cancel Subscription")');
      
      const cancelModal = await page.locator('[role="dialog"]:has-text("Cancel Subscription")');
      await expect(cancelModal).toBeVisible();
      
      // Verify cancellation options
      await expect(cancelModal.locator('text=/Keep benefits until/i')).toBeVisible();
      await expect(cancelModal.locator('text=/Downgrade to Free/i')).toBeVisible();
    });
  });

  // ============================================================================
  // SECTION 4: SCALE TIER USER JOURNEY (AUTHENTICATION-FIRST)
  // ============================================================================
  
  test.describe('Scale Tier User Journey - Authentication First', () => {
    test('4.1 Scale tier: Signup → Premium Subscription → Analysis (100 daily)', async ({ page }) => {
      // Step 1: Navigate to landing page
      await helpers.navigateToHome();
      
      // Step 2: Go to signup via CTA
      await helpers.navigateToSignupFromLanding();
      
      // Step 3: Complete signup with Scale tier selection
      const tempEmail = generateTempEmail();
      await helpers.completeSignupFlow({
        email: tempEmail,
        password: 'ScaleUser123!',
        tier: 'scale'
      });
      
      // Step 4: Handle Stripe premium subscription during signup
      const subscriptionSuccess = await helpers.handleStripeSubscription({
        tier: 'scale',
        testCard: UAT_CONFIG.stripe.testCards.success,
      });
      expect(subscriptionSuccess).toBeTruthy();
      
      // Step 5: Login after successful subscription
      const loginSuccess = await helpers.login(tempEmail, 'ScaleUser123!');
      expect(loginSuccess).toBeTruthy();
      
      // Step 6: Navigate to authenticated dashboard
      await helpers.navigateToDashboard();
      
      // Step 7: Verify scale tier features (100 daily limit)
      const dailyLimit = await helpers.getDailyLimit();
      expect(dailyLimit).toBe(100);
      
      // Step 8: Check priority support
      const prioritySupport = await page.locator('[data-testid="priority-support"]');
      await expect(prioritySupport).toBeVisible();
      
      // Step 9: Navigate to analysis page and test bulk analysis
      await helpers.navigateToAuthenticatedAnalysis();
      const bulkAnalysis = await helpers.performAuthenticatedBulkAnalysis([
        TEST_WEBSITES.small.url,
        TEST_WEBSITES.medium.url,
        TEST_WEBSITES.large.url,
      ]);
      expect(bulkAnalysis.success).toBeTruthy();
      expect(bulkAnalysis.analyzed).toBe(3);
    });

    test('4.2 Scale tier advanced analytics', async ({ page }) => {
      await helpers.login(testUsers.scale.email, testUsers.scale.password);
      await helpers.navigateToAnalytics();
      
      // Verify advanced analytics features
      await expect(page.locator('[data-testid="usage-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-analysis"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
      
      // Check export functionality
      const exportButton = await page.locator('button:has-text("Export Analytics")');
      await expect(exportButton).toBeVisible();
      await exportButton.click();
      
      // Verify export options
      await expect(page.locator('text="CSV Export"')).toBeVisible();
      await expect(page.locator('text="PDF Report"')).toBeVisible();
    });
  });

  // ============================================================================
  // SECTION 5: AUTHENTICATION FLOWS
  // ============================================================================
  
  test.describe('Authentication System', () => {
    test('5.1 User registration with email verification', async ({ page }) => {
      const tempEmail = generateTempEmail();
      
      await helpers.navigateToSignup();
      
      // Fill registration form
      await helpers.fillRegistrationForm({
        email: tempEmail,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
      });
      
      // Submit registration
      await page.click('button[type="submit"]');
      
      // Verify email sent message
      await expect(page.locator('text=/verification email sent/i')).toBeVisible();
      
      // Simulate email verification (in production, would check actual email)
      if (!IS_PRODUCTION) {
        await helpers.simulateEmailVerification(tempEmail);
      }
      
      // Verify can login after verification
      await helpers.navigateToLogin();
      const loginSuccess = await helpers.login(tempEmail, 'TestPassword123!');
      expect(loginSuccess).toBeTruthy();
    });

    test('5.2 Password reset flow', async ({ page }) => {
      await helpers.navigateToLogin();
      await page.click('a:has-text("Forgot password")');
      
      // Enter email for reset
      const resetEmail = testUsers.free.email;
      await page.fill('input[type="email"]', resetEmail);
      await page.click('button:has-text("Send Reset Email")');
      
      // Verify confirmation message
      await expect(page.locator('text=/password reset email sent/i')).toBeVisible();
      
      // Simulate clicking reset link (in production, would check actual email)
      if (!IS_PRODUCTION) {
        await helpers.simulatePasswordReset(resetEmail, 'NewPassword123!');
        
        // Verify can login with new password
        const loginSuccess = await helpers.login(resetEmail, 'NewPassword123!');
        expect(loginSuccess).toBeTruthy();
      }
    });

    test('5.3 Session management and logout', async ({ page }) => {
      await helpers.login(testUsers.free.email, testUsers.free.password);
      
      // Verify logged in state
      await helpers.navigateToDashboard();
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // Test session persistence (refresh page)
      await page.reload();
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // Test logout
      await helpers.logout();
      
      // Verify logged out state
      await expect(page.locator('a:has-text("Login")')).toBeVisible();
      
      // Verify can't access protected routes
      await page.goto(`${BASE_URL}/dashboard`);
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // ============================================================================
  // SECTION 6: ANALYSIS FEATURES
  // ============================================================================
  
  test.describe('Analysis Features', () => {
    test('6.1 Multi-strategy sitemap discovery (authenticated user)', async ({ page }) => {
      // Login as authenticated user first
      await helpers.login(testUsers.coffee.email, testUsers.coffee.password);
      
      const testCases = [
        { site: TEST_WEBSITES.withSitemap, expectedMethod: 'sitemap' },
        { site: TEST_WEBSITES.withoutSitemap, expectedMethod: 'homepage-crawl' },
        { site: TEST_WEBSITES.singlePage, expectedMethod: 'single-page' },
      ];
      
      for (const testCase of testCases) {
        // Navigate to authenticated analysis page
        await helpers.navigateToAuthenticatedAnalysis();
        
        // Perform analysis as authenticated user
        await helpers.performTierSpecificAnalysis('coffee', testCase.site.url);
        
        // Wait for analysis completion
        await helpers.waitForAnalysis();
        
        // Check discovery method
        const metadata = await helpers.getAnalysisMetadata();
        expect(metadata.analysisMethod).toBe(testCase.expectedMethod);
      }
    });

    test('6.2 Six-phase LLMs.txt generation (authenticated premium user)', async ({ page }) => {
      // Login as coffee tier user (premium features)
      await helpers.login(testUsers.coffee.email, testUsers.coffee.password);
      
      // Navigate to authenticated analysis page
      await helpers.navigateToAuthenticatedAnalysis();
      
      // Perform premium analysis
      await helpers.performTierSpecificAnalysis('coffee', TEST_WEBSITES.medium.url);
      
      // Wait for analysis completion
      await helpers.waitForAnalysis();
      
      // Download and verify enhanced LLMs.txt
      const content = await helpers.downloadAndReadLLMsFile();
      
      // Verify six-phase enhancements (premium features)
      expect(content).toContain('# Summary'); // Phase 1: Blockquote summaries
      expect(content).toContain('## Categories'); // Phase 2: Content clustering
      expect(content).toContain('Tags:'); // Phase 3: Semantic tags
      expect(content).toMatch(/\d+\.\s+/); // Phase 4: Intelligent sequencing
      expect(content).toContain('Metadata:'); // Phase 5: Enhanced metadata
      expect(content).toContain('Quality Score:'); // Phase 6: Quality optimization
    });

    test('6.3 Rate limiting and error handling (authenticated user)', async ({ page }) => {
      // Login as growth tier user for higher rate limits
      await helpers.login(testUsers.growth.email, testUsers.growth.password);
      await helpers.navigateToAuthenticatedAnalysis();
      
      // Test rate limiting with authenticated user
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(helpers.performQuickAuthenticatedAnalysis('https://example.com'));
      }
      
      const results = await Promise.all(requests);
      const rateLimited = results.filter(r => r.error === 'rate_limit');
      expect(rateLimited.length).toBeGreaterThan(0);
      
      // Test invalid URL handling in authenticated context
      await helpers.navigateToAuthenticatedAnalysis();
      await helpers.enterWebsiteURL('not-a-valid-url');
      await helpers.clickAnalyzeButton();
      await expect(page.locator('text=/invalid URL/i')).toBeVisible();
      
      // Test network error handling
      await helpers.simulateNetworkError();
      await helpers.performTierSpecificAnalysis('growth', TEST_WEBSITES.small.url);
      await expect(page.locator('text=/network error/i')).toBeVisible();
    });
  });

  // ============================================================================
  // SECTION 7: PAYMENT INTEGRATION
  // ============================================================================
  
  test.describe('Payment Integration', () => {
    test('7.1 Stripe checkout flow', async ({ page }) => {
      await helpers.navigateToPricing();
      
      // Test each tier's checkout
      const tiers = ['coffee', 'growth', 'scale'];
      
      for (const tier of tiers) {
        await page.click(`[data-tier="${tier}"] button`);
        
        // Wait for Stripe checkout to load
        await page.waitForSelector('iframe[name*="stripe"]');
        
        // Switch to Stripe iframe
        const stripeFrame = page.frameLocator('iframe[name*="stripe"]');
        
        // Verify checkout elements
        await expect(stripeFrame.locator('[placeholder="Card number"]')).toBeVisible();
        await expect(stripeFrame.locator('[placeholder="MM / YY"]')).toBeVisible();
        await expect(stripeFrame.locator('[placeholder="CVC"]')).toBeVisible();
        
        // Go back to pricing
        await page.goBack();
      }
    });

    test('7.2 Failed payment handling', async ({ page }) => {
      await helpers.navigateToPricing();
      await page.click('[data-tier="growth"] button');
      
      // Use declined test card
      const paymentFailed = await helpers.handleStripeCheckout({
        tier: 'growth',
        testCard: UAT_CONFIG.stripe.testCards.declined,
      });
      
      expect(paymentFailed).toBeFalsy();
      await expect(page.locator('text=/payment declined/i')).toBeVisible();
      
      // Verify retry option
      await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
    });

    test('7.3 Subscription management and cancellation', async ({ page }) => {
      await helpers.login(testUsers.growth.email, testUsers.growth.password);
      await helpers.navigateToSubscriptionManagement();
      
      // View current subscription
      await expect(page.locator('text="Growth Tier"')).toBeVisible();
      await expect(page.locator('text="$25/month"')).toBeVisible();
      
      // Update payment method
      await page.click('button:has-text("Update Payment Method")');
      const updateSuccess = await helpers.updatePaymentMethod(UAT_CONFIG.stripe.testCards.visa);
      expect(updateSuccess).toBeTruthy();
      
      // Cancel subscription
      await page.click('button:has-text("Cancel Subscription")');
      await page.click('button:has-text("Confirm Cancellation")');
      
      // Verify cancellation
      await expect(page.locator('text=/subscription will end/i')).toBeVisible();
    });
  });

  // ============================================================================
  // SECTION 8: RESPONSIVE DESIGN
  // ============================================================================
  
  test.describe('Responsive Design Testing', () => {
    const viewports = [
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 },
    ];
    
    for (const viewport of viewports) {
      test(`8.1 ${viewport.name} viewport (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await helpers.navigateToHome();
        
        // Check hero section
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('input[type="url"]')).toBeVisible();
        
        // Check navigation
        if (viewport.width < 768) {
          // Mobile menu
          await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
          await page.click('[data-testid="mobile-menu-button"]');
          await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
        } else {
          // Desktop navigation
          await expect(page.locator('nav')).toBeVisible();
        }
        
        // Check pricing cards
        await helpers.navigateToPricing();
        const pricingCards = await page.locator('[data-testid="pricing-card"]').count();
        expect(pricingCards).toBeGreaterThan(0);
        
        // Verify touch targets on mobile
        if (viewport.width < 768) {
          const buttons = await page.locator('button').all();
          for (const button of buttons.slice(0, 5)) { // Check first 5 buttons
            const box = await button.boundingBox();
            if (box) {
              expect(box.height).toBeGreaterThanOrEqual(44); // WCAG AA minimum
            }
          }
        }
      });
    }
  });

  // ============================================================================
  // SECTION 9: PERFORMANCE VALIDATION
  // ============================================================================
  
  test.describe('Performance Testing', () => {
    test('9.1 Page load performance', async ({ page }) => {
      const pages = [
        { name: 'Homepage', url: '/' },
        { name: 'Pricing', url: '/pricing' },
        { name: 'Dashboard', url: '/dashboard' },
      ];
      
      for (const pageInfo of pages) {
        const startTime = Date.now();
        await page.goto(`${BASE_URL}${pageInfo.url}`);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        console.log(`${pageInfo.name} load time: ${loadTime}ms`);
        
        if (loadTime > 3000) {
          metrics.performanceIssues.push({
            page: pageInfo.name,
            loadTime,
            expected: '<3000ms',
          });
        }
        
        expect(loadTime).toBeLessThan(5000); // Maximum acceptable
      }
    });

    test('9.2 API response times', async ({ page }) => {
      await helpers.login(testUsers.free.email, testUsers.free.password);
      
      const apiTests = [
        { endpoint: '/api/user/profile', expectedTime: 200 },
        { endpoint: '/api/user/usage', expectedTime: 200 },
        { endpoint: '/api/auth/verify', expectedTime: 200 },
      ];
      
      for (const api of apiTests) {
        const response = await helpers.measureAPIResponse(api.endpoint);
        
        console.log(`${api.endpoint} response time: ${response.time}ms`);
        
        if (response.time > api.expectedTime) {
          metrics.performanceIssues.push({
            endpoint: api.endpoint,
            responseTime: response.time,
            expected: `<${api.expectedTime}ms`,
          });
        }
      }
    });

    test('9.3 Analysis performance', async ({ page }) => {
      await helpers.login(testUsers.coffee.email, testUsers.coffee.password);
      
      const startTime = Date.now();
      await helpers.performAnalysis(TEST_WEBSITES.medium.url);
      const analysisTime = Date.now() - startTime;
      
      console.log(`Analysis time for medium site: ${analysisTime}ms`);
      
      expect(analysisTime).toBeLessThan(45000); // 45 seconds max
      
      if (analysisTime > 30000) {
        metrics.performanceIssues.push({
          operation: 'Site analysis',
          time: analysisTime,
          expected: '<30000ms',
        });
      }
    });
  });

  // ============================================================================
  // SECTION 10: SECURITY VALIDATION
  // ============================================================================
  
  test.describe('Security Testing', () => {
    test('10.1 Input sanitization', async ({ page }) => {
      await helpers.navigateToHome();
      
      // Test XSS attempts
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror="alert(\'XSS\')">',
      ];
      
      for (const payload of xssPayloads) {
        await helpers.enterWebsiteURL(payload);
        await helpers.clickAnalyzeButton();
        
        // Verify payload is not executed
        const alerts = await page.evaluate(() => {
          return (window as any).alertShown || false;
        });
        expect(alerts).toBeFalsy();
        
        // Verify error handling
        await expect(page.locator('text=/invalid/i')).toBeVisible();
      }
    });

    test('10.2 Authentication security', async ({ page }) => {
      // Test invalid tokens
      await page.evaluate(() => {
        localStorage.setItem('token', 'invalid-token-here');
      });
      
      await page.goto(`${BASE_URL}/dashboard`);
      await expect(page).toHaveURL(/\/login/);
      
      // Test session expiration
      await helpers.login(testUsers.free.email, testUsers.free.password);
      
      // Simulate expired token
      await page.evaluate(() => {
        const token = localStorage.getItem('token');
        if (token) {
          // Modify token to make it invalid
          localStorage.setItem('token', token + 'corrupted');
        }
      });
      
      await page.reload();
      await expect(page).toHaveURL(/\/login/);
    });

    test('10.3 Authorization checks', async ({ page }) => {
      // Try to access other user's data
      await helpers.login(testUsers.free.email, testUsers.free.password);
      
      // Attempt to access another user's analysis
      const response = await page.request.get(`${BASE_URL}/api/analysis/999999`);
      expect([403, 404]).toContain(response.status());
      
      // Try to perform admin actions
      const adminResponse = await page.request.post(`${BASE_URL}/api/admin/users`, {
        data: { action: 'delete', userId: 1 },
      });
      expect([403, 404]).toContain(adminResponse.status());
    });
  });

  // ============================================================================
  // SECTION 11: EDGE CASES
  // ============================================================================
  
  test.describe('Edge Cases and Error Recovery', () => {
    test('11.1 Network interruption handling', async ({ page }) => {
      await helpers.navigateToHome();
      await helpers.enterWebsiteURL(TEST_WEBSITES.small.url);
      
      // Start analysis
      await helpers.clickAnalyzeButton();
      
      // Simulate network interruption
      await page.route('**/api/**', route => route.abort());
      
      // Wait for error message
      await expect(page.locator('text=/network error|connection lost/i')).toBeVisible({ timeout: 10000 });
      
      // Restore network
      await page.unroute('**/api/**');
      
      // Verify retry option
      const retryButton = page.locator('button:has-text("Retry")');
      if (await retryButton.isVisible()) {
        await retryButton.click();
        await helpers.waitForAnalysis();
      }
    });

    test('11.2 Large website handling', async ({ page }) => {
      await helpers.login(testUsers.growth.email, testUsers.growth.password);
      
      // Test with large site (200+ pages)
      await helpers.performAnalysis(TEST_WEBSITES.large.url);
      
      // Verify handling of page limit
      const metadata = await helpers.getAnalysisMetadata();
      expect(metadata.totalPagesFound).toBeLessThanOrEqual(200);
      
      // Verify warning message about truncation
      if (metadata.totalPagesFound === 200) {
        await expect(page.locator('text=/maximum pages reached/i')).toBeVisible();
      }
    });

    test('11.3 Concurrent analysis attempts', async ({ page, context }) => {
      await helpers.login(testUsers.growth.email, testUsers.growth.password);
      
      // Open multiple tabs
      const page2 = await context.newPage();
      const helpers2 = new UATHelpers(page2, BASE_URL);
      
      // Start analysis in both tabs simultaneously
      const analysis1 = helpers.performAnalysis(TEST_WEBSITES.small.url);
      const analysis2 = helpers2.performAnalysis(TEST_WEBSITES.medium.url);
      
      const results = await Promise.allSettled([analysis1, analysis2]);
      
      // At least one should succeed
      const succeeded = results.filter(r => r.status === 'fulfilled');
      expect(succeeded.length).toBeGreaterThan(0);
      
      // Check for queueing message if one failed
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        await expect(page.locator('text=/analysis in progress|please wait/i')).toBeVisible();
      }
      
      await page2.close();
    });
  });

  // ============================================================================
  // SECTION 12: UAT REPORTING
  // ============================================================================
  
  test.afterAll(async () => {
    metrics.endTime = Date.now();
    const duration = (metrics.endTime - metrics.startTime) / 1000;
    
    console.log('\n' + '='.repeat(80));
    console.log('USER ACCEPTANCE TESTING COMPLETE');
    console.log('='.repeat(80));
    
    console.log('\n📊 TEST METRICS:');
    console.log(`Total Tests: ${metrics.totalTests}`);
    console.log(`Passed: ${metrics.passedTests} (${((metrics.passedTests / metrics.totalTests) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${metrics.failedTests} (${((metrics.failedTests / metrics.totalTests) * 100).toFixed(1)}%)`);
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    
    if (bugs.length > 0) {
      console.log('\n🐛 BUGS FOUND:');
      const criticalBugs = bugs.filter(b => b.severity === 'CRITICAL');
      const highBugs = bugs.filter(b => b.severity === 'HIGH');
      const mediumBugs = bugs.filter(b => b.severity === 'MEDIUM');
      const lowBugs = bugs.filter(b => b.severity === 'LOW');
      
      console.log(`CRITICAL: ${criticalBugs.length}`);
      console.log(`HIGH: ${highBugs.length}`);
      console.log(`MEDIUM: ${mediumBugs.length}`);
      console.log(`LOW: ${lowBugs.length}`);
      
      if (criticalBugs.length > 0) {
        console.log('\n❌ CRITICAL BUGS (Must fix before release):');
        criticalBugs.forEach(bug => {
          console.log(`  - ${bug.description}`);
        });
      }
    }
    
    if (metrics.performanceIssues.length > 0) {
      console.log('\n⚠️ PERFORMANCE ISSUES:');
      metrics.performanceIssues.forEach(issue => {
        console.log(`  - ${JSON.stringify(issue)}`);
      });
    }
    
    if (metrics.securityIssues.length > 0) {
      console.log('\n🔒 SECURITY ISSUES:');
      metrics.securityIssues.forEach(issue => {
        console.log(`  - ${JSON.stringify(issue)}`);
      });
    }
    
    // UAT Sign-off Criteria
    console.log('\n✅ UAT SIGN-OFF CRITERIA:');
    const passRate = (metrics.passedTests / metrics.totalTests) * 100;
    const criticalBugs = bugs.filter(b => b.severity === 'CRITICAL');
    const highBugs = bugs.filter(b => b.severity === 'HIGH');
    
    const criteria = {
      'All critical paths tested': metrics.totalTests >= 40,
      'No CRITICAL bugs': criticalBugs.length === 0,
      'Less than 5 HIGH bugs': highBugs.length < 5,
      '95%+ test pass rate': passRate >= 95,
      'Performance within SLA': metrics.performanceIssues.length === 0,
      'Security validation complete': metrics.securityIssues.length === 0,
    };
    
    Object.entries(criteria).forEach(([criterion, met]) => {
      console.log(`  ${met ? '✅' : '❌'} ${criterion}`);
    });
    
    const allCriteriaMet = Object.values(criteria).every(v => v);
    console.log(`\n${allCriteriaMet ? '🎉 READY FOR PRODUCTION!' : '⚠️ NOT READY - ISSUES NEED RESOLUTION'}`);
    
    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      metrics,
      bugs,
      criteria,
      readyForProduction: allCriteriaMet,
    };
    
    const fs = await import('fs/promises');
    await fs.writeFile(
      `tests/reports/uat-report-${Date.now()}.json`,
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📄 Full report saved to tests/reports/');
  });
});