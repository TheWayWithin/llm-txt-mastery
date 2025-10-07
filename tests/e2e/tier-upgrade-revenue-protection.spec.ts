/**
 * END-TO-END TIER UPGRADE REVENUE PROTECTION TESTS
 *
 * These tests validate the complete customer journey from purchase to tier verification,
 * ensuring revenue protection works correctly across the entire system.
 *
 * CRITICAL BUSINESS IMPACT: These tests prevent revenue loss by ensuring paid customers
 * receive the correct tier benefits and are not treated as free users.
 */

import { test, expect, type Page } from '@playwright/test';

// Test configuration for different environments
const config = {
  production: {
    baseURL: 'https://www.llmtxtmastery.com',
    apiURL: 'https://llm-txt-mastery-production.up.railway.app',
  },
  staging: {
    baseURL: 'http://localhost:5000',
    apiURL: 'http://localhost:5000',
  },
};

const env = process.env.TEST_ENV === 'production' ? 'production' : 'staging';
const testConfig = config[env];

test.describe('Tier Upgrade Revenue Protection E2E Tests', () => {
  test.describe.configure({ mode: 'serial' }); // Run tests in sequence for database consistency

  let testEmail: string;
  let testWebsiteUrl: string;

  test.beforeAll(async () => {
    // Generate unique test identifiers
    const timestamp = Date.now();
    testEmail = `tier-test-${timestamp}@example.com`;
    testWebsiteUrl = 'https://docs.stripe.com'; // Use a reliable test site
  });

  test.describe('Coffee Tier Purchase Flow', () => {
    test('should maintain Coffee tier benefits after payment webhook', async ({ page }) => {
      await test.step('Initial email capture as Starter tier', async () => {
        await page.goto(`${testConfig.baseURL}/`);

        // Fill in website URL and email
        await page.fill('input[placeholder*="Enter website URL"]', testWebsiteUrl);
        await page.fill('input[placeholder*="Enter your email"]', testEmail);

        // Click analyze (should show tier selection)
        await page.click('button:has-text("Analyze Website")');

        // Wait for tier selection modal
        await expect(page.locator('text=Choose Your Plan')).toBeVisible();
      });

      await test.step('Select Coffee tier and simulate payment', async () => {
        // Click on Coffee tier
        await page.click('button:has-text("Coffee")');

        // This would normally redirect to Stripe - for testing, we'll simulate the webhook
        // by directly calling the webhook endpoint with test data
        const webhookData = {
          type: 'checkout.session.completed',
          data: {
            object: {
              metadata: {
                userId: '1', // Test user ID
                paymentType: 'one_time',
                productType: 'coffee',
                priceId: 'price_coffee_test',
              },
              customer_details: {
                email: testEmail,
              },
              payment_intent: 'pi_test_coffee_upgrade',
            },
          },
        };

        // Simulate webhook processing (in real test, this would happen via Stripe)
        const response = await page.request.post(`${testConfig.apiURL}/api/stripe/webhook`, {
          data: JSON.stringify(webhookData),
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test_signature',
          },
        });

        expect(response.status()).toBe(200);
      });

      await test.step('Verify Coffee tier benefits are active', async () => {
        // Navigate to coffee success page (simulating post-payment redirect)
        await page.goto(
          `${testConfig.baseURL}/coffee-success?email=${encodeURIComponent(testEmail)}&website=${encodeURIComponent(testWebsiteUrl)}`
        );

        // Should show success message
        await expect(page.locator('text=Payment successful')).toBeVisible();

        // Click "Analyze Your Website" button
        await page.click('button:has-text("Analyze Your Website")');

        // Should go directly to analysis (no tier selection for Coffee tier)
        await expect(page.locator('text=Analyzing')).toBeVisible();

        // Wait for analysis to complete
        await expect(page.locator('text=Analysis Complete'), { timeout: 120000 }).toBeVisible();

        // Verify Coffee tier limits are applied (unlimited pages for Coffee tier)
        const pageCount = await page
          .locator('[data-testid="discovered-pages-count"]')
          .textContent();
        expect(parseInt(pageCount || '0')).toBeGreaterThan(20); // Should exceed Starter limit
      });

      await test.step('Verify getUserTier() returns Coffee tier', async () => {
        // Test the API directly to ensure tier is correctly returned
        const response = await page.request.get(
          `${testConfig.apiURL}/api/get-user-tier?email=${encodeURIComponent(testEmail)}`
        );
        const data = await response.json();

        expect(data.tier).toBe('coffee');
        expect(data.dailyLimit).toBe(999); // Coffee tier daily limit
        expect(data.pageLimit).toBe(1000); // Coffee tier page limit
      });
    });
  });

  test.describe('Growth Subscription Flow', () => {
    test('should maintain Growth tier benefits after subscription webhook', async ({ page }) => {
      const growthEmail = `growth-test-${Date.now()}@example.com`;

      await test.step('Simulate Growth subscription creation', async () => {
        // First, create email capture
        await page.request.post(`${testConfig.apiURL}/api/email-capture`, {
          data: {
            email: growthEmail,
            tier: 'starter',
            websiteUrl: testWebsiteUrl,
          },
        });

        // Simulate subscription checkout completion
        const webhookData = {
          type: 'checkout.session.completed',
          data: {
            object: {
              metadata: {
                userId: '2', // Test user ID
                priceId: 'price_growth_test',
              },
              customer_details: {
                email: growthEmail,
              },
              subscription: 'sub_growth_test_123',
            },
          },
        };

        const response = await page.request.post(`${testConfig.apiURL}/api/stripe/webhook`, {
          data: JSON.stringify(webhookData),
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test_signature',
          },
        });

        expect(response.status()).toBe(200);
      });

      await test.step('Verify Growth tier benefits', async () => {
        // Test the API to ensure tier is correctly set
        const response = await page.request.get(
          `${testConfig.apiURL}/api/get-user-tier?email=${encodeURIComponent(growthEmail)}`
        );
        const data = await response.json();

        expect(data.tier).toBe('growth');
        expect(data.dailyLimit).toBe(999); // Growth tier daily limit
        expect(data.pageLimit).toBe(1000); // Growth tier page limit
      });

      await test.step('Test Growth tier analysis capabilities', async () => {
        // Navigate to analyze page with Growth tier user
        await page.goto(`${testConfig.baseURL}/analyze`);

        // Fill form with Growth tier email
        await page.fill('input[placeholder*="Enter website URL"]', testWebsiteUrl);
        await page.fill('input[placeholder*="Enter your email"]', growthEmail);

        // Click analyze - should go directly to analysis (no tier selection for paid users)
        await page.click('button:has-text("Analyze Website")');

        // Should skip tier selection and go to analysis
        await expect(page.locator('text=Analyzing')).toBeVisible();

        // Wait for analysis completion
        await expect(page.locator('text=Analysis Complete'), { timeout: 120000 }).toBeVisible();

        // Verify Growth tier gets AI-enhanced analysis
        await expect(page.locator('text=Quality Score')).toBeVisible(); // AI feature
        await expect(page.locator('text=AI Analysis')).toBeVisible(); // AI feature
      });
    });
  });

  test.describe('Subscription Tier Changes', () => {
    test('should handle tier upgrades from Growth to Scale', async ({ page }) => {
      const upgradeEmail = `upgrade-test-${Date.now()}@example.com`;

      await test.step('Setup initial Growth subscription', async () => {
        // Create email capture and set to Growth
        await page.request.post(`${testConfig.apiURL}/api/email-capture`, {
          data: {
            email: upgradeEmail,
            tier: 'growth',
            websiteUrl: testWebsiteUrl,
          },
        });

        // Simulate initial Growth subscription
        const initialWebhook = {
          type: 'customer.subscription.created',
          data: {
            object: {
              id: 'sub_upgrade_test',
              customer: 'cus_upgrade_test',
              metadata: { userId: '3' },
              items: {
                data: [
                  {
                    price: {
                      id: 'price_growth_test',
                      unit_amount: 2900,
                      currency: 'usd',
                    },
                  },
                ],
              },
              status: 'active',
            },
          },
        };

        await page.request.post(`${testConfig.apiURL}/api/stripe/webhook`, {
          data: JSON.stringify(initialWebhook),
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test_signature',
          },
        });
      });

      await test.step('Simulate upgrade to Scale tier', async () => {
        // Simulate subscription update to Scale
        const upgradeWebhook = {
          type: 'customer.subscription.updated',
          data: {
            object: {
              id: 'sub_upgrade_test',
              customer: 'cus_upgrade_test',
              metadata: { userId: '3' },
              items: {
                data: [
                  {
                    price: {
                      id: 'price_scale_test',
                      unit_amount: 9900,
                      currency: 'usd',
                    },
                  },
                ],
              },
              status: 'active',
            },
          },
        };

        const response = await page.request.post(`${testConfig.apiURL}/api/stripe/webhook`, {
          data: JSON.stringify(upgradeWebhook),
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test_signature',
          },
        });

        expect(response.status()).toBe(200);
      });

      await test.step('Verify Scale tier benefits are active', async () => {
        // Test the API to ensure tier was upgraded
        const response = await page.request.get(
          `${testConfig.apiURL}/api/get-user-tier?email=${encodeURIComponent(upgradeEmail)}`
        );
        const data = await response.json();

        expect(data.tier).toBe('scale');
        expect(data.dailyLimit).toBe(999); // Scale tier daily limit
        expect(data.pageLimit).toBe(-1); // Scale tier has unlimited pages
      });
    });
  });

  test.describe('Subscription Cancellation', () => {
    test('should downgrade to Starter tier when subscription is cancelled', async ({ page }) => {
      const cancelEmail = `cancel-test-${Date.now()}@example.com`;

      await test.step('Setup Scale subscription', async () => {
        // Create email capture as Scale tier
        await page.request.post(`${testConfig.apiURL}/api/email-capture`, {
          data: {
            email: cancelEmail,
            tier: 'scale',
            websiteUrl: testWebsiteUrl,
          },
        });
      });

      await test.step('Simulate subscription cancellation', async () => {
        const cancellationWebhook = {
          type: 'customer.subscription.deleted',
          data: {
            object: {
              id: 'sub_cancel_test',
              customer: 'cus_cancel_test',
              metadata: { userId: '4' },
            },
          },
        };

        const response = await page.request.post(`${testConfig.apiURL}/api/stripe/webhook`, {
          data: JSON.stringify(cancellationWebhook),
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test_signature',
          },
        });

        expect(response.status()).toBe(200);
      });

      await test.step('Verify downgrade to Starter tier', async () => {
        // Test the API to ensure tier was downgraded
        const response = await page.request.get(
          `${testConfig.apiURL}/api/get-user-tier?email=${encodeURIComponent(cancelEmail)}`
        );
        const data = await response.json();

        expect(data.tier).toBe('starter');
        expect(data.dailyLimit).toBe(3); // Starter tier daily limit
        expect(data.pageLimit).toBe(20); // Starter tier page limit
      });

      await test.step('Verify Starter tier limits are enforced', async () => {
        // Test analysis with downgraded user
        await page.goto(`${testConfig.baseURL}/analyze`);

        await page.fill('input[placeholder*="Enter website URL"]', testWebsiteUrl);
        await page.fill('input[placeholder*="Enter your email"]', cancelEmail);

        await page.click('button:has-text("Analyze Website")');

        // Should show tier selection again for downgraded user
        await expect(page.locator('text=Choose Your Plan')).toBeVisible();

        // Select free tier
        await page.click('button:has-text("Free")');

        // Should proceed with Starter tier limits
        await expect(page.locator('text=Analyzing')).toBeVisible();
        await expect(page.locator('text=Analysis Complete'), { timeout: 120000 }).toBeVisible();

        // Verify page count is limited to Starter tier (20 pages)
        const pageCount = await page
          .locator('[data-testid="discovered-pages-count"]')
          .textContent();
        expect(parseInt(pageCount || '0')).toBeLessThanOrEqual(20);
      });
    });
  });

  test.describe('Revenue Protection Validation', () => {
    test('should prevent free tier abuse by paid customers', async ({ page }) => {
      const paidUserEmail = `paid-user-${Date.now()}@example.com`;

      await test.step('Setup paid user (Coffee tier)', async () => {
        await page.request.post(`${testConfig.apiURL}/api/email-capture`, {
          data: {
            email: paidUserEmail,
            tier: 'coffee',
            websiteUrl: testWebsiteUrl,
          },
        });
      });

      await test.step('Verify paid user cannot select free tier', async () => {
        await page.goto(`${testConfig.baseURL}/analyze`);

        await page.fill('input[placeholder*="Enter website URL"]', testWebsiteUrl);
        await page.fill('input[placeholder*="Enter your email"]', paidUserEmail);

        await page.click('button:has-text("Analyze Website")');

        // Paid user should skip tier selection and go directly to analysis
        // This prevents paid users from accidentally using free tier
        await expect(page.locator('text=Analyzing')).toBeVisible();
        await expect(page.locator('text=Choose Your Plan')).not.toBeVisible();
      });

      await test.step('Verify daily usage tracking works correctly', async () => {
        // Test that paid user usage is tracked under correct tier
        const response = await page.request.get(
          `${testConfig.apiURL}/api/usage-today?email=${encodeURIComponent(paidUserEmail)}`
        );
        const data = await response.json();

        expect(data.usageCount).toBe(1); // Should have 1 usage from the analysis
        expect(data.dailyLimit).toBe(999); // Coffee tier limit
        expect(data.remainingUsage).toBe(998); // Remaining uses
      });
    });
  });

  test.afterAll(async ({ page }) => {
    // Cleanup test data (optional - depends on your cleanup strategy)
    console.log('E2E tier upgrade tests completed');
  });
});
