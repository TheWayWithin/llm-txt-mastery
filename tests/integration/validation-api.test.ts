/**
 * Validation API Integration Tests
 *
 * Comprehensive test suite for POST /api/validate-llms-txt endpoint:
 * - Anonymous user validation with cookie management
 * - Authenticated user validation with usage tracking
 * - Request body validation (Zod schema)
 * - Rate limiting integration
 * - Database persistence
 * - Usage tracking updates
 * - Response format validation
 * - Error handling (400, 429, 500)
 * - Cookie security (HttpOnly, Secure, SameSite)
 * - Anonymous ID migration window
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import validationRoutes from '../../server/routes/validation';
import { optionalAuth } from '../../server/middleware/auth';
import { rateLimitMiddleware } from '../../server/middleware/rateLimiter';
import { db } from '../../server/db';
import * as validationService from '../../server/services/validation';

// Mock dependencies
vi.mock('../../server/db');
vi.mock('../../server/middleware/auth');
vi.mock('../../server/middleware/rateLimiter');
vi.mock('../../server/services/validation');

describe('POST /api/validate-llms-txt', () => {
  let app: Express;

  beforeEach(() => {
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api', validationRoutes);

    // Reset all mocks
    vi.clearAllMocks();

    // Mock middleware to passthrough by default
    (optionalAuth as any).mockImplementation((req: any, res: any, next: any) => next());
    (rateLimitMiddleware as any).mockImplementation((req: any, res: any, next: any) => next());

    // Mock validation service default response
    (validationService.validateLlmsTxt as any).mockResolvedValue({
      valid: true,
      score: 75,
      issues: [],
      recommendations: [],
      robotsConflicts: [],
      cached: false,
      processingTime: 150,
    });

    // Mock database operations
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 1,
            url: 'https://example.com',
            createdAt: new Date(),
          },
        ]),
      }),
    });

    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      }),
    });
  });

  describe('Anonymous User Flow', () => {
    it('should validate request and generate anonymous ID cookie', async () => {
      const response = await request(app).post('/api/validate-llms-txt').send({
        url: 'https://example.com',
        includeRobotsTxt: true,
        bustCache: false,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.validation).toMatchObject({
        id: expect.any(Number),
        url: 'https://example.com',
        valid: true,
        score: 75,
      });

      // Check cookie was set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('anonymousId=');
      expect(cookies[0]).toContain('HttpOnly');
      expect(cookies[0]).toContain('SameSite=Strict');
      expect(cookies[0]).toContain('Max-Age=604800'); // 7 days
    });

    it('should reuse existing anonymous ID from cookie', async () => {
      const existingId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .post('/api/validate-llms-txt')
        .set('Cookie', `anonymousId=${existingId}`)
        .send({
          url: 'https://example.com',
        });

      expect(response.status).toBe(200);

      // Should use existing ID in database insert
      expect(db.insert).toHaveBeenCalled();
      const insertCall = (db.insert as any).mock.results[0].value.values.mock.calls[0][0];
      expect(insertCall.anonymousId).toBe(existingId);
    });

    it('should not include user info in anonymous response', async () => {
      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeUndefined();
    });
  });

  describe('Authenticated User Flow', () => {
    beforeEach(() => {
      // Mock authenticated user
      (optionalAuth as any).mockImplementation((req: any, res: any, next: any) => {
        req.user = {
          id: 123,
          email: 'user@example.com',
          tier: 'coffee',
          creditsRemaining: 15,
        };
        next();
      });

      // Mock usage tracking upsert
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue({}),
          returning: vi.fn().mockResolvedValue([{ id: 1 }]),
        }),
      });
    });

    it('should validate for authenticated user and track usage', async () => {
      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Should save validation with userId
      expect(db.insert).toHaveBeenCalled();

      // Should return user info
      expect(response.body.user).toMatchObject({
        tier: 'coffee',
        remainingValidations: expect.any(Number),
      });
    });

    it('should not set anonymous ID cookie for authenticated users', async () => {
      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(200);
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeUndefined();
    });

    it('should increment validationsCount in usage tracking', async () => {
      await request(app).post('/api/validate-llms-txt').send({ url: 'https://example.com' });

      // Verify usage tracking was called
      expect(db.insert).toHaveBeenCalledTimes(2); // validation + usage tracking
    });
  });

  describe('Request Body Validation', () => {
    it('should reject invalid URL', async () => {
      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'not-a-valid-url' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.details).toBeDefined();
    });

    it('should reject missing URL', async () => {
      const response = await request(app).post('/api/validate-llms-txt').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
    });

    it('should reject localhost URLs (SSRF protection)', async () => {
      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'http://localhost:3000' });

      expect(response.status).toBe(400);
      expect(response.body.details[0].message).toContain('localhost/private IPs not allowed');
    });

    it('should reject private IP URLs (SSRF protection)', async () => {
      const privateIPs = [
        'http://127.0.0.1',
        'http://192.168.1.1',
        'http://10.0.0.1',
        'http://172.16.0.1',
        'http://169.254.1.1',
      ];

      for (const url of privateIPs) {
        const response = await request(app).post('/api/validate-llms-txt').send({ url });

        expect(response.status).toBe(400);
        expect(response.body.details[0].message).toContain('localhost/private IPs not allowed');
      }
    });

    it('should accept optional parameters', async () => {
      const response = await request(app).post('/api/validate-llms-txt').send({
        url: 'https://example.com',
        includeRobotsTxt: false,
        bustCache: true,
      });

      expect(response.status).toBe(200);

      // Verify service called with correct options
      expect(validationService.validateLlmsTxt).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          includeRobotsTxt: false,
          bustCache: true,
        })
      );
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should return 429 when rate limit exceeded', async () => {
      // Mock rate limiter to return 429
      (rateLimitMiddleware as any).mockImplementation((req: any, res: any) => {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: "You've reached your daily limit",
        });
      });

      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Rate limit exceeded');
    });

    it('should pass through when rate limit not exceeded', async () => {
      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(200);
      expect(rateLimitMiddleware).toHaveBeenCalled();
    });
  });

  describe('Database Persistence', () => {
    it('should save validation result to database', async () => {
      await request(app).post('/api/validate-llms-txt').send({ url: 'https://example.com' });

      expect(db.insert).toHaveBeenCalled();
      const insertCall = (db.insert as any).mock.results[0].value.values.mock.calls[0][0];

      expect(insertCall).toMatchObject({
        url: 'https://example.com',
        fileUrl: 'https://example.com/llms.txt',
        valid: true,
        score: 75,
        tier: 'anonymous',
        cached: false,
        processingTime: 150,
      });
    });

    it('should create URL hash for deduplication', async () => {
      await request(app).post('/api/validate-llms-txt').send({ url: 'https://example.com' });

      const insertCall = (db.insert as any).mock.results[0].value.values.mock.calls[0][0];
      expect(insertCall.urlHash).toBeDefined();
      expect(insertCall.urlHash).toHaveLength(64); // SHA-256 hex string
    });

    it('should set correct expiry dates by tier', async () => {
      // The beforeEach mock builds ONE `values` spy and returns it from every
      // db.insert() call, so `mock.results[0].value.values.mock.calls[0][0]` always
      // read the FIRST iteration's arguments: every tier after the first compared
      // stale data against fresh expectations. Each iteration now installs its own
      // `values` spy and reads that, so the assertion sees the tier under test.
      // Day counts mirror getExpiryDate() in server/routes/validation.ts, which
      // still accepts the legacy 'coffee' id alongside the current 'solo'.
      const tiers = [
        { tier: 'starter', expectedDays: 7 },
        { tier: 'solo', expectedDays: 30 },
        { tier: 'coffee', expectedDays: 30 },
        { tier: 'growth', expectedDays: 90 },
      ];

      for (const { tier, expectedDays } of tiers) {
        const values = vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue({}),
          returning: vi.fn().mockResolvedValue([{ id: 1 }]),
        });
        (db.insert as any).mockReturnValue({ values });

        (optionalAuth as any).mockImplementation((req: any, res: any, next: any) => {
          req.user = { id: 1, tier, email: 'test@example.com', creditsRemaining: 0 };
          next();
        });

        await request(app).post('/api/validate-llms-txt').send({ url: 'https://example.com' });

        const insertCall = values.mock.calls[0][0];
        const expiresAt = new Date(insertCall.expiresAt);
        const expectedExpiry = new Date(Date.now() + expectedDays * 24 * 60 * 60 * 1000);

        // Allow 1 minute tolerance
        expect(
          Math.abs(expiresAt.getTime() - expectedExpiry.getTime()),
          `expiry for tier "${tier}" should be ${expectedDays} days out`
        ).toBeLessThan(60000);
      }
    });

    it('should set null expiry for scale tier (unlimited)', async () => {
      (optionalAuth as any).mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, tier: 'scale', email: 'test@example.com', creditsRemaining: 0 };
        next();
      });

      await request(app).post('/api/validate-llms-txt').send({ url: 'https://example.com' });

      const insertCall = (db.insert as any).mock.results[0].value.values.mock.calls[0][0];
      expect(insertCall.expiresAt).toBeNull();
    });
  });

  describe('Response Format', () => {
    it('should return complete validation response', async () => {
      (validationService.validateLlmsTxt as any).mockResolvedValue({
        valid: false,
        score: 45,
        issues: [{ severity: 'error', message: 'Missing required sections' }],
        recommendations: [{ title: 'Add Owner section', priority: 'high' }],
        robotsConflicts: [{ rule: 'Disallow: /llms.txt', conflict: 'File blocked' }],
        cached: false,
        processingTime: 250,
      });

      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'https://example.com' });

      expect(response.body.validation).toMatchObject({
        id: expect.any(Number),
        url: 'https://example.com',
        valid: false,
        score: 45,
        issues: [{ severity: 'error', message: 'Missing required sections' }],
        recommendations: [{ title: 'Add Owner section', priority: 'high' }],
        robotsConflicts: [{ rule: 'Disallow: /llms.txt', conflict: 'File blocked' }],
        processingTime: 250,
        createdAt: expect.any(String),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation service errors gracefully', async () => {
      (validationService.validateLlmsTxt as any).mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      // Sprint 16: Validation API now "fails open" on persistence errors —
      // the validation result is still returned to the user even if the
      // database insert fails. The error is logged but doesn't break the
      // user-facing response. Updated assertion to match the new contract.
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        }),
      });

      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'https://example.com' });

      // Should return validation result successfully even though persistence failed
      expect(response.status).toBe(200);
      // And should NOT leak database error details in the response
      expect(JSON.stringify(response.body)).not.toContain('Database connection failed');
    });

    it('should not leak internal error details', async () => {
      (validationService.validateLlmsTxt as any).mockRejectedValue(
        new Error('SQL injection detected at line 42')
      );

      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'https://example.com' });

      expect(response.body.message).not.toContain('SQL');
      expect(response.body.message).not.toContain('line 42');
    });
  });

  describe('Cookie Security', () => {
    it('should set HttpOnly cookie in development', async () => {
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'https://example.com' });

      const cookies = response.headers['set-cookie'];
      expect(cookies[0]).toContain('HttpOnly');
    });

    it('should set Secure cookie in production', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'https://example.com' });

      const cookies = response.headers['set-cookie'];
      expect(cookies[0]).toContain('Secure');

      process.env.NODE_ENV = 'test'; // Reset
    });

    it('should set SameSite=strict', async () => {
      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'https://example.com' });

      const cookies = response.headers['set-cookie'];
      expect(cookies[0]).toContain('SameSite=Strict');
    });

    it('should set 7-day expiry for anonymous migration window', async () => {
      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'https://example.com' });

      const cookies = response.headers['set-cookie'];
      expect(cookies[0]).toContain('Max-Age=604800'); // 7 days in seconds
    });
  });

  describe('Performance', () => {
    it('should complete validation in reasonable time', async () => {
      const startTime = Date.now();

      await request(app).post('/api/validate-llms-txt').send({ url: 'https://example.com' });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // 5 seconds max for mock
    });

    it('should return processing time in response', async () => {
      (validationService.validateLlmsTxt as any).mockResolvedValue({
        valid: true,
        score: 75,
        issues: [],
        recommendations: [],
        cached: false,
        processingTime: 1234,
      });

      const response = await request(app)
        .post('/api/validate-llms-txt')
        .send({ url: 'https://example.com' });

      expect(response.body.validation.processingTime).toBe(1234);
    });
  });
});
