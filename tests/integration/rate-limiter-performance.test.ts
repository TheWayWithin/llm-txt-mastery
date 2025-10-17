/**
 * Rate Limiter Performance Tests
 *
 * Validates that the middleware meets the < 50ms overhead requirement.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { rateLimitMiddleware } from '../../server/middleware/rateLimiter';
import { db } from '../../server/db';
import { rateLimits } from '@shared/schema';

describe('Rate Limiter Performance', () => {
  // Clean up test data
  afterAll(async () => {
    try {
      // Delete test rate limit records
      await db.delete(rateLimits);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  it('should complete within 50ms for first request', async () => {
    const mockReq = {
      ip: '192.168.1.100',
      user: undefined,
    } as Request;

    let nextCalled = false;
    const mockRes = {
      setHeader: () => {},
      status: () => mockRes,
      json: () => mockRes,
    } as any as Response;

    const mockNext = (() => {
      nextCalled = true;
    }) as NextFunction;

    const startTime = performance.now();

    await rateLimitMiddleware(mockReq, mockRes, mockNext);

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Rate limiter execution time: ${duration.toFixed(2)}ms`);

    expect(nextCalled).toBe(true);
    expect(duration).toBeLessThan(50);
  }, 10000);

  it('should complete within 50ms for subsequent requests', async () => {
    const mockReq = {
      ip: '192.168.1.101',
      user: undefined,
    } as Request;

    const mockRes = {
      setHeader: () => {},
      status: () => mockRes,
      json: () => mockRes,
    } as any as Response;

    const mockNext = (() => {}) as NextFunction;

    // First request to establish record
    await rateLimitMiddleware(mockReq, mockRes, mockNext);

    // Measure second request (update path)
    const startTime = performance.now();
    await rateLimitMiddleware(mockReq, mockRes, mockNext);
    const endTime = performance.now();

    const duration = endTime - startTime;

    console.log(`Rate limiter update execution time: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThan(50);
  }, 10000);

  it('should handle concurrent requests efficiently', async () => {
    const mockRes = {
      setHeader: () => {},
      status: () => mockRes,
      json: () => mockRes,
    } as any as Response;

    const mockNext = (() => {}) as NextFunction;

    // Create 10 concurrent requests
    const requests = Array.from({ length: 10 }, (_, i) => ({
      ip: `192.168.1.${200 + i}`,
      user: undefined,
    } as Request));

    const startTime = performance.now();

    await Promise.all(
      requests.map((req) => rateLimitMiddleware(req, mockRes, mockNext))
    );

    const endTime = performance.now();
    const duration = endTime - startTime;
    const avgDuration = duration / 10;

    console.log(`Average time per concurrent request: ${avgDuration.toFixed(2)}ms`);

    // Each request should still be fast on average
    expect(avgDuration).toBeLessThan(100);
  }, 15000);
});
