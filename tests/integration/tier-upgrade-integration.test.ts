/**
 * TIER UPGRADE INTEGRATION TESTS
 *
 * These tests simulate the complete flow from webhook reception to database updates,
 * ensuring that tier upgrades work correctly across the entire system.
 *
 * CRITICAL: Tests validate that both userProfiles AND emailCaptures tables are
 * updated correctly, which was the source of the revenue protection bug.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db } from '../../server/db';
import { emailCaptures, userProfiles } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { registerStripeRoutes } from '../../server/routes/stripe';

// Sprint 16: Use vi.hoisted() so mock factory has access to these refs
// before vitest hoists vi.mock() above all top-level statements.
const { mockValidateWebhookSignature, mockGetTierFromPriceId, mockGetStripeCustomer } = vi.hoisted(
  () => ({
    mockValidateWebhookSignature: vi.fn(),
    mockGetTierFromPriceId: vi.fn(),
    mockGetStripeCustomer: vi.fn(),
  })
);

vi.mock('../../server/services/stripe', () => ({
  validateWebhookSignature: mockValidateWebhookSignature,
  getTierFromPriceId: mockGetTierFromPriceId,
  getStripeCustomer: mockGetStripeCustomer,
  createStripeCustomer: vi.fn(),
  createCheckoutSession: vi.fn(),
  createOneTimeCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
  getCustomerSubscriptions: vi.fn(),
  TIER_PRICES: {
    solo: { priceId: 'price_solo_123' },
    growth: { priceId: 'price_growth_456' },
    scale: { priceId: 'price_scale_789' },
  },
}));

/**
 * STATUS (LTM-ISS-22, 2026-08-05): these tests now RUN, and 5 of 6 FAIL against a
 * real postgres. They are no longer describe.skip'd and no longer hidden behind a
 * vague "contracts have drifted" note. They are excluded from the default vitest
 * config (see vitest.config.ts) because they need a live database, and reachable
 * via `npm run test:db`. They are deliberately NOT wired into CI yet, because a
 * failing step would turn CI red on every push.
 *
 * Verified against a real postgres 17, schema pushed with drizzle-kit. Diagnosis so
 * far, so the next person starts from here rather than from scratch:
 *
 *  - The solo test's payload sets metadata.paymentType='subscription' and
 *    productType='solo' but omits `session.subscription`. handleCheckoutCompleted
 *    (server/routes/stripe.ts:601) takes branch 1 only when paymentType==='one_time',
 *    and branch 2 only when session.subscription is truthy. This payload matches
 *    NEITHER, so no write happens and emailCaptures.tier stays 'starter'. A real
 *    Stripe subscription checkout always carries `subscription`, so this is an
 *    unrealistic fixture, not a handler bug.
 *  - The growth/scale tests DO set `subscription`, reach branch 2, return 200, and
 *    still leave userProfiles.subscriptionId null. That one is NOT explained yet:
 *    storage.updateUserProfile(userId, ...) is called with the fixture id
 *    'test-user-123' and appears not to persist. Establish whether updateUserProfile
 *    silently swallows a miss before assuming either side is correct.
 *
 * Do not "fix" these by relaxing the assertions. The contract they protect (a tier
 * change must update BOTH emailCaptures and userProfiles) is the revenue-protection
 * bug they were written for, and it is worth getting right.
 */
