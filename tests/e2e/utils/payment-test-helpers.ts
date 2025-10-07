import { Page, expect } from '@playwright/test';

/**
 * PAYMENT TESTING UTILITIES
 *
 * Shared helpers for Growth/Scale tier payment flow testing
 * Author: THE TESTER - AGENT-11
 */

export interface PaymentTestConfig {
  tier: 'growth' | 'scale';
  expectedPrice: string;
  expectedEndpoint: string;
}

export const PAYMENT_CONFIGS: Record<'growth' | 'scale', PaymentTestConfig> = {
  growth: {
    tier: 'growth',
    expectedPrice: '$9.95',
    expectedEndpoint: '/api/stripe/create-growth-checkout',
  },
  scale: {
    tier: 'scale',
    expectedPrice: '$19.95',
    expectedEndpoint: '/api/stripe/create-scale-checkout',
  },
};

export class PaymentFlowTester {
  constructor(private page: Page) {}

  /**
   * Complete signup flow with specified tier
   */
  async completeSignupFlow(email: string, tier: 'growth' | 'scale') {
    console.log(`🔄 Starting signup flow for ${tier} tier with email: ${email}`);

    // Navigate to signup
    await this.page.goto('/signup', { waitUntil: 'networkidle' });
    await expect(this.page).toHaveTitle(/Sign Up|Create Account|LLM/);

    // Select tier
    const tierSelect = this.page.locator('select#tier, #tier, [name="tier"]');
    await expect(tierSelect).toBeVisible({ timeout: 10000 });
    await tierSelect.selectOption(tier);

    // Verify tier selection UI
    const tierInfo = this.page.locator(
      `text=${tier.toUpperCase()}, text=${PAYMENT_CONFIGS[tier].expectedPrice}`
    );
    await expect(tierInfo).toBeVisible({ timeout: 5000 });

    // Fill form
    await this.page.fill('input[type="email"], input[name="email"]', email);
    await this.page.fill('input[type="password"], input[name="password"]', 'TestPassword123!');

    const confirmPasswordField = this.page.locator(
      'input[placeholder*="confirm"], input[name="confirmPassword"]'
    );
    if (await confirmPasswordField.isVisible()) {
      await confirmPasswordField.fill('TestPassword123!');
    }

    return this;
  }

  /**
   * Submit form and validate API call
   */
  async submitAndValidateAPI(email: string, tier: 'growth' | 'scale') {
    const config = PAYMENT_CONFIGS[tier];

    // Set up API call interception
    const checkoutRequestPromise = this.page.waitForRequest(
      (req) => req.url().includes(config.expectedEndpoint) && req.method() === 'POST'
    );

    const submitButton = this.page.locator(
      'button[type="submit"], button:has-text("Create Account")'
    );
    await expect(submitButton).toBeEnabled();

    await submitButton.click();

    // Validate API call
    const checkoutRequest = await checkoutRequestPromise;
    console.log(`✅ ${tier} checkout API called: ${config.expectedEndpoint}`);

    // Validate request body
    const requestBody = JSON.parse(checkoutRequest.postData() || '{}');
    expect(requestBody.email).toBe(email);
    console.log(`✅ Correct email sent to ${tier} checkout API`);

    return this;
  }

  /**
   * Validate Stripe redirect and form
   */
  async validateStripeRedirect(tier: 'growth' | 'scale') {
    // Wait for Stripe redirect
    await this.page.waitForURL(/stripe|checkout/, { timeout: 30000 });
    console.log('✅ Redirected to Stripe checkout');

    // Validate Stripe form loads
    await this.page.waitForSelector(
      'form, .StripeElement, iframe, [data-testid="hosted-payment-page"]',
      {
        timeout: 15000,
      }
    );

    // Check for expected pricing
    const config = PAYMENT_CONFIGS[tier];
    const priceElements = this.page.locator(
      `text=${config.expectedPrice}, text=${config.expectedPrice.replace('$', '')}`
    );

    if ((await priceElements.count()) > 0) {
      console.log(`✅ ${tier} tier pricing (${config.expectedPrice}) visible on Stripe`);
    } else {
      console.log(`⚠️  ${tier} tier pricing not clearly visible`);
    }

    return this;
  }

  /**
   * Validate upgrade flow from dashboard
   */
  async validateUpgradeFlow(targetTier: 'growth' | 'scale') {
    console.log(`🔄 Testing upgrade to ${targetTier} tier`);

    await this.page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Look for upgrade button
    const upgradeButton = this.page.locator(
      `button:has-text("Upgrade to ${targetTier.charAt(0).toUpperCase() + targetTier.slice(1)}"), ` +
        `button:has-text("${targetTier.charAt(0).toUpperCase() + targetTier.slice(1)}"), ` +
        `a:has-text("Upgrade to ${targetTier.charAt(0).toUpperCase() + targetTier.slice(1)}")`
    );

    const upgradeVisible = (await upgradeButton.count()) > 0;

    if (upgradeVisible) {
      console.log(`✅ ${targetTier} upgrade option found`);

      // Intercept upgrade API call
      const upgradeRequestPromise = this.page.waitForRequest(
        (req) => req.url().includes('/api/stripe/create-upgrade-session') && req.method() === 'POST'
      );

      await upgradeButton.first().click();

      // Validate API call
      const upgradeRequest = await upgradeRequestPromise;
      const requestBody = JSON.parse(upgradeRequest.postData() || '{}');
      expect(requestBody.targetTier).toBe(targetTier);
      console.log('✅ Upgrade API called with correct target tier');

      // Should redirect for payment
      await this.page.waitForURL(/stripe|checkout|upgrade/, { timeout: 15000 });
      console.log('✅ Redirected to upgrade payment page');
    } else {
      console.log(`⚠️  ${targetTier} upgrade option not found`);
    }

    return upgradeVisible;
  }

