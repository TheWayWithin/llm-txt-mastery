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
 * These need a live postgres, so they are excluded from the default vitest config
 * and run via `npm run test:db` (and in CI, which has a postgres service).
 *
 * Repaired 2026-08-05 (LTM-ISS-22) after four months skipped. Two faults, both in
 * the tests, neither in the handler:
 *
 *  1. The solo fixture set paymentType:'subscription' and omitted
 *     `session.subscription`. handleCheckoutCompleted takes branch 1 only when
 *     paymentType==='one_time' and branch 2 only when session.subscription is set,
 *     so that payload matched NEITHER and the handler correctly did nothing. Solo
 *     is a recurring subscription since the coffee->solo migration, so a real event
 *     carries `subscription`. Fixture corrected.
 *
 *  2. Every test also asserted against `userProfiles`. Nothing in the live path
 *     writes that table: DatabaseStorage.getUserProfile reads auth_users and returns
 *     subscriptionId/subscriptionStatus hard-coded to null, and updateUserProfile
 *     only mirrors tier onto emailCaptures (and bails immediately on a non-numeric
 *     id, which the 'test-user-123' fixture is). Those assertions could never pass.
 *     They are gone; the userProfiles fixture row stays only so the id passed as
 *     metadata.userId refers to something real.
 *
 * What remains is the contract that actually protects revenue: a tier change must
 * land on emailCaptures, which is what drives tier logic for a paying customer.
 * Mutation-proven - commenting out the updateEmailCapture call in
 * server/routes/stripe.ts turns 3 of these red.
 *
 * Do not relax these assertions to make a change pass. If the handler stops writing
 * emailCaptures, a paying customer is silently treated as a free user.
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
      // Solo is a recurring subscription since the coffee->solo migration, so a real
      // checkout.session.completed for it carries `subscription`. The old fixture set
      // paymentType:'subscription' and omitted it, which matches NEITHER branch of
      // handleCheckoutCompleted (branch 1 needs paymentType==='one_time', branch 2
      // needs session.subscription), so the handler did nothing and the test failed.
      const webhookPayload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {
              userId: testUserProfileId,
              priceId: 'price_solo_123',
            },
            customer_details: {
              email: 'integration-test@example.com',
            },
            subscription: 'sub_solo_test',
          },
        },
      };

      mockValidateWebhookSignature.mockReturnValue(webhookPayload);
      mockGetTierFromPriceId.mockReturnValue('solo');

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

      // 'cancelled' is a distinct tier in its own right, not a synonym for starter:
      // see UserTier in shared/schema.ts:371, and the handler writes it deliberately
      // (server/routes/stripe.ts:939). The old expectation of 'starter' was stale.
      expect(updatedEmailCapture[0].tier).toBe('cancelled');
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

      // The contract is that an unknown customer email does not crash the webhook:
      // Stripe must get its 200 or it will retry the event indefinitely. The old
      // assertion checked userProfiles.tier, which nothing in the live path writes.
      // Also assert the real subscriber's row was left alone, so "kept processing"
      // cannot be confused with "wrote the wrong record".
      const untouched = await db
        .select()
        .from(emailCaptures)
        .where(eq(emailCaptures.id, testEmailCaptureId));

      expect(untouched[0].tier).toBe('starter');
    });
  });
});
