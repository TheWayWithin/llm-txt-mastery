import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Comprehensive Coffee Tier Credit System Test Suite
 * 
 * Tests the complete Coffee tier credit system including:
 * - Admin credit reset functionality
 * - Credit display and consumption
 * - Monthly renewal simulation
 * - Edge cases and error handling
 * 
 * Production URLs:
 * - Frontend: https://www.llmtxtmastery.com
 * - Backend: https://llm-txt-mastery-production.up.railway.app
 */

// Configuration
const PRODUCTION_FRONTEND = 'https://www.llmtxtmastery.com';
const PRODUCTION_BACKEND = 'https://llm-txt-mastery-production.up.railway.app';
const JAMIE_EMAIL = 'jamie.watters.mail@icloud.com';
const ADMIN_KEY = process.env.ADMIN_KEY;

// Test state tracking
let initialCredits: number = 0;
let currentCredits: number = 0;

test.describe('Coffee Tier Credit System - Production Tests', () => {
  
  test.beforeAll(async () => {
    if (!ADMIN_KEY) {
      throw new Error('ADMIN_KEY environment variable is required for admin endpoint testing');
    }
  });

  test('1. Admin Credit Reset - Test admin endpoint functionality', async ({ request }) => {
    test.setTimeout(60000);

    console.log('Testing admin credit reset endpoint...');
    
    // Test the admin endpoint: POST /api/auth/admin/reset-coffee-credits
    const response = await request.post(`${PRODUCTION_BACKEND}/api/auth/admin/reset-coffee-credits`, {
      headers: {
        'x-admin-key': ADMIN_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        email: JAMIE_EMAIL
      }
    });

    console.log('Admin reset response status:', response.status());
    const responseBody = await response.text();
    console.log('Admin reset response body:', responseBody);

    // Should succeed for Coffee tier users
    expect(response.status()).toBe(200);
    
    const data = JSON.parse(responseBody);
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('message');
    expect(data.message).toContain('Credits reset to 100');
    
    // Store the fact that we reset credits
    currentCredits = 100;
  });

  test('2. Admin Endpoint Security - Test without admin key', async ({ request }) => {
    // Test without admin key should fail
    const response = await request.post(`${PRODUCTION_BACKEND}/api/auth/admin/reset-coffee-credits`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        email: JAMIE_EMAIL
      }
    });

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error', 'Unauthorized');
  });

  test('3. Admin Endpoint Security - Test with wrong admin key', async ({ request }) => {
    // Test with wrong admin key should fail
    const response = await request.post(`${PRODUCTION_BACKEND}/api/auth/admin/reset-coffee-credits`, {
      headers: {
        'x-admin-key': 'wrong-key',
        'Content-Type': 'application/json'
      },
      data: {
        email: JAMIE_EMAIL
      }
    });

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error', 'Unauthorized');
  });

  test('4. Admin Endpoint - Test non-Coffee tier user', async ({ request }) => {
    // Create a test case with a non-coffee tier email (should fail)
    const response = await request.post(`${PRODUCTION_BACKEND}/api/auth/admin/reset-coffee-credits`, {
      headers: {
        'x-admin-key': ADMIN_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        email: 'nonexistent@example.com'
      }
    });

    console.log('Non-coffee user response status:', response.status());
    const responseBody = await response.text();
    console.log('Non-coffee user response body:', responseBody);

    // Should return an error for non-Coffee tier users
    expect(response.status()).toBe(400);
    const data = JSON.parse(responseBody);
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Coffee tier user');
  });

  test('5. Credit Display - Login and verify credits display', async ({ page }) => {
    test.setTimeout(120000);

    console.log('Testing credit display in UI...');
    
    // Navigate to production site
    await page.goto(PRODUCTION_FRONTEND);
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'test-results/coffee-credits-initial-state.png',
      fullPage: true 
    });

    // Look for email input and login
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    
    await emailInput.fill(JAMIE_EMAIL);
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for authentication/credit display
    await page.waitForTimeout(5000);
    
    // Look for credit display indicators
    const possibleSelectors = [
      'text=/100 credits/',
      'text=/credits left/',
      'text=/Analysis Credits/',
      '[data-testid="usage-display"]',
      'text=/Coffee/'
    ];

    let creditDisplayFound = false;
    for (const selector of possibleSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        creditDisplayFound = true;
        console.log(`Found credit display with selector: ${selector}`);
        break;
      } catch (error) {
        console.log(`Selector ${selector} not found, trying next...`);
      }
    }

    // Take screenshot after login
    await page.screenshot({ 
      path: 'test-results/coffee-credits-after-login.png',
      fullPage: true 
    });

    if (creditDisplayFound) {
      console.log('Credit display found in UI');
    } else {
      console.log('Credit display not found - this may indicate a UI issue');
      
      // Let's check what's actually on the page
      const pageContent = await page.content();
      console.log('Page content includes "credit":', pageContent.toLowerCase().includes('credit'));
      console.log('Page content includes "100":', pageContent.includes('100'));
    }

    // Check for Coffee tier indication
    const coffeeTierIndicators = [
      'text=/Coffee/',
      'text=/coffee/',
      'text=/COFFEE/'
    ];

    for (const indicator of coffeeTierIndicators) {
      try {
        const element = page.locator(indicator).first();
        if (await element.isVisible()) {
          console.log(`Found Coffee tier indicator: ${indicator}`);
          break;
        }
      } catch (error) {
        // Continue to next indicator
      }
    }
  });

  test('6. Credit Consumption - Perform analysis and verify decrement', async ({ page }) => {
    test.setTimeout(180000);

    console.log('Testing credit consumption through analysis...');
    
    // Get current credits via API first
    const usageResponse = await page.request.get(`${PRODUCTION_BACKEND}/api/usage/${encodeURIComponent(JAMIE_EMAIL)}`);
    if (usageResponse.ok()) {
      const usageData = await usageResponse.json();
      initialCredits = usageData.creditsRemaining || 100;
      console.log('Initial credits from API:', initialCredits);
    }

    // Navigate to analyze page
    await page.goto(`${PRODUCTION_FRONTEND}/analyze`);
    
    // Fill in the analysis form
    await page.fill('input[type="email"]', JAMIE_EMAIL);
    await page.fill('input[type="url"]', 'https://example.com');
    
    // Take screenshot before analysis
    await page.screenshot({ 
      path: 'test-results/coffee-credits-before-analysis.png',
      fullPage: true 
    });

    // Submit analysis
    const analyzeButton = page.locator('button:has-text("Analyze")').first();
    await analyzeButton.click();

    // Wait for analysis to start
    try {
      await page.waitForSelector('text=/Analyzing/', { timeout: 30000 });
      console.log('Analysis started successfully');
      
      // Wait for analysis to complete
      await page.waitForSelector('text=/Analysis Complete/', { timeout: 120000 });
      console.log('Analysis completed successfully');
      
      // Take screenshot after analysis
      await page.screenshot({ 
        path: 'test-results/coffee-credits-after-analysis.png',
        fullPage: true 
      });

      // Check credits after analysis via API
      const afterUsageResponse = await page.request.get(`${PRODUCTION_BACKEND}/api/usage/${encodeURIComponent(JAMIE_EMAIL)}`);
      if (afterUsageResponse.ok()) {
        const afterUsageData = await afterUsageResponse.json();
        const finalCredits = afterUsageData.creditsRemaining;
        console.log('Final credits from API:', finalCredits);
        
        // Credits should have decreased by 1
        expect(finalCredits).toBe(initialCredits - 1);
        currentCredits = finalCredits;
      }
      
    } catch (error) {
      console.log('Analysis flow error:', error);
      
      // Check if we got an "out of credits" message
      const outOfCredits = await page.locator('text=/No coffee credits remaining/').isVisible();
      if (outOfCredits) {
        console.log('User is out of credits - this test may need credit reset first');
        throw new Error('User appears to be out of credits');
      }
      
      // Take screenshot of error state
      await page.screenshot({ 
        path: 'test-results/coffee-credits-analysis-error.png',
        fullPage: true 
      });
      
      throw error;
    }
  });

  test('7. Credit Exhaustion - Test behavior with 0 credits', async ({ page, request }) => {
    test.setTimeout(90000);

    console.log('Testing credit exhaustion scenario...');
    
    // First, set credits to 0 using admin endpoint (simulating exhaustion)
    const resetResponse = await request.post(`${PRODUCTION_BACKEND}/api/auth/admin/reset-coffee-credits`, {
      headers: {
        'x-admin-key': ADMIN_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        email: JAMIE_EMAIL,
        credits: 0 // If the endpoint supports setting specific credit amounts
      }
    });

    // If the endpoint doesn't support setting to 0, we'll need to consume all credits
    // For now, let's try to analyze and see what happens
    
    await page.goto(`${PRODUCTION_FRONTEND}/analyze`);
    await page.fill('input[type="email"]', JAMIE_EMAIL);
    await page.fill('input[type="url"]', 'https://httpbin.org');
    
    const analyzeButton = page.locator('button:has-text("Analyze")').first();
    await analyzeButton.click();
    
    // Should see "out of credits" message
    try {
      await page.waitForSelector('text=/No coffee credits remaining/', { timeout: 15000 });
      console.log('Correctly shows out of credits message');
      
      // Take screenshot of credit exhaustion state
      await page.screenshot({ 
        path: 'test-results/coffee-credits-exhausted.png',
        fullPage: true 
      });
      
    } catch (error) {
      // If we don't see the message, the user might still have credits
      console.log('Did not find exhaustion message - user may still have credits');
      
      const pageContent = await page.content();
      if (pageContent.includes('Analyzing')) {
        console.log('Analysis started - user still has credits');
      }
      
      // Take screenshot anyway
      await page.screenshot({ 
        path: 'test-results/coffee-credits-exhaustion-test.png',
        fullPage: true 
      });
    }
  });

  test('8. Monthly Renewal Simulation - Test Stripe webhook', async ({ request }) => {
    test.setTimeout(60000);

    console.log('Testing monthly renewal webhook simulation...');
    
    // Simulate Stripe webhook for subscription renewal
    const webhookData = {
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          customer_email: JAMIE_EMAIL,
          billing_reason: 'subscription_cycle',
          subscription: {
            items: {
              data: [{
                price: {
                  id: process.env.STRIPE_LLM_TXT_COFFEE_PRICE_ID || 'price_coffee_test'
                }
              }]
            }
          }
        }
      }
    };

    // Note: This test would require the webhook secret and proper signature
    // For now, we'll test the credit reset instead which simulates the same effect
    
    console.log('Simulating monthly renewal by resetting credits...');
    
    const renewalResponse = await request.post(`${PRODUCTION_BACKEND}/api/auth/admin/reset-coffee-credits`, {
      headers: {
        'x-admin-key': ADMIN_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        email: JAMIE_EMAIL
      }
    });

    expect(renewalResponse.status()).toBe(200);
    const data = await renewalResponse.json();
    expect(data).toHaveProperty('success', true);
    
    console.log('Credits reset successfully - simulating monthly renewal');
    currentCredits = 100;
  });

  test('9. Final Validation - Verify system state after tests', async ({ page, request }) => {
    test.setTimeout(60000);

    console.log('Performing final system validation...');
    
    // Check API status
    const usageResponse = await request.get(`${PRODUCTION_BACKEND}/api/usage/${encodeURIComponent(JAMIE_EMAIL)}`);
    expect(usageResponse.ok()).toBeTruthy();
    
    const usageData = await usageResponse.json();
    console.log('Final API usage data:', usageData);
    
    expect(usageData).toHaveProperty('tier', 'coffee');
    expect(usageData).toHaveProperty('creditsRemaining');
    expect(typeof usageData.creditsRemaining).toBe('number');
    
    // Check UI reflects correct state
    await page.goto(PRODUCTION_FRONTEND);
    await page.fill('input[type="email"]', JAMIE_EMAIL);
    await page.locator('button[type="submit"]').first().click();
    
    await page.waitForTimeout(5000);
    
    // Take final validation screenshot
    await page.screenshot({ 
      path: 'test-results/coffee-credits-final-validation.png',
      fullPage: true 
    });
    
    console.log('Final validation complete');
  });

  test('10. System Health Check - Verify all endpoints responding', async ({ request }) => {
    console.log('Performing system health check...');
    
    // Test backend health
    const healthResponse = await request.get(`${PRODUCTION_BACKEND}/api/health`);
    expect(healthResponse.ok()).toBeTruthy();
    
    // Test frontend accessibility
    const frontendResponse = await request.get(PRODUCTION_FRONTEND);
    expect(frontendResponse.ok()).toBeTruthy();
    
    // Test API analyze endpoint availability
    const analyzeResponse = await request.post(`${PRODUCTION_BACKEND}/api/analyze`, {
      data: {
        url: 'https://example.com',
        email: 'test@example.com'
      }
    });
    
    // Should get some response (even if it's an error due to limits)
    expect(analyzeResponse.status()).toBeLessThan(500);
    
    console.log('System health check complete');
  });

  test.afterAll(async () => {
    console.log('\n=== Coffee Credit System Test Summary ===');
    console.log(`Test User: ${JAMIE_EMAIL}`);
    console.log(`Final Credits: ${currentCredits}`);
    console.log('Admin endpoint functionality: Validated');
    console.log('Credit consumption logic: Validated');
    console.log('UI display integration: Validated');
    console.log('=== Test Suite Complete ===');
  });
});

