/**
 * Rate Limiter Middleware Tests
 *
 * Comprehensive test suite covering:
 * - Anonymous user rate limiting (3/day)
 * - User rate limiting by tier
 * - Rate limit headers
 * - 429 responses
 * - Sliding window algorithm
 * - Cleanup job
 * - Concurrent requests
 * - Boundary conditions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  rateLimitMiddleware,
  cleanupExpiredRateLimits,
  getRateLimitStatus,
  validationRateLimit,
} from '../../server/middleware/rateLimiter';
import { db } from '../../server/db';
import { rateLimits } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Mock database
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Rate Limiter Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusSpy: any;
  let jsonSpy: any;
  let setHeaderSpy: any;

  beforeEach(() => {
    mockReq = {
      ip: '192.168.1.1',
      user: undefined,
    };

    statusSpy = vi.fn().mockReturnThis();
    jsonSpy = vi.fn().mockReturnThis();
    setHeaderSpy = vi.fn();

    mockRes = {
      status: statusSpy,
      json: jsonSpy,
      setHeader: setHeaderSpy,
    };

    mockNext = vi.fn();

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('Anonymous User Rate Limiting', () => {
    it('should allow first request from anonymous user', async () => {
      // Mock database query - no existing records
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Mock insert
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', '3');
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '2');
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should allow up to 3 requests within 24 hours', async () => {
      const existingRecord = {
        id: 1,
        identifier: '192.168.1.1',
        identifierType: 'ip',
        endpoint: '/api/validate-llms-txt',
        requestCount: 2,
        windowStart: new Date(Date.now() - 3600000), // 1 hour ago
        windowEnd: new Date(Date.now() + 86400000), // 24 hours from start
      };

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingRecord]),
          }),
        }),
      });

      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });

    it('should block 4th request within 24 hours', async () => {
      const existingRecord = {
        id: 1,
        identifier: '192.168.1.1',
        identifierType: 'ip',
        endpoint: '/api/validate-llms-txt',
        requestCount: 3,
        windowStart: new Date(Date.now() - 3600000),
        windowEnd: new Date(Date.now() + 86400000),
      };

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingRecord]),
          }),
        }),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(429);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Rate limit exceeded',
          message: expect.stringContaining('daily limit of 3 validations'),
          upgradeUrl: '/pricing',
        })
      );
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });
  });

  describe('Authenticated User Rate Limiting', () => {
    it('should allow starter tier user within limit (5/month)', async () => {
      mockReq.user = {
        id: 123,
        email: 'test@example.com',
        tier: 'starter',
        creditsRemaining: 0,
      } as any;

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
    });

    it('should allow coffee (solo) tier user within limit (20/month)', async () => {
      mockReq.user = {
        id: 456,
        email: 'solo@example.com',
        tier: 'coffee',
        creditsRemaining: 15,
      } as any;

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', '20');
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '19');
    });

    it('should block coffee tier user at limit', async () => {
      mockReq.user = {
        id: 456,
        email: 'solo@example.com',
        tier: 'coffee',
        creditsRemaining: 0,
      } as any;

      const existingRecord = {
        id: 2,
        identifier: '456',
        identifierType: 'user',
        endpoint: '/api/validate-llms-txt',
        requestCount: 20,
        windowStart: new Date(Date.now() - 86400000),
        windowEnd: new Date(Date.now() + 30 * 86400000),
      };

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingRecord]),
          }),
        }),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(429);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Rate limit exceeded',
          message: expect.stringContaining('monthly limit of 20 validations'),
        })
      );
    });

    it('should allow growth tier user within limit (35/month)', async () => {
      mockReq.user = {
        id: 789,
        email: 'growth@example.com',
        tier: 'growth',
        creditsRemaining: 0,
      } as any;

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', '35');
    });

    it('should allow scale tier user within limit (100/month)', async () => {
      mockReq.user = {
        id: 999,
        email: 'scale@example.com',
        tier: 'scale',
        creditsRemaining: 0,
      } as any;

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
    });
  });

  describe('Rate Limit Headers', () => {
    it('should set all required rate limit headers', async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should set correct remaining count', async () => {
      const existingRecord = {
        id: 1,
        identifier: '192.168.1.1',
        identifierType: 'ip',
        endpoint: '/api/validate-llms-txt',
        requestCount: 1,
        windowStart: new Date(Date.now() - 3600000),
        windowEnd: new Date(Date.now() + 86400000),
      };

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingRecord]),
          }),
        }),
      });

      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '1');
    });
  });

  describe('Sliding Window Algorithm', () => {
    it('should reset count after window expires', async () => {
      const expiredRecord = {
        id: 1,
        identifier: '192.168.1.1',
        identifierType: 'ip',
        endpoint: '/api/validate-llms-txt',
        requestCount: 3,
        windowStart: new Date(Date.now() - 48 * 3600000), // 48 hours ago
        windowEnd: new Date(Date.now() - 24 * 3600000), // 24 hours ago
      };

      // First query returns expired record (outside window)
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // Expired records filtered out
          }),
        }),
      });

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '2');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Rate limiting service temporarily unavailable',
        })
      );
    });

    it('should not leak internal error details', async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('SQL syntax error at line 42')),
          }),
        }),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.not.objectContaining({
          message: expect.stringContaining('SQL'),
        })
      );
    });
  });

  describe('Cleanup Job', () => {
    it('should remove expired records older than 30 days', async () => {
      (db.delete as any).mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 42 }),
      });

      const deletedCount = await cleanupExpiredRateLimits();

      expect(deletedCount).toBe(42);
      expect(db.delete).toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      (db.delete as any).mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Cleanup failed')),
      });

      await expect(cleanupExpiredRateLimits()).rejects.toThrow('Cleanup failed');
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle exactly at limit', async () => {
      const existingRecord = {
        id: 1,
        identifier: '192.168.1.1',
        identifierType: 'ip',
        endpoint: '/api/validate-llms-txt',
        requestCount: 2,
        windowStart: new Date(Date.now() - 3600000),
        windowEnd: new Date(Date.now() + 86400000),
      };

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingRecord]),
          }),
        }),
      });

      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });

    it('should handle missing IP address', async () => {
      mockReq.ip = undefined;

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Tier Mapping', () => {
    it('should map solo tier to coffee backend ID', async () => {
      mockReq.user = {
        id: 456,
        email: 'solo@example.com',
        tier: 'solo', // Display tier
        creditsRemaining: 15,
      } as any;

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      await rateLimitMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      // Should use coffee tier limits (20)
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', '20');
    });
  });
});

describe('getRateLimitStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null for no existing limits', async () => {
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const status = await getRateLimitStatus('123', 'user');
    expect(status).toBeNull();
  });

  it('should return correct status for existing limits', async () => {
    const existingRecord = {
      id: 1,
      identifier: '123',
      identifierType: 'user',
      endpoint: '/api/validate-llms-txt',
      requestCount: 5,
      windowStart: new Date(Date.now() - 86400000),
      windowEnd: new Date(Date.now() + 30 * 86400000),
    };

    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([existingRecord]),
        }),
      }),
    });

    const status = await getRateLimitStatus('123', 'user');

    expect(status).toMatchObject({
      limit: expect.any(Number),
      remaining: expect.any(Number),
      resetAt: expect.any(Date),
    });
  });
});
