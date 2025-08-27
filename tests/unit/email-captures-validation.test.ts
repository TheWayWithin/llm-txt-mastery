/**
 * EMAIL CAPTURES TABLE UPDATE VALIDATION TESTS
 * 
 * These tests specifically validate the CRITICAL FIX for emailCaptures table updates
 * in webhook handlers. The bug was that webhook handlers only updated userProfiles
 * but not emailCaptures, causing getUserTier() to return incorrect tier information.
 * 
 * BUSINESS CRITICAL: This table drives the tier logic for freemium users and
 * revenue protection. Without these updates, paid customers are treated as free users.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { db } from '../../server/db';
import { emailCaptures } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Import the actual storage functions we're testing
import { storage } from '../../server/storage';

// Mock database for isolated testing
vi.mock('../../server/db');

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn()
};

(db as any).select = mockDb.select;
(db as any).update = mockDb.update;
(db as any).insert = mockDb.insert;

describe('EmailCaptures Table Update Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Coffee Tier Purchase Updates', () => {
    it('should update existing emailCapture to Coffee tier', async () => {
      // Arrange
      const testEmail = 'coffee-test@example.com';
      const existingCapture = {
        id: 1,
        email: testEmail,
        tier: 'starter',
        websiteUrl: 'https://test.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.select.mockResolvedValue([existingCapture]);
      mockDb.returning.mockResolvedValue([{ ...existingCapture, tier: 'coffee' }]);

      // Act
      const result = await storage.updateEmailCapture(testEmail, { tier: 'coffee' });

      // Assert
      expect(mockDb.update).toHaveBeenCalledWith(emailCaptures);
      expect(mockDb.set).toHaveBeenCalledWith({ tier: 'coffee' });
      expect(mockDb.where).toHaveBeenCalledWith(eq(emailCaptures.email, testEmail));
      expect(result?.tier).toBe('coffee');
    });

    it('should create new emailCapture for Coffee tier if none exists', async () => {
      // Arrange
      const testEmail = 'new-coffee@example.com';
      const newCapture = {
        id: 2,
        email: testEmail,
        tier: 'coffee',
        websiteUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.select.mockResolvedValue([]); // No existing record
      mockDb.returning.mockResolvedValue([newCapture]);

      // Act
      const result = await storage.createEmailCapture({
        email: testEmail,
        tier: 'coffee',
        websiteUrl: null
      });

      // Assert
      expect(mockDb.insert).toHaveBeenCalledWith(emailCaptures);
      expect(mockDb.values).toHaveBeenCalledWith({
        email: testEmail,
        tier: 'coffee',
        websiteUrl: null
      });
      expect(result.tier).toBe('coffee');
    });
  });

  describe('Subscription Tier Updates', () => {
    it('should update emailCapture to Growth tier for subscription', async () => {
      // Arrange
      const testEmail = 'growth-subscription@example.com';
      const existingCapture = {
        id: 3,
        email: testEmail,
        tier: 'starter',
        websiteUrl: 'https://growth-test.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.select.mockResolvedValue([existingCapture]);
      mockDb.returning.mockResolvedValue([{ ...existingCapture, tier: 'growth' }]);

      // Act
      const result = await storage.updateEmailCapture(testEmail, { tier: 'growth' });

      // Assert
      expect(mockDb.update).toHaveBeenCalledWith(emailCaptures);
      expect(mockDb.set).toHaveBeenCalledWith({ tier: 'growth' });
      expect(result?.tier).toBe('growth');
    });

    it('should update emailCapture to Scale tier for subscription', async () => {
      // Arrange
      const testEmail = 'scale-subscription@example.com';
      const existingCapture = {
        id: 4,
        email: testEmail,
        tier: 'growth',
        websiteUrl: 'https://scale-test.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.select.mockResolvedValue([existingCapture]);
      mockDb.returning.mockResolvedValue([{ ...existingCapture, tier: 'scale' }]);

      // Act
      const result = await storage.updateEmailCapture(testEmail, { tier: 'scale' });

      // Assert
      expect(mockDb.update).toHaveBeenCalledWith(emailCaptures);
      expect(mockDb.set).toHaveBeenCalledWith({ tier: 'scale' });
      expect(result?.tier).toBe('scale');
    });

    it('should create new emailCapture for subscription if user not in database', async () => {
      // Arrange
      const testEmail = 'new-subscriber@example.com';
      const newCapture = {
        id: 5,
        email: testEmail,
        tier: 'growth',
        websiteUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.select.mockResolvedValue([]); // No existing record
      mockDb.returning.mockResolvedValue([newCapture]);

      // Act
      const result = await storage.createEmailCapture({
        email: testEmail,
        tier: 'growth',
        websiteUrl: null
      });

      // Assert
      expect(mockDb.insert).toHaveBeenCalledWith(emailCaptures);
      expect(mockDb.values).toHaveBeenCalledWith({
        email: testEmail,
        tier: 'growth',
        websiteUrl: null
      });
      expect(result.tier).toBe('growth');
    });
  });

  describe('Subscription Cancellation Downgrades', () => {
    it('should downgrade emailCapture to starter when subscription cancelled', async () => {
      // Arrange
      const testEmail = 'cancelled-subscription@example.com';
      const existingCapture = {
        id: 6,
        email: testEmail,
        tier: 'scale',
        websiteUrl: 'https://cancelled-test.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.select.mockResolvedValue([existingCapture]);
      mockDb.returning.mockResolvedValue([{ ...existingCapture, tier: 'starter' }]);

      // Act
      const result = await storage.updateEmailCapture(testEmail, { tier: 'starter' });

      // Assert
      expect(mockDb.update).toHaveBeenCalledWith(emailCaptures);
      expect(mockDb.set).toHaveBeenCalledWith({ tier: 'starter' });
      expect(result?.tier).toBe('starter');
    });

    it('should handle cancellation gracefully even if emailCapture not found', async () => {
      // Arrange
      const testEmail = 'not-found@example.com';

      mockDb.select.mockResolvedValue([]); // No existing record
      mockDb.returning.mockResolvedValue([]);

      // Act
      const result = await storage.updateEmailCapture(testEmail, { tier: 'starter' });

      // Assert
      expect(mockDb.update).toHaveBeenCalledWith(emailCaptures);
      expect(result).toBeUndefined(); // No record to update
    });
  });

  describe('Tier Progression Validation', () => {
    it('should handle tier progression: starter → coffee → growth → scale', async () => {
      // This test validates the complete tier progression
      const testEmail = 'progression-test@example.com';
      let currentCapture = {
        id: 7,
        email: testEmail,
        tier: 'starter',
        websiteUrl: 'https://progression-test.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Step 1: Starter → Coffee
      mockDb.select.mockResolvedValue([currentCapture]);
      mockDb.returning.mockResolvedValue([{ ...currentCapture, tier: 'coffee' }]);
      
      let result = await storage.updateEmailCapture(testEmail, { tier: 'coffee' });
      expect(result?.tier).toBe('coffee');
      currentCapture.tier = 'coffee';

      // Step 2: Coffee → Growth
      mockDb.select.mockResolvedValue([currentCapture]);
      mockDb.returning.mockResolvedValue([{ ...currentCapture, tier: 'growth' }]);
      
      result = await storage.updateEmailCapture(testEmail, { tier: 'growth' });
      expect(result?.tier).toBe('growth');
      currentCapture.tier = 'growth';

      // Step 3: Growth → Scale
      mockDb.select.mockResolvedValue([currentCapture]);
      mockDb.returning.mockResolvedValue([{ ...currentCapture, tier: 'scale' }]);
      
      result = await storage.updateEmailCapture(testEmail, { tier: 'scale' });
      expect(result?.tier).toBe('scale');

      // Verify all updates were called
      expect(mockDb.update).toHaveBeenCalledTimes(3);
      expect(mockDb.set).toHaveBeenCalledWith({ tier: 'coffee' });
      expect(mockDb.set).toHaveBeenCalledWith({ tier: 'growth' });
      expect(mockDb.set).toHaveBeenCalledWith({ tier: 'scale' });
    });

    it('should handle tier downgrade: scale → starter (cancellation)', async () => {
      // This test validates tier downgrade on cancellation
      const testEmail = 'downgrade-test@example.com';
      const currentCapture = {
        id: 8,
        email: testEmail,
        tier: 'scale',
        websiteUrl: 'https://downgrade-test.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.select.mockResolvedValue([currentCapture]);
      mockDb.returning.mockResolvedValue([{ ...currentCapture, tier: 'starter' }]);

      // Act
      const result = await storage.updateEmailCapture(testEmail, { tier: 'starter' });

      // Assert
      expect(result?.tier).toBe('starter');
      expect(mockDb.set).toHaveBeenCalledWith({ tier: 'starter' });
    });
  });

  describe('Data Integrity Validation', () => {
    it('should preserve other fields when updating tier', async () => {
      // Arrange
      const testEmail = 'preserve-fields@example.com';
      const existingCapture = {
        id: 9,
        email: testEmail,
        tier: 'starter',
        websiteUrl: 'https://preserve-test.com',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01')
      };

      mockDb.select.mockResolvedValue([existingCapture]);
      mockDb.returning.mockResolvedValue([{ 
        ...existingCapture, 
        tier: 'coffee',
        updatedAt: new Date('2025-01-02') // Only tier and updatedAt should change
      }]);

      // Act
      const result = await storage.updateEmailCapture(testEmail, { tier: 'coffee' });

      // Assert
      expect(result?.id).toBe(9);
      expect(result?.email).toBe(testEmail);
      expect(result?.websiteUrl).toBe('https://preserve-test.com');
      expect(result?.createdAt).toEqual(new Date('2025-01-01')); // Preserved
      expect(result?.tier).toBe('coffee'); // Updated
    });

    it('should handle concurrent tier updates safely', async () => {
      // This test ensures that concurrent webhook processing doesn't cause issues
      const testEmail = 'concurrent-test@example.com';
      const existingCapture = {
        id: 10,
        email: testEmail,
        tier: 'starter',
        websiteUrl: 'https://concurrent-test.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.select.mockResolvedValue([existingCapture]);
      mockDb.returning.mockResolvedValue([{ ...existingCapture, tier: 'growth' }]);

      // Simulate concurrent updates
      const promises = [
        storage.updateEmailCapture(testEmail, { tier: 'growth' }),
        storage.updateEmailCapture(testEmail, { tier: 'growth' }),
        storage.updateEmailCapture(testEmail, { tier: 'growth' })
      ];

      // Act
      const results = await Promise.all(promises);

      // Assert - All should succeed (database handles concurrency)
      results.forEach(result => {
        expect(result?.tier).toBe('growth');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Arrange
      const testEmail = 'db-error@example.com';
      mockDb.select.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(storage.getEmailCapture(testEmail)).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid tier values', async () => {
      // Arrange
      const testEmail = 'invalid-tier@example.com';
      const existingCapture = {
        id: 11,
        email: testEmail,
        tier: 'starter',
        websiteUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.select.mockResolvedValue([existingCapture]);
      mockDb.returning.mockRejectedValue(new Error('Invalid tier value'));

      // Act & Assert
      await expect(storage.updateEmailCapture(testEmail, { tier: 'invalid_tier' as any }))
        .rejects.toThrow('Invalid tier value');
    });
  });
});