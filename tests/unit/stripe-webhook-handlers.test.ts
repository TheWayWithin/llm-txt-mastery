/**
 * CRITICAL TIER UPGRADE VALIDATION TESTS
 *
 * These tests validate the fixes for tier upgrade webhooks that were causing
 * revenue protection failures. The core issue was webhook handlers only updating
 * userProfiles table but not emailCaptures table, causing getUserTier() to return
 * wrong tier information.
 *
 * BUSINESS IMPACT: Without these fixes, paid customers could be treated as free users,
 * causing revenue loss and customer dissatisfaction.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import type { IStorage } from '../../server/storage';

// Mock Stripe service functions
const mockGetStripeCustomer = vi.fn();
const mockGetTierFromPriceId = vi.fn();
const mockValidateWebhookSignature = vi.fn();

vi.mock('../../server/services/stripe', () => ({
  getStripeCustomer: mockGetStripeCustomer,
  getTierFromPriceId: mockGetTierFromPriceId,
  validateWebhookSignature: mockValidateWebhookSignature,
  TIER_PRICES: {
    solo: { priceId: 'price_solo_123' },
    growth: { priceId: 'price_growth_456' },
    scale: { priceId: 'price_scale_789' },
  },
}));

// Mock storage
const mockStorage: IStorage = {
  getEmailCapture: vi.fn(),
  updateEmailCapture: vi.fn(),
  createEmailCapture: vi.fn(),
  updateUserProfile: vi.fn(),
  getUserProfile: vi.fn(),
  createOneTimeCredit: vi.fn(),
  createPaymentHistory: vi.fn(),
  // Add other required methods as no-op mocks
  getUser: vi.fn(),
  getUserByUsername: vi.fn(),
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  getAnalysisByUrl: vi.fn(),
  createAnalysis: vi.fn(),
  getAnalysis: vi.fn(),
  updateAnalysis: vi.fn(),
  createLlmFile: vi.fn(),
  getLlmFile: vi.fn(),
  createSubscription: vi.fn(),
  getSubscription: vi.fn(),
  getSubscriptionByStripeId: vi.fn(),
  updateSubscription: vi.fn(),
  getPaymentHistory: vi.fn(),
  createOrUpdateUsage: vi.fn(),
  getUsageByDate: vi.fn(),
  createCacheEntry: vi.fn(),
  getCacheEntry: vi.fn(),
  updateCacheHitCount: vi.fn(),
  createUserProfile: vi.fn(),
  getUserProfileByEmail: vi.fn(),
  getUserCredits: vi.fn(),
  consumeCredit: vi.fn(),
  deleteAnalysesForUser: vi.fn(),
  deleteLlmFilesForUser: vi.fn(),
  deleteUsageForUser: vi.fn(),
};

vi.mock('../../server/storage', () => ({
  storage: mockStorage,
}));

// Mock auth storage
const mockAuthStorage = {
  getUserByEmail: vi.fn(),
  updateUser: vi.fn(),
  createUser: vi.fn(),
};

vi.mock('../../server/services/auth-storage', () => ({
  authStorage: mockAuthStorage,
}));

vi.mock('../../server/services/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
}));

describe('Stripe Webhook Handlers - Tier Upgrade Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleCheckoutCompleted', () => {
    it('should update emailCaptures table for solo tier purchases', async () => {
      // Arrange
      const mockSession = {
        metadata: {
          userId: '123',
          paymentType: 'subscription',
          productType: 'solo',
          priceId: 'price_solo_123',
        },
        customer_details: {
          email: 'test@example.com',
        },
        payment_intent: 'pi_test123',
      };

      (mockStorage.getEmailCapture as Mock).mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        tier: 'starter',
      });

      (mockStorage.getUserProfile as Mock).mockResolvedValue({
        tier: 'starter',
      });

      // Import the handler function dynamically
      const { handleCheckoutCompleted } = await import('./test-webhook-handlers');

      // Act
      await handleCheckoutCompleted(mockSession);

      // Assert - CRITICAL: emailCaptures must be updated to Solo tier
      expect(mockStorage.updateEmailCapture).toHaveBeenCalledWith('test@example.com', {
        tier: 'solo',
      });

      // Verify userProfiles is also updated
      expect(mockStorage.updateUserProfile).toHaveBeenCalledWith('123', {
        tier: 'solo',
        subscriptionId: expect.any(String),
        subscriptionStatus: 'active',
      });
    });

    it('should update emailCaptures table for subscription checkouts', async () => {
      // Arrange
      const mockSession = {
        metadata: {
          userId: '456',
          priceId: 'price_growth_456',
        },
        customer_details: {
          email: 'growth@example.com',
        },
        subscription: 'sub_test456',
      };

      mockGetTierFromPriceId.mockReturnValue('growth');

      (mockStorage.getEmailCapture as Mock).mockResolvedValue({
        id: 2,
        email: 'growth@example.com',
        tier: 'starter',
      });

      const { handleCheckoutCompleted } = await import('./test-webhook-handlers');

      // Act
      await handleCheckoutCompleted(mockSession);

      // Assert - CRITICAL: emailCaptures must be updated to Growth tier
      expect(mockStorage.updateEmailCapture).toHaveBeenCalledWith('growth@example.com', {
        tier: 'growth',
      });

      // Verify userProfiles subscription is created
      expect(mockStorage.updateUserProfile).toHaveBeenCalledWith('456', {
        subscriptionId: 'sub_test456',
        subscriptionStatus: 'active',
      });
    });

    it('should create new emailCapture if none exists for subscription', async () => {
      // Arrange
      const mockSession = {
        metadata: {
          userId: '789',
          priceId: 'price_scale_789',
        },
        customer_details: {
          email: 'scale@example.com',
        },
        subscription: 'sub_test789',
      };

      mockGetTierFromPriceId.mockReturnValue('scale');

      (mockStorage.getEmailCapture as Mock).mockResolvedValue(null); // No existing record

      const { handleCheckoutCompleted } = await import('./test-webhook-handlers');

      // Act
      await handleCheckoutCompleted(mockSession);

      // Assert - CRITICAL: New emailCapture must be created with Scale tier
      expect(mockStorage.createEmailCapture).toHaveBeenCalledWith({
        email: 'scale@example.com',
        tier: 'scale',
        websiteUrl: null,
      });
    });

    it('should handle missing email gracefully', async () => {
      // Arrange
      const mockSession = {
        metadata: {
          userId: '999',
          paymentType: 'subscription',
          productType: 'solo',
        },
        // No customer_details or customer_email
      };

      const { handleCheckoutCompleted } = await import('./test-webhook-handlers');

      // Act & Assert - Should not throw error
      await expect(handleCheckoutCompleted(mockSession)).resolves.not.toThrow();

      // emailCaptures should not be called without email
      expect(mockStorage.updateEmailCapture).not.toHaveBeenCalled();
      expect(mockStorage.createEmailCapture).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionUpdate', () => {
    it('should update emailCaptures table when subscription tier changes', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub_updated123',
        customer: 'cus_test123',
        metadata: {
          userId: '456',
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
      };

      mockGetTierFromPriceId.mockReturnValue('scale');
      mockGetStripeCustomer.mockResolvedValue({
        email: 'upgrade@example.com',
      });

      (mockStorage.getEmailCapture as Mock).mockResolvedValue({
        id: 3,
        email: 'upgrade@example.com',
        tier: 'growth',
      });

      const { handleSubscriptionUpdate } = await import('./test-webhook-handlers');

      // Act
      await handleSubscriptionUpdate(mockSubscription);

      // Assert - CRITICAL: emailCaptures must be updated to new tier
      expect(mockStorage.updateEmailCapture).toHaveBeenCalledWith('upgrade@example.com', {
        tier: 'scale',
      });

      // Verify userProfiles is updated
      expect(mockStorage.updateUserProfile).toHaveBeenCalledWith('456', {
        tier: 'scale',
        subscriptionId: 'sub_updated123',
        subscriptionStatus: 'active',
      });

      // Verify payment history is created
      expect(mockStorage.createPaymentHistory).toHaveBeenCalledWith({
        userId: '456',
        stripeSubscriptionId: 'sub_updated123',
        amount: 9900,
        currency: 'usd',
        status: 'paid',
        tier: 'scale',
      });
    });

    it('should create new emailCapture if customer not found in database', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub_new123',
        customer: 'cus_new123',
        metadata: {
          userId: '999',
        },
        items: {
          data: [
            {
              price: {
                id: 'price_growth_456',
              },
            },
          ],
        },
        status: 'active',
      };

      mockGetTierFromPriceId.mockReturnValue('growth');
      mockGetStripeCustomer.mockResolvedValue({
        email: 'newcustomer@example.com',
      });

      (mockStorage.getEmailCapture as Mock).mockResolvedValue(null); // No existing record

      const { handleSubscriptionUpdate } = await import('./test-webhook-handlers');

      // Act
      await handleSubscriptionUpdate(mockSubscription);

      // Assert - CRITICAL: New emailCapture must be created
      expect(mockStorage.createEmailCapture).toHaveBeenCalledWith({
        email: 'newcustomer@example.com',
        tier: 'growth',
        websiteUrl: null,
      });
    });

    it('should handle Stripe customer lookup failure gracefully', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub_error123',
        customer: 'cus_error123',
        metadata: {
          userId: '888',
        },
        items: {
          data: [
            {
              price: {
                id: 'price_growth_456',
              },
            },
          ],
        },
        status: 'active',
      };

      mockGetTierFromPriceId.mockReturnValue('growth');
      mockGetStripeCustomer.mockRejectedValue(new Error('Customer not found'));

      const { handleSubscriptionUpdate } = await import('./test-webhook-handlers');

      // Act & Assert - Should not throw error
      await expect(handleSubscriptionUpdate(mockSubscription)).resolves.not.toThrow();

      // userProfiles should still be updated
      expect(mockStorage.updateUserProfile).toHaveBeenCalledWith('888', {
        tier: 'growth',
        subscriptionId: 'sub_error123',
        subscriptionStatus: 'active',
      });
    });
  });

  describe('handleSubscriptionCancelled', () => {
    it('should downgrade emailCaptures tier to starter when subscription cancelled', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub_cancelled123',
        customer: 'cus_cancelled123',
        metadata: {
          userId: '777',
        },
      };

      mockGetStripeCustomer.mockResolvedValue({
        email: 'cancelled@example.com',
      });

      (mockStorage.getEmailCapture as Mock).mockResolvedValue({
        id: 4,
        email: 'cancelled@example.com',
        tier: 'scale',
      });

      const { handleSubscriptionCancelled } = await import('./test-webhook-handlers');

      // Act
      await handleSubscriptionCancelled(mockSubscription);

      // Assert - CRITICAL: emailCaptures must be downgraded to starter
      expect(mockStorage.updateEmailCapture).toHaveBeenCalledWith('cancelled@example.com', {
        tier: 'starter',
      });

      // Verify userProfiles is downgraded
      expect(mockStorage.updateUserProfile).toHaveBeenCalledWith('777', {
        tier: 'starter',
        subscriptionStatus: 'cancelled',
      });
    });

    it('should handle cancellation even if emailCapture lookup fails', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub_cancelled456',
        customer: 'cus_cancelled456',
        metadata: {
          userId: '666',
        },
      };

      mockGetStripeCustomer.mockRejectedValue(new Error('Customer lookup failed'));

      const { handleSubscriptionCancelled } = await import('./test-webhook-handlers');

      // Act & Assert - Should not throw error
      await expect(handleSubscriptionCancelled(mockSubscription)).resolves.not.toThrow();

      // userProfiles should still be downgraded
      expect(mockStorage.updateUserProfile).toHaveBeenCalledWith('666', {
        tier: 'starter',
        subscriptionStatus: 'cancelled',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in checkout completion', async () => {
      // Arrange
      const mockSession = {
        metadata: {
          userId: '500',
          paymentType: 'one_time',
          productType: 'coffee',
        },
        customer_details: {
          email: 'error@example.com',
        },
      };

      (mockStorage.updateEmailCapture as Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const { handleCheckoutCompleted } = await import('./test-webhook-handlers');

      // Act & Assert - Should not throw error, should log and continue
      await expect(handleCheckoutCompleted(mockSession)).resolves.not.toThrow();
    });

    it('should handle missing userId in webhook metadata', async () => {
      // Arrange
      const mockSession = {
        metadata: {
          // Missing userId
          paymentType: 'one_time',
          productType: 'coffee',
        },
        customer_details: {
          email: 'nouserid@example.com',
        },
      };

      const { handleCheckoutCompleted } = await import('./test-webhook-handlers');

      // Act & Assert - Should return early without processing
      await expect(handleCheckoutCompleted(mockSession)).resolves.not.toThrow();

      // No storage operations should be called
      expect(mockStorage.updateEmailCapture).not.toHaveBeenCalled();
      expect(mockStorage.updateUserProfile).not.toHaveBeenCalled();
    });
  });
});