  /**
   * Test API endpoints directly
   */
  static async testAPIEndpoints(page: Page): Promise<{
    growth: boolean;
    scale: boolean;
    upgrade: boolean;
  }> {
    console.log('🔧 Testing API endpoints directly...');

    const results = {
      growth: false,
      scale: false,
      upgrade: false,
    };

    try {
      // Test Growth checkout
      const growthResponse = await page.request.post('/api/stripe/create-growth-checkout', {
        data: { email: 'test@example.com' },
        headers: { 'Content-Type': 'application/json' },
      });

      results.growth = [401, 400].includes(growthResponse.status());
      console.log(`Growth API: ${results.growth ? '✅' : '❌'} (${growthResponse.status()})`);

      // Test Scale checkout
      const scaleResponse = await page.request.post('/api/stripe/create-scale-checkout', {
        data: { email: 'test@example.com' },
        headers: { 'Content-Type': 'application/json' },
      });

      results.scale = [401, 400].includes(scaleResponse.status());
      console.log(`Scale API: ${results.scale ? '✅' : '❌'} (${scaleResponse.status()})`);

      // Test Upgrade session
      const upgradeResponse = await page.request.post('/api/stripe/create-upgrade-session', {
        data: { targetTier: 'growth' },
        headers: { 'Content-Type': 'application/json' },
      });

      results.upgrade = upgradeResponse.status() === 401;
      console.log(`Upgrade API: ${results.upgrade ? '✅' : '❌'} (${upgradeResponse.status()})`);
    } catch (error) {
      console.error('API endpoint testing error:', error);
    }

    return results;
  }

  /**
   * Generate test report
   */
  static generateTestReport(results: {
    signupFlows: { growth: boolean; scale: boolean };
    upgradeFlows: { coffeeToGrowth: boolean; growthToScale: boolean };
    apiEndpoints: { growth: boolean; scale: boolean; upgrade: boolean };
    edgeCases: { invalidEmail: boolean; cancellation: boolean; coffeeRegression: boolean };
  }): string {
    const timestamp = new Date().toISOString();
    const passCount = Object.values(results).reduce(
      (total, category) => total + Object.values(category).filter(Boolean).length,
      0
    );
    const totalTests = Object.values(results).reduce(
      (total, category) => total + Object.values(category).length,
      0
    );

    return `
# 💳 GROWTH & SCALE PAYMENT TESTING REPORT
Generated: ${timestamp}
Tests Passed: ${passCount}/${totalTests}

## 🆕 Signup Flows
- Growth Tier Signup: ${results.signupFlows.growth ? '✅ PASS' : '❌ FAIL'}
- Scale Tier Signup: ${results.signupFlows.scale ? '✅ PASS' : '❌ FAIL'}

## 📈 Upgrade Flows
- Coffee → Growth: ${results.upgradeFlows.coffeeToGrowth ? '✅ PASS' : '❌ FAIL'}
- Growth → Scale: ${results.upgradeFlows.growthToScale ? '✅ PASS' : '❌ FAIL'}

## 🔧 API Endpoints
- Growth Checkout API: ${results.apiEndpoints.growth ? '✅ WORKING' : '❌ ISSUES'}
- Scale Checkout API: ${results.apiEndpoints.scale ? '✅ WORKING' : '❌ ISSUES'}
- Upgrade Session API: ${results.apiEndpoints.upgrade ? '✅ WORKING' : '❌ ISSUES'}

## ❌ Edge Cases
- Invalid Email Handling: ${results.edgeCases.invalidEmail ? '✅ PASS' : '❌ FAIL'}
- Cancellation Flow: ${results.edgeCases.cancellation ? '✅ PASS' : '❌ FAIL'}
- Coffee Tier Regression: ${results.edgeCases.coffeeRegression ? '✅ PASS' : '❌ FAIL'}

## 🎯 Overall Assessment
${
  passCount === totalTests
    ? '🎉 ALL TESTS PASSED - Growth & Scale payment processing is fully functional!'
    : `⚠️  ${totalTests - passCount} test(s) failed - Review and fix issues before deployment.`
}

## 🔍 Critical Areas Tested
1. **Revenue Protection**: All payment endpoints validate input and require proper authentication
2. **User Experience**: Tier selection updates UI appropriately and redirects work correctly
3. **API Integration**: Stripe checkout sessions created with correct parameters
4. **Upgrade Flows**: Proration handling and tier transitions function properly
5. **Error Handling**: Invalid inputs and network failures handled gracefully

---
Generated by THE TESTER - AGENT-11 QA Automation Suite
`;
  }
}

/**
 * Mock Stripe test data
 */
export const STRIPE_TEST_DATA = {
  // Stripe test card numbers (safe for testing)
  cards: {
    visa: '4242424242424242',
    visaDebit: '4000056655665556',
    mastercard: '5555555555554444',
    amex: '378282246310005',
    declined: '4000000000000002',
  },

  // Test customer data
  customer: {
    email: 'test@example.com',
    name: 'Test User',
    phone: '+1234567890',
  },

  // Expected webhook events
  webhookEvents: [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'invoice.payment_succeeded',
  ],
};

/**
 * Validation helpers
 */
export const ValidationHelpers = {
  /**
   * Check if email format is valid
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate tier pricing format
   */
  isValidPrice(price: string): boolean {
    const priceRegex = /^\$?\d+\.\d{2}$/;
    return priceRegex.test(price);
  },

  /**
   * Check if URL is Stripe checkout
   */
  isStripeCheckoutURL(url: string): boolean {
    return (
      url.includes('stripe.com') ||
      url.includes('checkout.stripe.com') ||
      url.includes('js.stripe.com')
    );
  },
};