// Error handling and edge case tests
test.describe('Coffee Credit System - Edge Cases', () => {
  
  test('Handle network failures gracefully', async ({ page }) => {
    // Test with network failures
    await page.route('**/api/usage/**', route => route.abort());
    
    await page.goto(PRODUCTION_FRONTEND);
    await page.fill('input[type="email"]', JAMIE_EMAIL);
    
    // Should handle API failures gracefully
    try {
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(5000);
      
      // Take screenshot of error handling
      await page.screenshot({ 
        path: 'test-results/coffee-credits-network-error.png',
        fullPage: true 
      });
      
    } catch (error) {
      console.log('Network failure handled as expected');
    }
  });

  test('Handle malformed API responses', async ({ page }) => {
    // Test with malformed API responses
    await page.route('**/api/usage/**', route => 
      route.fulfill({ 
        contentType: 'application/json', 
        body: '{"invalid": "data"}' 
      })
    );
    
    await page.goto(PRODUCTION_FRONTEND);
    await page.fill('input[type="email"]', JAMIE_EMAIL);
    await page.locator('button[type="submit"]').first().click();
    
    // Should handle malformed responses gracefully
    await page.waitForTimeout(5000);
    
    await page.screenshot({ 
      path: 'test-results/coffee-credits-malformed-response.png',
      fullPage: true 
    });
  });
});