describe('Tier Upgrade Integration Tests', () => {
  let app: express.Application;
  let testEmailCaptureId: number;
  let testUserProfileId: string;

  beforeEach(async () => {
    // Setup test Express app with Stripe routes
    app = express();
    app.use(express.json());
    app.use(express.raw({ type: 'application/json' }));
    registerStripeRoutes(app);

    // Create test data
    const [emailCapture] = await db
      .insert(emailCaptures)
      .values({
        email: 'integration-test@example.com',
        tier: 'starter',
        websiteUrl: 'https://test.example.com',
      })
      .returning();
    testEmailCaptureId = emailCapture.id;

    const [userProfile] = await db
      .insert(userProfiles)
      .values({
        id: 'test-user-123',
        email: 'integration-test@example.com',
        tier: 'starter',
        creditsRemaining: 0,
      })
      .returning();
    testUserProfileId = userProfile.id;

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup test data
    await db.delete(emailCaptures).where(eq(emailCaptures.id, testEmailCaptureId));
    await db.delete(userProfiles).where(eq(userProfiles.id, testUserProfileId));
  });

  describe('Solo Tier Purchase Integration', () => {
    it('should update both emailCaptures and userProfiles for solo purchase', async () => {
      // Arrange
      const webhookPayload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {
              userId: testUserProfileId,
              paymentType: 'subscription',
              productType: 'solo',
              priceId: 'price_solo_123',
            },
            customer_details: {
              email: 'integration-test@example.com',
            },
            payment_intent: 'pi_integration_test',
          },
        },
      };

      mockValidateWebhookSignature.mockReturnValue(webhookPayload);

      // Act
      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test_signature')
        .send(JSON.stringify(webhookPayload));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });

      // Verify emailCaptures table was updated to Solo tier
      const updatedEmailCapture = await db
        .select()
        .from(emailCaptures)
        .where(eq(emailCaptures.id, testEmailCaptureId));

      expect(updatedEmailCapture[0].tier).toBe('solo');

      // Verify userProfiles table was updated to Solo tier
      const updatedUserProfile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, testUserProfileId));

      expect(updatedUserProfile[0].tier).toBe('solo');
    });
  });

  describe('Growth Subscription Integration', () => {
    it('should update both tables for growth subscription checkout', async () => {
      // Arrange
      const webhookPayload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {
              userId: testUserProfileId,
              priceId: 'price_growth_456',
            },
            customer_details: {
              email: 'integration-test@example.com',
            },
            subscription: 'sub_growth_test',
          },
        },
      };

      mockValidateWebhookSignature.mockReturnValue(webhookPayload);
      mockGetTierFromPriceId.mockReturnValue('growth');

      // Act
      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test_signature')
        .send(JSON.stringify(webhookPayload));

      // Assert
      expect(response.status).toBe(200);

      // CRITICAL: Verify emailCaptures table was updated to Growth tier
      const updatedEmailCapture = await db
        .select()
        .from(emailCaptures)
        .where(eq(emailCaptures.id, testEmailCaptureId));

      expect(updatedEmailCapture[0].tier).toBe('growth');

      // Verify userProfiles table was updated
      const updatedUserProfile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, testUserProfileId));

      expect(updatedUserProfile[0].subscriptionId).toBe('sub_growth_test');
      expect(updatedUserProfile[0].subscriptionStatus).toBe('active');
    });
  });

  describe('Scale Subscription Update Integration', () => {
    it('should update both tables when subscription tier changes', async () => {
      // Setup: First set user to Growth tier
      await db
        .update(emailCaptures)
        .set({ tier: 'growth' })
        .where(eq(emailCaptures.id, testEmailCaptureId));

      await db
        .update(userProfiles)
        .set({
          tier: 'growth',
          subscriptionId: 'sub_existing_growth',
          subscriptionStatus: 'active',
        })
        .where(eq(userProfiles.id, testUserProfileId));

      // Arrange upgrade to Scale
      const webhookPayload = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_existing_growth',
            customer: 'cus_test123',
            metadata: {
              userId: testUserProfileId,
            },
            items: {
              data: [
                {
                  price: {
                    id: 'price_scale_789',
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

      mockValidateWebhookSignature.mockReturnValue(webhookPayload);
      mockGetTierFromPriceId.mockReturnValue('scale');
      mockGetStripeCustomer.mockResolvedValue({
        email: 'integration-test@example.com',
      });

      // Act
      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test_signature')
        .send(JSON.stringify(webhookPayload));

      // Assert
      expect(response.status).toBe(200);

      // CRITICAL: Verify emailCaptures table was updated to Scale tier
      const updatedEmailCapture = await db
        .select()
        .from(emailCaptures)
        .where(eq(emailCaptures.id, testEmailCaptureId));

      expect(updatedEmailCapture[0].tier).toBe('scale');

      // Verify userProfiles table was updated
      const updatedUserProfile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, testUserProfileId));

      expect(updatedUserProfile[0].tier).toBe('scale');
    });
  });

  describe('Subscription Cancellation Integration', () => {
    it('should downgrade both tables to starter when subscription cancelled', async () => {
      // Setup: Set user to Scale tier
      await db
        .update(emailCaptures)
        .set({ tier: 'scale' })
        .where(eq(emailCaptures.id, testEmailCaptureId));

      await db
        .update(userProfiles)
        .set({
          tier: 'scale',
          subscriptionId: 'sub_to_cancel',
          subscriptionStatus: 'active',
        })
        .where(eq(userProfiles.id, testUserProfileId));

      // Arrange cancellation
      const webhookPayload = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_to_cancel',
            customer: 'cus_cancel123',
            metadata: {
              userId: testUserProfileId,
            },
          },
        },
      };

      mockValidateWebhookSignature.mockReturnValue(webhookPayload);
      mockGetStripeCustomer.mockResolvedValue({
        email: 'integration-test@example.com',
      });

      // Act
      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test_signature')
        .send(JSON.stringify(webhookPayload));

      // Assert
      expect(response.status).toBe(200);

      // CRITICAL: Verify emailCaptures table was downgraded to starter
      const updatedEmailCapture = await db
        .select()
        .from(emailCaptures)
        .where(eq(emailCaptures.id, testEmailCaptureId));

      expect(updatedEmailCapture[0].tier).toBe('starter');

      // Verify userProfiles table was downgraded
      const updatedUserProfile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, testUserProfileId));

      expect(updatedUserProfile[0].tier).toBe('starter');
      expect(updatedUserProfile[0].subscriptionStatus).toBe('cancelled');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid webhook signature gracefully', async () => {
      // Arrange
      mockValidateWebhookSignature.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      // Act
      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send(JSON.stringify({ type: 'test.event' }));

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid signature');

      // Verify no database changes were made
      const emailCapture = await db
        .select()
        .from(emailCaptures)
        .where(eq(emailCaptures.id, testEmailCaptureId));

      expect(emailCapture[0].tier).toBe('starter'); // Should remain unchanged
    });

    it('should continue processing even if emailCaptures update fails', async () => {
      // Arrange - Use invalid email to cause emailCaptures lookup to fail
      const webhookPayload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {
              userId: testUserProfileId,
              paymentType: 'subscription',
              productType: 'solo',
            },
            customer_details: {
              email: 'nonexistent@example.com', // Email not in database
            },
          },
        },
      };

      mockValidateWebhookSignature.mockReturnValue(webhookPayload);

      // Act
      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test_signature')
        .send(JSON.stringify(webhookPayload));

      // Assert
      expect(response.status).toBe(200);

      // Verify userProfiles was still updated (webhook processing continued)
      const updatedUserProfile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, testUserProfileId));

      expect(updatedUserProfile[0].tier).toBe('solo');
    });
  });
});
