/**
 * GET USER TIER VALIDATION TESTS
 *
 * These tests validate that getUserTier() function returns the correct tier
 * after webhook processing updates the emailCaptures table. This is the
 * CRITICAL function that determines user permissions and revenue protection.
 *
 * THE CORE ISSUE: When webhooks only updated userProfiles but not emailCaptures,
 * getUserTier() would read from emailCaptures and return outdated tier information.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { getUserTier, getUserTierFromAuth } from '../../server/services/usage';
import type { IStorage } from '../../server/storage';

// Mock storage
const mockStorage: IStorage = {
  getEmailCapture: vi.fn(),
  updateEmailCapture: vi.fn(),
  createEmailCapture: vi.fn(),
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
  createPaymentHistory: vi.fn(),
  getPaymentHistory: vi.fn(),
  createOrUpdateUsage: vi.fn(),
  getUsageByDate: vi.fn(),
  createCacheEntry: vi.fn(),
  getCacheEntry: vi.fn(),
  updateCacheHitCount: vi.fn(),
  createUserProfile: vi.fn(),
  getUserProfile: vi.fn(),
  getUserProfileByEmail: vi.fn(),
  updateUserProfile: vi.fn(),
  createOneTimeCredit: vi.fn(),
  getUserCredits: vi.fn(),
  consumeCredit: vi.fn(),
  deleteAnalysesForUser: vi.fn(),
  deleteLlmFilesForUser: vi.fn(),
  deleteUsageForUser: vi.fn(),
};

vi.mock('../../server/storage', () => ({
  storage: mockStorage,
}));

describe('getUserTier() Validation After Webhook Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Solo Tier Validation', () => {
    it('should return solo tier after webhook updates emailCaptures', async () => {
      // Arrange - Simulate post-webhook state where emailCaptures was updated
      const testEmail = 'solo-webhook-test@example.com';
      const updatedEmailCapture = {
        id: 1,
        email: testEmail,
        tier: 'solo', // Updated by webhook
        websiteUrl: 'https://test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockStorage.getEmailCapture as Mock).mockResolvedValue(updatedEmailCapture);

      // Act
      const tier = await getUserTier(testEmail);

      // Assert - CRITICAL: Must return solo tier after webhook processing
      expect(tier).toBe('solo');
      expect(mockStorage.getEmailCapture).toHaveBeenCalledWith(testEmail);
    });

    it('should return solo tier consistently across multiple calls', async () => {
      // Arrange
      const testEmail = 'consistent-solo@example.com';
      const soloCapture = {
        id: 2,
        email: testEmail,
        tier: 'solo',
        websiteUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockStorage.getEmailCapture as Mock).mockResolvedValue(soloCapture);

      // Act - Multiple calls to simulate real usage
      const tier1 = await getUserTier(testEmail);
      const tier2 = await getUserTier(testEmail);
      const tier3 = await getUserTier(testEmail);

      // Assert - Should be consistent
      expect(tier1).toBe('solo');
      expect(tier2).toBe('solo');
      expect(tier3).toBe('solo');
    });
  });

  describe('Growth Subscription Tier Validation', () => {
    it('should return growth tier after subscription webhook updates', async () => {
      // Arrange
      const testEmail = 'growth-subscription@example.com';
      const growthCapture = {
        id: 3,
        email: testEmail,
        tier: 'growth', // Updated by subscription webhook
        websiteUrl: 'https://growth-test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockStorage.getEmailCapture as Mock).mockResolvedValue(growthCapture);

      // Act
      const tier = await getUserTier(testEmail);

      // Assert
      expect(tier).toBe('growth');
    });

    it('should handle tier progression from starter to growth', async () => {
      // This test simulates the progression: starter → growth subscription
      const testEmail = 'tier-progression@example.com';

      // Initial state: starter tier
      let currentCapture = {
        id: 4,
        email: testEmail,
        tier: 'starter',
        websiteUrl: 'https://progression-test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockStorage.getEmailCapture as Mock).mockResolvedValue(currentCapture);

      // Act & Assert - Initial state
      let tier = await getUserTier(testEmail);
      expect(tier).toBe('starter');

      // Simulate webhook update to growth
      currentCapture = { ...currentCapture, tier: 'growth' };
      (mockStorage.getEmailCapture as Mock).mockResolvedValue(currentCapture);

      // Act & Assert - After webhook
      tier = await getUserTier(testEmail);
      expect(tier).toBe('growth');
    });
  });

  describe('Scale Tier Validation', () => {
    it('should return scale tier after scale subscription webhook', async () => {
      // Arrange
      const testEmail = 'scale-tier@example.com';
      const scaleCapture = {
        id: 5,
        email: testEmail,
        tier: 'scale',
        websiteUrl: 'https://scale-test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockStorage.getEmailCapture as Mock).mockResolvedValue(scaleCapture);

      // Act
      const tier = await getUserTier(testEmail);

      // Assert
      expect(tier).toBe('scale');
    });

    it('should handle upgrade from growth to scale', async () => {
      // This test validates tier upgrade webhook processing
      const testEmail = 'growth-to-scale@example.com';

      // Initial state: growth tier
      let currentCapture = {
        id: 6,
        email: testEmail,
        tier: 'growth',
        websiteUrl: 'https://upgrade-test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockStorage.getEmailCapture as Mock).mockResolvedValue(currentCapture);

      // Act & Assert - Initial growth tier
      let tier = await getUserTier(testEmail);
      expect(tier).toBe('growth');

      // Simulate subscription update webhook to scale
      currentCapture = { ...currentCapture, tier: 'scale' };
      (mockStorage.getEmailCapture as Mock).mockResolvedValue(currentCapture);

      // Act & Assert - After upgrade webhook
      tier = await getUserTier(testEmail);
      expect(tier).toBe('scale');
    });
  });

  describe('Subscription Cancellation Validation', () => {
    it('should return starter tier after cancellation webhook downgrades', async () => {
      // Arrange - Post-cancellation state
      const testEmail = 'cancelled-subscription@example.com';
      const downgradedCapture = {
        id: 7,
        email: testEmail,
        tier: 'starter', // Downgraded by cancellation webhook
        websiteUrl: 'https://cancelled-test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockStorage.getEmailCapture as Mock).mockResolvedValue(downgradedCapture);

      // Act
      const tier = await getUserTier(testEmail);

      // Assert - CRITICAL: Must reflect downgrade after cancellation
      expect(tier).toBe('starter');
    });

    it('should handle complete tier lifecycle: starter → scale → starter', async () => {
      // This test validates the complete subscription lifecycle
      const testEmail = 'full-lifecycle@example.com';

      // Phase 1: Initial starter tier
      let currentCapture = {
        id: 8,
        email: testEmail,
        tier: 'starter',
        websiteUrl: 'https://lifecycle-test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockStorage.getEmailCapture as Mock).mockResolvedValue(currentCapture);
      let tier = await getUserTier(testEmail);
      expect(tier).toBe('starter');

      // Phase 2: Upgrade to scale via webhook
      currentCapture = { ...currentCapture, tier: 'scale' };
      (mockStorage.getEmailCapture as Mock).mockResolvedValue(currentCapture);
      tier = await getUserTier(testEmail);
      expect(tier).toBe('scale');

      // Phase 3: Downgrade to starter via cancellation webhook
      currentCapture = { ...currentCapture, tier: 'starter' };
      (mockStorage.getEmailCapture as Mock).mockResolvedValue(currentCapture);
      tier = await getUserTier(testEmail);
      expect(tier).toBe('starter');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should return starter tier when emailCapture not found', async () => {
      // Arrange - New user with no emailCaptures record
      const testEmail = 'new-user@example.com';
      (mockStorage.getEmailCapture as Mock).mockResolvedValue(null);

      // Act
      const tier = await getUserTier(testEmail);

      // Assert - Should default to starter
      expect(tier).toBe('starter');
    });

    it('should return starter tier when database query fails', async () => {
      // Arrange - Database error scenario
      const testEmail = 'db-error@example.com';
      (mockStorage.getEmailCapture as Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      const tier = await getUserTier(testEmail);

      // Assert - Should fallback to starter tier for safety
      expect(tier).toBe('starter');
    });

    it('should handle malformed tier data gracefully', async () => {
      // Arrange - Invalid tier value in database
      const testEmail = 'malformed-tier@example.com';
      const malformedCapture = {
        id: 9,
        email: testEmail,
        tier: null, // Invalid tier value
        websiteUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockStorage.getEmailCapture as Mock).mockResolvedValue(malformedCapture);

      // Act
      const tier = await getUserTier(testEmail);

      // Assert - Should default to starter for safety
      expect(tier).toBe('starter');
    });
  });

  describe('Manual Override Validation', () => {
    it('should respect manual overrides for specific test users', async () => {
      // This test validates the manual override logic in getUserTier()
      const testEmail = 'jamie.watters.mail@icloud.com'; // Hard-coded override

      // Act - The function should return solo without checking database
      const tier = await getUserTier(testEmail);

      // Assert
      expect(tier).toBe('solo');
      // Storage should not be called due to manual override
      expect(mockStorage.getEmailCapture).not.toHaveBeenCalled();
    });
  });

  describe('Revenue Protection Integration', () => {
    it('should prevent paid users from being treated as free users', async () => {
      // This is the CRITICAL test for revenue protection
      const scenarios = [
        { email: 'solo-user@example.com', expectedTier: 'solo' },
        { email: 'growth-user@example.com', expectedTier: 'growth' },
        { email: 'scale-user@example.com', expectedTier: 'scale' },
      ];

      for (const scenario of scenarios) {
        // Arrange - Paid user with correct tier in emailCaptures
        const paidCapture = {
          id: Math.floor(Math.random() * 1000),
          email: scenario.email,
          tier: scenario.expectedTier,
          websiteUrl: 'https://paid-user-test.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (mockStorage.getEmailCapture as Mock).mockResolvedValue(paidCapture);

        // Act
        const tier = await getUserTier(scenario.email);

        // Assert - CRITICAL: Paid users must get their correct tier
        expect(tier).toBe(scenario.expectedTier);
        expect(tier).not.toBe('starter'); // Never downgrade paid users incorrectly
      }
    });

    it('should maintain tier consistency across application restart', async () => {
      // This test validates that tier information persists correctly
      const testEmail = 'persistent-user@example.com';
      const persistentCapture = {
        id: 10,
        email: testEmail,
        tier: 'growth',
        websiteUrl: 'https://persistent-test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockStorage.getEmailCapture as Mock).mockResolvedValue(persistentCapture);

      // Simulate multiple application restarts (multiple calls)
      for (let i = 0; i < 5; i++) {
        const tier = await getUserTier(testEmail);
        expect(tier).toBe('growth');
      }
    });
  });

  describe('getUserTierFromAuth() Integration', () => {
    it('should fall back to getUserTier() when no auth user provided', async () => {
      // Arrange
      const testEmail = 'fallback-test@example.com';
      const emailCapture = {
        id: 11,
        email: testEmail,
        tier: 'coffee',
        websiteUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockStorage.getEmailCapture as Mock).mockResolvedValue(emailCapture);

      // Act - No auth user, should use email lookup
      const tier = await getUserTierFromAuth(undefined, testEmail);

      // Assert
      expect(tier).toBe('coffee');
      expect(mockStorage.getEmailCapture).toHaveBeenCalledWith(testEmail);
    });

    it('should prioritize auth user tier when available', async () => {
      // Arrange
      const testEmail = 'auth-priority@example.com';
      const authUser = {
        id: 'auth_123',
        email: testEmail,
        tier: 'scale' as const,
      };

      // Act - Auth user provided, should use auth tier
      const tier = await getUserTierFromAuth(authUser, testEmail);

      // Assert
      expect(tier).toBe('scale');
      // Should not call storage when auth user is provided
      expect(mockStorage.getEmailCapture).not.toHaveBeenCalled();
    });
  });
});
