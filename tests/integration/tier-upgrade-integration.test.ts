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

// Mock Stripe webhook signature validation
const mockValidateWebhookSignature = vi.fn();
const mockGetTierFromPriceId = vi.fn();
const mockGetStripeCustomer = vi.fn();

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
    coffee: { priceId: 'price_coffee_123' },
    growth: { priceId: 'price_growth_456' },
    scale: { priceId: 'price_scale_789' },
  },
}));

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

  describe('Coffee Tier Purchase Integration', () => {
    it('should update both emailCaptures and userProfiles for coffee purchase', async () => {
      // Arrange
      const webhookPayload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {
              userId: testUserProfileId,
              paymentType: 'one_time',
              productType: 'coffee',
              priceId: 'price_coffee_123',
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

      // Verify emailCaptures table was updated to Coffee tier
      const updatedEmailCapture = await db
        .select()
        .from(emailCaptures)
        .where(eq(emailCaptures.id, testEmailCaptureId));

      expect(updatedEmailCapture[0].tier).toBe('coffee');

      // Verify userProfiles table was updated to Coffee tier
      const updatedUserProfile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, testUserProfileId));

      expect(updatedUserProfile[0].tier).toBe('coffee');
      expect(updatedUserProfile[0].creditsRemaining).toBe(1);
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
              paymentType: 'one_time',
              productType: 'coffee',
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

      expect(updatedUserProfile[0].tier).toBe('coffee');
      expect(updatedUserProfile[0].creditsRemaining).toBe(1);
    });
  });
});
